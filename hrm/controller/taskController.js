// controller/taskController.js
const mongoose = require("mongoose");
const Task = require("../models/TaskModel");

const isPrivileged = (role) =>
  ["admin", "superAdmin", "moderator"].includes(role);

const POPULATE = [
  { path: "assignedTo", select: "firstName lastName email employeeId department picture role" },
  { path: "assignedBy", select: "firstName lastName email role" },
];

// ==================== CREATE / ASSIGN TASK (admin/moderator) ====================
exports.createTask = async (req, res) => {
  try {
    const { title, description, assignedTo, priority, startDate, dueDate } =
      req.body;

    // Employees can only raise tasks for themselves — ignore any assignee they
    // send and force it to their own id. Privileged users may assign to anyone.
    const assignee = isPrivileged(req.user.role)
      ? assignedTo
      : req.user._id;

    if (!title || !assignee) {
      return res.status(400).json({
        success: false,
        message: "Title and an assignee are required",
      });
    }

    if (!mongoose.Types.ObjectId.isValid(assignee)) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid assignee id" });
    }

    const task = await Task.create({
      title: title.trim(),
      description: (description || "").trim(),
      assignedTo: assignee,
      assignedBy: req.user._id,
      priority: priority || "Medium",
      startDate: startDate || null,
      dueDate: dueDate || null,
    });

    const populated = await Task.findById(task._id).populate(POPULATE);

    res.status(201).json({
      success: true,
      message: "Task assigned successfully",
      data: populated,
    });
  } catch (error) {
    console.error("Create task error:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

// ==================== GET ALL TASKS (admin/moderator) ====================
exports.getAllTasks = async (req, res) => {
  try {
    const { status, priority, assignedTo, search } = req.query;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 100;
    const skip = (page - 1) * limit;

    const filter = { isDeleted: false };
    if (status && status !== "All") filter.status = status;
    if (priority && priority !== "All") filter.priority = priority;
    if (assignedTo && mongoose.Types.ObjectId.isValid(assignedTo))
      filter.assignedTo = assignedTo;
    if (search) {
      filter.$or = [
        { title: { $regex: search, $options: "i" } },
        { description: { $regex: search, $options: "i" } },
      ];
    }

    const [tasks, total] = await Promise.all([
      Task.find(filter)
        .populate(POPULATE)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      Task.countDocuments(filter),
    ]);

    res.status(200).json({
      success: true,
      data: tasks,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    });
  } catch (error) {
    console.error("Get all tasks error:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

// ==================== GET MY TASKS (any logged-in user) ====================
exports.getMyTasks = async (req, res) => {
  try {
    const userId = req.user._id;
    const { status } = req.query;

    const filter = { assignedTo: userId, isDeleted: false };
    if (status && status !== "All") filter.status = status;

    const tasks = await Task.find(filter)
      .populate(POPULATE)
      .sort({ createdAt: -1 });

    res.status(200).json({ success: true, data: tasks });
  } catch (error) {
    console.error("Get my tasks error:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

// ==================== GET SINGLE TASK ====================
exports.getTaskById = async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid task id" });
    }

    const task = await Task.findOne({
      _id: req.params.id,
      isDeleted: false,
    }).populate(POPULATE);

    if (!task) {
      return res
        .status(404)
        .json({ success: false, message: "Task not found" });
    }

    // Employees can only view their own task
    if (
      !isPrivileged(req.user.role) &&
      (task.assignedTo?._id || task.assignedTo).toString() !==
        req.user._id.toString()
    ) {
      return res.status(403).json({ success: false, message: "Access denied" });
    }

    res.status(200).json({ success: true, data: task });
  } catch (error) {
    console.error("Get task error:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

// ==================== UPDATE TASK (admin/moderator full edit) ====================
exports.updateTask = async (req, res) => {
  try {
    const { title, description, assignedTo, priority, startDate, dueDate, status } =
      req.body;

    const task = await Task.findOne({
      _id: req.params.id,
      isDeleted: false,
    });
    if (!task) {
      return res
        .status(404)
        .json({ success: false, message: "Task not found" });
    }

    if (title !== undefined) task.title = title.trim();
    if (description !== undefined) task.description = description.trim();
    if (assignedTo && mongoose.Types.ObjectId.isValid(assignedTo))
      task.assignedTo = assignedTo;
    if (priority !== undefined) task.priority = priority;
    if (startDate !== undefined) task.startDate = startDate || null;
    if (dueDate !== undefined) task.dueDate = dueDate || null;
    if (status !== undefined) {
      task.status = status;
      task.completedAt = status === "Completed" ? new Date() : null;
    }

    await task.save();
    const populated = await Task.findById(task._id).populate(POPULATE);

    res.status(200).json({
      success: true,
      message: "Task updated",
      data: populated,
    });
  } catch (error) {
    console.error("Update task error:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

// ==================== UPDATE STATUS (assignee or admin) ====================
exports.updateTaskStatus = async (req, res) => {
  try {
    const { status } = req.body;
    const VALID = ["Pending", "Completed", "Cancelled"];
    if (!VALID.includes(status)) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid status value" });
    }

    const task = await Task.findOne({
      _id: req.params.id,
      isDeleted: false,
    });
    if (!task) {
      return res
        .status(404)
        .json({ success: false, message: "Task not found" });
    }

    // Only the assignee or a privileged user can change status
    const isOwner =
      task.assignedTo.toString() === req.user._id.toString();
    if (!isPrivileged(req.user.role) && !isOwner) {
      return res.status(403).json({ success: false, message: "Access denied" });
    }

    task.status = status;
    task.completedAt = status === "Completed" ? new Date() : null;
    await task.save();

    const populated = await Task.findById(task._id).populate(POPULATE);
    res.status(200).json({
      success: true,
      message: `Task marked as ${status}`,
      data: populated,
    });
  } catch (error) {
    console.error("Update task status error:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

// ==================== ADD COMMENT (assignee or admin) ====================
exports.addComment = async (req, res) => {
  try {
    const { text } = req.body;
    if (!text || !text.trim()) {
      return res
        .status(400)
        .json({ success: false, message: "Comment text is required" });
    }

    const task = await Task.findOne({
      _id: req.params.id,
      isDeleted: false,
    });
    if (!task) {
      return res
        .status(404)
        .json({ success: false, message: "Task not found" });
    }

    const isOwner =
      task.assignedTo.toString() === req.user._id.toString();
    if (!isPrivileged(req.user.role) && !isOwner) {
      return res.status(403).json({ success: false, message: "Access denied" });
    }

    task.comments.push({
      text: text.trim(),
      by: req.user._id,
      byName: `${req.user.firstName || ""} ${req.user.lastName || ""}`.trim(),
      at: new Date(),
    });
    await task.save();

    const populated = await Task.findById(task._id).populate(POPULATE);
    res.status(200).json({
      success: true,
      message: "Comment added",
      data: populated,
    });
  } catch (error) {
    console.error("Add comment error:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

// ==================== DELETE TASK (admin/moderator, soft delete) ====================
exports.deleteTask = async (req, res) => {
  try {
    const task = await Task.findOne({
      _id: req.params.id,
      isDeleted: false,
    });
    if (!task) {
      return res
        .status(404)
        .json({ success: false, message: "Task not found" });
    }

    // Privileged users can delete any task; an employee can delete only a task
    // they created themselves (not one an admin assigned to them).
    const isCreator =
      task.assignedBy &&
      task.assignedBy.toString() === req.user._id.toString();
    if (!isPrivileged(req.user.role) && !isCreator) {
      return res.status(403).json({
        success: false,
        message: "You can only delete tasks you created",
      });
    }

    task.isDeleted = true;
    task.deletedAt = new Date();
    task.deletedBy = req.user._id;
    await task.save();

    res.status(200).json({ success: true, message: "Task deleted" });
  } catch (error) {
    console.error("Delete task error:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

// ==================== BULK DELETE TASKS (admin only, permanent) ====================
exports.bulkDeleteTasks = async (req, res) => {
  try {
    if (!["admin", "superAdmin"].includes(req.user.role)) {
      return res.status(403).json({ success: false, message: "Access denied" });
    }

    const { taskIds } = req.body;
    if (!Array.isArray(taskIds) || taskIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: "taskIds array is required",
      });
    }

    const validIds = taskIds.filter((id) => mongoose.Types.ObjectId.isValid(id));
    if (validIds.length === 0) {
      return res.status(400).json({ success: false, message: "No valid task ids provided" });
    }

    const result = await Task.deleteMany({ _id: { $in: validIds } });

    res.status(200).json({
      success: true,
      message: `${result.deletedCount} task(s) deleted`,
      deletedCount: result.deletedCount,
    });
  } catch (error) {
    console.error("Bulk delete tasks error:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

// ==================== TASK STATS (admin/moderator) ====================
exports.getTaskStats = async (req, res) => {
  try {
    const now = new Date();
    const [byStatus, total, overdue] = await Promise.all([
      Task.aggregate([
        { $match: { isDeleted: false } },
        { $group: { _id: "$status", count: { $sum: 1 } } },
      ]),
      Task.countDocuments({ isDeleted: false }),
      Task.countDocuments({
        isDeleted: false,
        status: "Pending",
        dueDate: { $ne: null, $lt: now },
      }),
    ]);

    const counts = { Pending: 0, Completed: 0, Cancelled: 0 };
    byStatus.forEach((s) => {
      counts[s._id] = s.count;
    });

    res.status(200).json({
      success: true,
      data: {
        total,
        pending: counts.Pending,
        completed: counts.Completed,
        cancelled: counts.Cancelled,
        overdue,
      },
    });
  } catch (error) {
    console.error("Task stats error:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};
