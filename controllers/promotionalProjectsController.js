const PromotionalProject = require("../models/PromotionalProject");

const normalizeArray = (value) => {
  if (Array.isArray(value)) return value.filter(Boolean);
  if (typeof value === "string") {
    return value
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean);
  }
  return [];
};

const getPromotionalProjects = async (req, res) => {
  try {
    const { category } = req.query;
    const filter = { isActive: true };

    if (category && category !== "all") {
      filter.category = { $in: [category] };
    }

    const projects = await PromotionalProject.find(filter).sort({
      order: 1,
      createdAt: -1,
    });

    return res.status(200).json({
      success: true,
      count: projects.length,
      projects,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to fetch promotional projects",
      error: error.message,
    });
  }
};

const getAdminPromotionalProjects = async (req, res) => {
  try {
    const projects = await PromotionalProject.find().sort({
      order: 1,
      createdAt: -1,
    });

    return res.status(200).json({
      success: true,
      count: projects.length,
      projects,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to fetch promotional projects",
      error: error.message,
    });
  }
};

const createPromotionalProject = async (req, res) => {
  try {
    const {
      title,
      subtitle,
      description,
      image,
      category,
      technologies,
      client,
      date,
      isActive,
    } = req.body;

    if (!title || !description || !image) {
      return res.status(400).json({
        success: false,
        message: "Please provide all required fields",
      });
    }

    const newProject = new PromotionalProject({
      title,
      subtitle: subtitle || "",
      description,
      image,
      category: normalizeArray(category),
      technologies: normalizeArray(technologies),
      client: client || "",
      date: date || "",
      isActive: isActive !== undefined ? isActive : true,
    });

    await newProject.save();

    return res.status(201).json({
      success: true,
      message: "Promotional project created successfully",
      project: newProject,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to create promotional project",
      error: error.message,
    });
  }
};

const reorderPromotionalProjects = async (req, res) => {
  try {
    const { projects } = req.body;

    if (!Array.isArray(projects) || projects.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Please provide an array of projects with order values",
      });
    }

    const updatePromises = projects.map((project, index) =>
      PromotionalProject.findByIdAndUpdate(
        project._id || project.id,
        { order: index },
        { new: true },
      ),
    );

    await Promise.all(updatePromises);

    return res.status(200).json({
      success: true,
      message: "Projects reordered successfully",
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to reorder projects",
      error: error.message,
    });
  }
};

const updatePromotionalProject = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      title,
      subtitle,
      description,
      image,
      category,
      technologies,
      client,
      date,
      isActive,
    } = req.body;

    const project = await PromotionalProject.findById(id);
    if (!project) {
      return res.status(404).json({
        success: false,
        message: "Promotional project not found",
      });
    }

    if (title !== undefined) project.title = title;
    if (subtitle !== undefined) project.subtitle = subtitle;
    if (description !== undefined) project.description = description;
    if (image !== undefined) project.image = image;
    if (category !== undefined) project.category = normalizeArray(category);
    if (technologies !== undefined) {
      project.technologies = normalizeArray(technologies);
    }
    if (client !== undefined) project.client = client;
    if (date !== undefined) project.date = date;
    if (isActive !== undefined) project.isActive = isActive;

    await project.save();

    return res.status(200).json({
      success: true,
      message: "Promotional project updated successfully",
      project,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to update promotional project",
      error: error.message,
    });
  }
};

const deletePromotionalProject = async (req, res) => {
  try {
    const { id } = req.params;
    const project = await PromotionalProject.findById(id);

    if (!project) {
      return res.status(404).json({
        success: false,
        message: "Promotional project not found",
      });
    }

    await PromotionalProject.findByIdAndDelete(id);

    return res.status(200).json({
      success: true,
      message: "Promotional project deleted successfully",
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to delete promotional project",
      error: error.message,
    });
  }
};

module.exports = {
  getPromotionalProjects,
  getAdminPromotionalProjects,
  createPromotionalProject,
  reorderPromotionalProjects,
  updatePromotionalProject,
  deletePromotionalProject,
};
