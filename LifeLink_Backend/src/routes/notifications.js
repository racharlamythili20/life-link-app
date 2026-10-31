// src/routes/notifications.js
const router = require('express').Router();
const { protect } = require('../middleware/auth');
const Notification = require('../models/Notification');

router.use(protect);

router.get('/', async (req, res, next) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const notifications = await Notification.find({ recipient: req.user.id })
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit));
    const unreadCount = await Notification.countDocuments({ recipient: req.user.id, isRead: false });
    res.json({ notifications, unreadCount });
  } catch (err) { next(err); }
});

router.put('/:id/read', async (req, res, next) => {
  try {
    await Notification.findByIdAndUpdate(req.params.id, { isRead: true, readAt: new Date() });
    res.json({ message: 'Marked as read' });
  } catch (err) { next(err); }
});

router.put('/read-all', async (req, res, next) => {
  try {
    await Notification.updateMany(
      { recipient: req.user.id, isRead: false },
      { isRead: true, readAt: new Date() }
    );
    res.json({ message: 'All notifications marked as read' });
  } catch (err) { next(err); }
});

// Register FCM token
router.post('/fcm-token', async (req, res, next) => {
  try {
    const { token } = req.body;
    const User = require('../models/User');
    await User.findByIdAndUpdate(req.user.id, {
      $addToSet: { fcmTokens: token },
    });
    res.json({ message: 'FCM token registered' });
  } catch (err) { next(err); }
});

module.exports = router;
