const PromotionalProjectCategory = require("../models/PromotionalProjectCategory");

const DEFAULT_CATEGORIES = [
  { name: "ecommerce", displayName: "E-Commerce" },
  { name: "affiliate", displayName: "Affiliate" },
  { name: "shopify", displayName: "Shopify" },
  { name: "wordpress", displayName: "WordPress" },
  { name: "web", displayName: "Web" },
  { name: "mobile-app", displayName: "Mobile App" },
  { name: "erp", displayName: "ERP" },
];

const normalizeCategory = (value) =>
  String(value || "")
    .trim()
    .toLowerCase();

const ensureDefaultCategories = async () => {
  const existing = await PromotionalProjectCategory.find({ isActive: true });

  if (existing.length === 0) {
    await PromotionalProjectCategory.insertMany(DEFAULT_CATEGORIES);
    return PromotionalProjectCategory.find({ isActive: true }).sort({
      displayName: 1,
    });
  }

  return PromotionalProjectCategory.find({ isActive: true }).sort({
    displayName: 1,
  });
};

const getPromotionalProjectCategories = async (req, res) => {
  try {
    const categories = await ensureDefaultCategories();

    return res.status(200).json({
      success: true,
      count: categories.length,
      categories,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to fetch promotional project categories",
      error: error.message,
    });
  }
};

const createPromotionalProjectCategory = async (req, res) => {
  try {
    const { name, displayName } = req.body;
    const normalizedName = normalizeCategory(name);
    const resolvedDisplayName = String(displayName || name || "").trim();

    if (!normalizedName || !resolvedDisplayName) {
      return res.status(400).json({
        success: false,
        message: "Please provide both name and displayName",
      });
    }

    const existing = await PromotionalProjectCategory.findOne({
      name: normalizedName,
    });

    if (existing) {
      if (!existing.isActive) {
        existing.isActive = true;
        existing.displayName = resolvedDisplayName;
        await existing.save();
      }

      return res.status(200).json({
        success: true,
        message: "Promotional project category already exists",
        category: existing,
      });
    }

    const category = new PromotionalProjectCategory({
      name: normalizedName,
      displayName: resolvedDisplayName,
    });

    await category.save();

    return res.status(201).json({
      success: true,
      message: "Promotional project category created successfully",
      category,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to create promotional project category",
      error: error.message,
    });
  }
};

const deletePromotionalProjectCategory = async (req, res) => {
  try {
    const { name } = req.params;
    const normalizedName = normalizeCategory(name);

    if (!normalizedName) {
      return res.status(400).json({
        success: false,
        message: "Please provide a category name",
      });
    }

    const deletedCategory = await PromotionalProjectCategory.findOneAndDelete({
      name: normalizedName,
    });

    if (!deletedCategory) {
      return res.status(404).json({
        success: false,
        message: "Promotional project category not found",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Promotional project category deleted successfully",
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to delete promotional project category",
      error: error.message,
    });
  }
};

module.exports = {
  getPromotionalProjectCategories,
  createPromotionalProjectCategory,
  deletePromotionalProjectCategory,
  ensureDefaultCategories,
};
