const mongoose = require("mongoose");

const promotionalProjectSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, "Please provide a project title"],
      trim: true,
    },
    subtitle: {
      type: String,
      default: "",
    },
    description: {
      type: String,
      required: [true, "Please provide a project description"],
    },
    image: {
      type: String,
    },
    category: {
      type: [String],
      default: [],
    },
    technologies: {
      type: [String],
      default: [],
    },
    client: {
      type: String,
      default: "",
    },
    date: {
      type: String,
      default: "",
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    order: {
      type: Number,
      default: 0,
    },
  },
  { timestamps: true },
);

module.exports = mongoose.model("PromotionalProject", promotionalProjectSchema);
