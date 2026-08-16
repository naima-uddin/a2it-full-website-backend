// models/TaskModel.js
const mongoose = require("mongoose");

const taskSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    description: { type: String, default: "", trim: true },

    // Who the task is for, and who assigned it
    assignedTo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    assignedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },

    status: {
      type: String,
      enum: ["Pending", "Completed", "Cancelled"],
      default: "Pending",
      index: true,
    },
    priority: {
      type: String,
      enum: ["Low", "Medium", "High", "Urgent"],
      default: "Medium",
    },

    // Work window. startDate = "From", dueDate = "To" (deadline). A single-day
    // task can leave startDate empty; a multi-day task spans startDate → dueDate.
    startDate: { type: Date },
    dueDate: { type: Date },
    completedAt: { type: Date },

    // Lightweight activity / comment trail (employee updates, admin notes)
    comments: [
      {
        text: { type: String, trim: true },
        by: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
        byName: String,
        at: { type: Date, default: Date.now },
      },
    ],

    // Soft delete (same convention as Users / Attendance / Payroll)
    isDeleted: { type: Boolean, default: false, index: true },
    deletedAt: { type: Date },
    deletedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true }
);

// Common access pattern: an employee's tasks by status, newest first
taskSchema.index({ assignedTo: 1, status: 1, createdAt: -1 });

module.exports = mongoose.model("Task", taskSchema);
