const mongoose = require("mongoose");

/**
 * Stores editable content for a single service page section, keyed by a
 * stable string (e.g. "amazon-marketing"). `data` is a free-form object
 * whose shape is defined by the matching schema on the frontend, so any
 * page can be made editable without a backend migration.
 */
const servicePageContentSchema = new mongoose.Schema(
  {
    key: {
      type: String,
      required: [true, "Please provide a content key"],
      trim: true,
      lowercase: true,
      unique: true,
      index: true,
    },
    data: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
  },
  { timestamps: true, minimize: false },
);

module.exports = mongoose.model("ServicePageContent", servicePageContentSchema);
