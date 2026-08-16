const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
  type: { type: String, default: 'profile_update' },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  userName: { type: String, required: true },
  userRole: { type: String, required: true },
  userEmail: { type: String, default: '' },
  message: { type: String, required: true },
  status: {
    type: String,
    enum: ['pending', 'approved', 'rejected'],
    default: 'pending'
  },
  // Fields that were updated and their new values
  updatedFields: [{ type: String }],
  updatedData: { type: mongoose.Schema.Types.Mixed, default: {} },
  approvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  approvedAt: { type: Date },
  readBy: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  isDeleted: { type: Boolean, default: false }
}, { timestamps: true });

module.exports = mongoose.model('Notification', notificationSchema);
