const PromotionalPackage = require("../models/PromotionalPackage");

const normalizeArray = (value) => {
  if (Array.isArray(value)) return value.filter(Boolean);
  if (typeof value === "string") {
    return value
      .split("\n")
      .map((item) => item.trim())
      .filter(Boolean);
  }
  return [];
};

const getPromotionalPackages = async (req, res) => {
  try {
    const packages = await PromotionalPackage.find({ isActive: true }).sort({
      createdAt: 1,
    });

    return res.status(200).json({
      success: true,
      count: packages.length,
      packages,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to fetch promotional packages",
      error: error.message,
    });
  }
};

const getAdminPromotionalPackages = async (req, res) => {
  try {
    const packages = await PromotionalPackage.find().sort({ createdAt: 1 });

    return res.status(200).json({
      success: true,
      count: packages.length,
      packages,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to fetch promotional packages",
      error: error.message,
    });
  }
};

const createPromotionalPackage = async (req, res) => {
  try {
    const {
      name,
      oldPrice,
      newPrice,
      badge,
      color,
      badgeColor,
      highlight,
      description,
      features,
      isActive,
    } = req.body;

    if (!name || !newPrice) {
      return res.status(400).json({
        success: false,
        message: "Please provide required package fields",
      });
    }

    const newPackage = new PromotionalPackage({
      name,
      oldPrice: oldPrice || "",
      newPrice,
      badge: badge || "",
      color: color || "green",
      badgeColor: badgeColor || "",
      highlight: highlight || false,
      description: description || "",
      features: normalizeArray(features),
      isActive: isActive !== undefined ? isActive : true,
    });

    await newPackage.save();

    return res.status(201).json({
      success: true,
      message: "Promotional package created successfully",
      package: newPackage,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to create promotional package",
      error: error.message,
    });
  }
};

const updatePromotionalPackage = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      name,
      oldPrice,
      newPrice,
      badge,
      color,
      badgeColor,
      highlight,
      description,
      features,
      isActive,
    } = req.body;

    const packageDoc = await PromotionalPackage.findById(id);
    if (!packageDoc) {
      return res.status(404).json({
        success: false,
        message: "Promotional package not found",
      });
    }

    if (name !== undefined) packageDoc.name = name;
    if (oldPrice !== undefined) packageDoc.oldPrice = oldPrice;
    if (newPrice !== undefined) packageDoc.newPrice = newPrice;
    if (badge !== undefined) packageDoc.badge = badge;
    if (color !== undefined) packageDoc.color = color;
    if (badgeColor !== undefined) packageDoc.badgeColor = badgeColor;
    if (highlight !== undefined) packageDoc.highlight = highlight;
    if (description !== undefined) packageDoc.description = description;
    if (features !== undefined) packageDoc.features = normalizeArray(features);
    if (isActive !== undefined) packageDoc.isActive = isActive;

    await packageDoc.save();

    return res.status(200).json({
      success: true,
      message: "Promotional package updated successfully",
      package: packageDoc,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to update promotional package",
      error: error.message,
    });
  }
};

const deletePromotionalPackage = async (req, res) => {
  try {
    const { id } = req.params;
    const packageDoc = await PromotionalPackage.findById(id);

    if (!packageDoc) {
      return res.status(404).json({
        success: false,
        message: "Promotional package not found",
      });
    }

    await PromotionalPackage.findByIdAndDelete(id);

    return res.status(200).json({
      success: true,
      message: "Promotional package deleted successfully",
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to delete promotional package",
      error: error.message,
    });
  }
};

module.exports = {
  getPromotionalPackages,
  getAdminPromotionalPackages,
  createPromotionalPackage,
  updatePromotionalPackage,
  deletePromotionalPackage,
};
