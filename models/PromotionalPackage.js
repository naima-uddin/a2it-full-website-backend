const mongoose = require("mongoose");

const promotionalPackageSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Please provide a package name"],
      trim: true,
    },
    oldPrice: {
      type: String,
      default: "",
    },
    newPrice: {
      type: String,
      default: "",
    },
    badge: {
      type: String,
      default: "",
    },
    badgeColor: {
      type: String,
      default: "",
    },
    color: {
      type: String,
      default: "green",
    },
    highlight: {
      type: Boolean,
      default: false,
    },
    description: {
      type: String,
      default: "",
    },
    features: {
      type: [String],
      default: [],
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true },
);

module.exports = mongoose.model("PromotionalPackage", promotionalPackageSchema);
