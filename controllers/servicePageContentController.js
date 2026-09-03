const ServicePageContent = require("../models/ServicePageContent");

const normalizeKey = (value) =>
  String(value || "")
    .trim()
    .toLowerCase();

// Public: read the stored content for one section (empty object if none yet).
const getContent = async (req, res) => {
  try {
    const key = normalizeKey(req.params.key);
    const doc = await ServicePageContent.findOne({ key });

    return res.status(200).json({
      success: true,
      key,
      data: doc ? doc.data : {},
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to fetch content",
      error: error.message,
    });
  }
};

// Public: list all stored keys (handy for the dashboard overview).
const listContent = async (req, res) => {
  try {
    const docs = await ServicePageContent.find().select("key updatedAt");
    return res.status(200).json({ success: true, items: docs });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to list content",
      error: error.message,
    });
  }
};

// Admin/Moderator: create or replace the content for one section.
const upsertContent = async (req, res) => {
  try {
    const key = normalizeKey(req.params.key);
    const { data } = req.body;

    if (!key) {
      return res
        .status(400)
        .json({ success: false, message: "Content key is required" });
    }

    const doc = await ServicePageContent.findOneAndUpdate(
      { key },
      { $set: { data: data || {} } },
      { new: true, upsert: true, setDefaultsOnInsert: true },
    );

    return res.status(200).json({
      success: true,
      message: "Content saved successfully",
      key,
      data: doc.data,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to save content",
      error: error.message,
    });
  }
};

module.exports = { getContent, listContent, upsertContent };
