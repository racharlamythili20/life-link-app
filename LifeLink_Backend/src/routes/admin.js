// src/routes/admin.js
const router = require('express').Router();
const { protect, authorize } = require('../middleware/auth');
const User = require('../models/User');
const BloodRequest = require('../models/BloodRequest');

router.use(protect, authorize('admin'));

// Dashboard stats
router.get('/stats', async (req, res, next) => {
  try {
    const [totalUsers, totalDonors, totalHospitals, totalRequests, activeRequests, fulfilledRequests] =
      await Promise.all([
        User.countDocuments({ isActive: true }),
        User.countDocuments({ role: 'donor', isActive: true }),
        User.countDocuments({ role: 'hospital', isActive: true }),
        BloodRequest.countDocuments(),
        BloodRequest.countDocuments({ status: 'active' }),
        BloodRequest.countDocuments({ status: 'fulfilled' }),
      ]);

    const recentActivity = await BloodRequest.find()
      .populate('requestedBy', 'name')
      .sort({ createdAt: -1 })
      .limit(10);

    const userGrowth = await User.aggregate([
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m', date: '$createdAt' } },
          count: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
      { $limit: 12 },
    ]);

    res.json({
      totalUsers, totalDonors, totalHospitals,
      totalRequests, activeRequests, fulfilledRequests,
      recentActivity, userGrowth,
    });
  } catch (err) { next(err); }
});

// Get all users
router.get('/users', async (req, res, next) => {
  try {
    const { role, page = 1, limit = 20, search } = req.query;
    const query = {};
    if (role) query.role = role;
    if (search) query.$or = [
      { name: { $regex: search, $options: 'i' } },
      { email: { $regex: search, $options: 'i' } },
    ];

    const users = await User.find(query)
      .select('-password -refreshToken')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit));

    const total = await User.countDocuments(query);
    res.json({ users, pagination: { total, page: parseInt(page), pages: Math.ceil(total / limit) } });
  } catch (err) { next(err); }
});

// Block/unblock user
router.put('/users/:id/block', async (req, res, next) => {
  try {
    const { reason } = req.body;
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ error: 'User not found' });

    user.isBlocked = !user.isBlocked;
    if (user.isBlocked) user.blockedReason = reason || 'Violated terms of service';
    else user.blockedReason = undefined;
    await user.save({ validateBeforeSave: false });

    res.json({ message: `User ${user.isBlocked ? 'blocked' : 'unblocked'}`, user });
  } catch (err) { next(err); }
});

// Verify hospital
router.put('/hospitals/:id/verify', async (req, res, next) => {
  try {
    const hospital = await User.findByIdAndUpdate(
      req.params.id,
      { 'hospitalInfo.isVerifiedHospital': true, isVerified: true },
      { new: true }
    );
    if (!hospital) return res.status(404).json({ error: 'Hospital not found' });
    res.json({ message: 'Hospital verified', hospital });
  } catch (err) { next(err); }
});

// Get suspicious requests
router.get('/fraud-alerts', async (req, res, next) => {
  try {
    const suspicious = await BloodRequest.find({ fraudScore: { $gt: 50 } })
      .populate('requestedBy', 'name email')
      .sort({ fraudScore: -1 });
    res.json({ suspicious });
  } catch (err) { next(err); }
});

// Delete request
router.delete('/requests/:id', async (req, res, next) => {
  try {
    await BloodRequest.findByIdAndDelete(req.params.id);
    res.json({ message: 'Request deleted' });
  } catch (err) { next(err); }
});

module.exports = router;
