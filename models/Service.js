const mongoose = require("mongoose");

const serviceSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, "Please provide a service title"],
      trim: true,
      maxlength: [100, "Title cannot exceed 100 characters"],
    },
    description: {
      type: String,
      required: [true, "Please provide a service description"],
      maxlength: [1000, "Description cannot exceed 1000 characters"],
    },
    icon: {
      type: String,
      required: [true, "Please provide an icon name (from lucide-react)"],
    },
    features: {
      type: [String],
      required: true,
      validate: {
        validator: function (v) {
          return v.length > 0;
        },
        message: "Please provide at least one feature",
      },
    },
    category: {
      type: String,
      required: true,
    },
    path: {
      type: String,
      required: true,
    },
    color: {
      type: String,
      default: "bg-[#0066ff]",
    },
    image: {
      type: String,
      default: "",
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

module.exports = mongoose.model("Service", serviceSchema);
