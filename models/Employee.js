const mongoose = require('mongoose');

const EmployeeSchema = new mongoose.Schema({
  name: { type: String, required: true },
  number: { type: String },
  position: { type: String },
  image: { type: String },
  description: { type: String },
  achievements: { type: [String], default: [] },
  skills: { type: [String], default: [] },
  role: { type: String, enum: ['developer', 'marketing', 'other'], default: 'other' },
  isActive: { type: Boolean, default: true },
}, { timestamps: true });

module.exports = mongoose.model('Employee', EmployeeSchema);
