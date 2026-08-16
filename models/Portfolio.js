const mongoose = require("mongoose");

const portfolioSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, "Please provide a project title"],
      trim: true,
      maxlength: [150, "Title cannot exceed 150 characters"],
    },
    description: {
      type: String,
      required: [true, "Please provide a project description"],
    },
    category: {
      type: [String],
      required: true,
      validate: {
        validator: function (v) {
          return v.length > 0;
        },
        message: "Please provide at least one category",
      },
    },
    image: {
      type: String,
      required: [true, "Please provide a project image URL"],
    },
    images: {
      type: [String],
      default: [],
    },
    link: {
      type: String,
      default: "",
    },
    client: {
      type: String,
      default: "",
    },
    duration: {
      type: String,
      default: "",
    },
    teamSize: {
      type: String,
      default: "",
    },
    role: {
      type: String,
      default: "",
    },
    challenge: {
      type: String,
      default: "",
    },
    solution: {
      type: String,
      default: "",
    },
    technologies: {
      type: [String],
      default: [],
    },
    features: {
      type: [String],
      default: [],
    },
    result: {
      type: String,
      default: "",
    },
    metrics: {
      type: [
        {
          value: String,
          label: String,
        },
      ],
      default: [],
    },
    order: {
      type: Number,
      default: 0,
    },
    featured: {
      type: Boolean,
      default: false,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    createdAt: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true },
);

module.exports = mongoose.model("Portfolio", portfolioSchema);
