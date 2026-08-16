const Notification = require('../models/NotificationModel');

// GET /notifications — admin sees all
exports.getAll = async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 100;
    const status = req.query.status;
    const query = { isDeleted: false };
    if (status) query.status = status;

    const notifications = await Notification.find(query)
      .sort({ createdAt: -1 })
      .limit(limit);

    const adminId = String(req.user._id);
    const pendingCount = notifications.filter(n => n.status === 'pending').length;
    const unreadCount = notifications.filter(n => !n.readBy.map(String).includes(adminId)).length;

    res.json({ success: true, notifications, pendingCount, unreadCount });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// GET /notifications/count — lightweight pending count for bells
exports.getPendingCount = async (req, res) => {
  try {
    const count = await Notification.countDocuments({ status: 'pending', isDeleted: false });
    res.json({ success: true, count });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// GET /my-notification — employee sees their own latest
exports.getMyStatus = async (req, res) => {
  try {
    const notification = await Notification.findOne({
      userId: req.user._id,
      isDeleted: false
    }).sort({ createdAt: -1 });
    res.json({ success: true, notification });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// PUT /notifications/:id/approve
exports.approve = async (req, res) => {
  try {
    const notif = await Notification.findByIdAndUpdate(
      req.params.id,
      { status: 'approved', approvedBy: req.user._id, approvedAt: new Date() },
      { new: true }
    );
    if (!notif) return res.status(404).json({ success: false, message: 'Notification not found' });
    res.json({ success: true, notification: notif });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// PUT /notifications/:id/reject
exports.reject = async (req, res) => {
  try {
    const notif = await Notification.findByIdAndUpdate(
      req.params.id,
      { status: 'rejected' },
      { new: true }
    );
    if (!notif) return res.status(404).json({ success: false, message: 'Notification not found' });
    res.json({ success: true, notification: notif });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// PUT /notifications/:id/read
exports.markRead = async (req, res) => {
  try {
    await Notification.findByIdAndUpdate(req.params.id, {
      $addToSet: { readBy: req.user._id }
    });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// DELETE /notifications/:id
exports.dismiss = async (req, res) => {
  try {
    await Notification.findByIdAndUpdate(req.params.id, { isDeleted: true });
    res.json({ success: true, message: 'Notification dismissed' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
