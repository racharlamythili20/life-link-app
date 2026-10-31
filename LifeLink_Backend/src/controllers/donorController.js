// src/controllers/donorController.js
const User = require('../models/User');
const BloodRequest = require('../models/BloodRequest');
const { getIO } = require('../socket');

// ─── Get Nearby Donors ────────────────────────────────────
exports.getNearbyDonors = async (req, res, next) => {
  try {
    const {
      lat, lng,
      radius = 10,
      bloodGroup,
      page = 1,
      limit = 20,
    } = req.query;

    if (!lat || !lng) {
      return res.status(400).json({ error: 'Location required (lat, lng)' });
    }

    const query = {
      role: 'donor',
      isAvailable: true,
      isActive: true,
      isBlocked: false,
      location: {
        $nearSphere: {
          $geometry: {
            type: 'Point',
            coordinates: [parseFloat(lng), parseFloat(lat)],
          },
          $maxDistance: parseInt(radius) * 1000,
        },
      },
    };

    if (bloodGroup) query.bloodGroup = bloodGroup;

    const donors = await User.find(query)
      .select('name bloodGroup profileImage location isAvailable totalDonations badges rewardPoints')
      .skip((page - 1) * limit)
      .limit(parseInt(limit));

    const countQuery = { ...query };
    delete countQuery.location;
    const total = await User.countDocuments(countQuery);

    res.json({
      donors,
      pagination: { total, page: parseInt(page), pages: Math.ceil(total / limit) },
    });
  } catch (err) {
    next(err);
  }
};

// ─── Get Donor Profile ────────────────────────────────────
exports.getDonorProfile = async (req, res, next) => {
  try {
    const donor = await User.findById(req.params.id)
      .select('-password -refreshToken -emailVerificationToken');

    if (!donor || donor.role !== 'donor') {
      return res.status(404).json({ error: 'Donor not found' });
    }

    res.json({ donor });
  } catch (err) {
    next(err);
  }
};

// ─── Update Donor Profile ─────────────────────────────────
exports.updateProfile = async (req, res, next) => {
  try {
    const allowed = [
      'name', 'phone', 'bloodGroup', 'age', 'weight',
      'profileImage', 'location', 'notificationPreferences',
      'hasChronicDisease',
    ];

    const updates = {};
    allowed.forEach(field => {
      if (req.body[field] !== undefined) updates[field] = req.body[field];
    });

    const user = await User.findByIdAndUpdate(
      req.user.id,
      { $set: updates },
      { new: true, runValidators: true }
    );

    res.json({ user: user.toSafeObject() });
  } catch (err) {
    next(err);
  }
};

// ─── Toggle Availability ──────────────────────────────────
exports.toggleAvailability = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id);
    user.isAvailable = !user.isAvailable;
    await user.save({ validateBeforeSave: false });

    // Broadcast updated availability
    const io = getIO();
    io.emit('donor_availability_update', {
      donorId: user._id,
      isAvailable: user.isAvailable,
    });

    res.json({
      message: `You are now ${user.isAvailable ? 'available' : 'unavailable'} to donate`,
      isAvailable: user.isAvailable,
    });
  } catch (err) {
    next(err);
  }
};

// ─── Update Location ──────────────────────────────────────
exports.updateLocation = async (req, res, next) => {
  try {
    const { lat, lng, address } = req.body;

    await User.findByIdAndUpdate(req.user.id, {
      'location.coordinates': [lng, lat],
      'location.address': address || '',
    });

    // Broadcast location update
    const io = getIO();
    io.emit('donor_location_update', {
      donorId: req.user.id,
      coordinates: [lng, lat],
    });

    res.json({ message: 'Location updated' });
  } catch (err) {
    next(err);
  }
};

// ─── Get Donation History ─────────────────────────────────
exports.getDonationHistory = async (req, res, next) => {
  try {
    const donations = await BloodRequest.find({
      'responses.donor': req.user.id,
      'responses.status': 'donated',
    })
      .select('bloodGroup hospitalName responses createdAt')
      .sort({ createdAt: -1 });

    res.json({ donations });
  } catch (err) {
    next(err);
  }
};

// ─── Leaderboard ──────────────────────────────────────────
exports.getLeaderboard = async (req, res, next) => {
  try {
    const leaders = await User.find({ role: 'donor', totalDonations: { $gt: 0 } })
      .select('name profileImage bloodGroup totalDonations rewardPoints badges')
      .sort({ totalDonations: -1, rewardPoints: -1 })
      .limit(50);

    res.json({ leaders });
  } catch (err) {
    next(err);
  }
};

// ─── Eligibility Check ────────────────────────────────────
exports.checkEligibility = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id);

    const checks = {
      eligible: true,
      reasons: [],
    };

    if (user.age < 18 || user.age > 65) {
      checks.eligible = false;
      checks.reasons.push('Age must be between 18 and 65');
    }

    if (user.weight < 45) {
      checks.eligible = false;
      checks.reasons.push('Weight must be at least 45 kg');
    }

    if (user.lastDonationDate) {
      const daysSince = (Date.now() - user.lastDonationDate) / (1000 * 60 * 60 * 24);
      if (daysSince < 90) {
        checks.eligible = false;
        checks.reasons.push(`Must wait ${Math.ceil(90 - daysSince)} more days since last donation`);
      }
    }

    if (user.hasChronicDisease) {
      checks.eligible = false;
      checks.reasons.push('Chronic disease may affect eligibility – consult a doctor');
    }

    res.json({
      eligible: checks.eligible,
      reasons: checks.reasons,
      nextEligibleDate: user.nextEligibleDate,
    });
  } catch (err) {
    next(err);
  }
};

// ─── Redeem Points for Treatment Discount ─────────────────
exports.redeemPoints = async (req, res, next) => {
  try {
    const { hospitalId, treatmentName, points } = req.body;
    const Notification = require('../models/Notification');
    const { getIO } = require('../socket');

    if (!hospitalId || !treatmentName || !points) {
      return res.status(400).json({ error: 'Hospital, treatment name, and points are required' });
    }

    const pointsToRedeem = parseInt(points);
    if (isNaN(pointsToRedeem) || pointsToRedeem <= 0) {
      return res.status(400).json({ error: 'Points must be a positive number' });
    }

    const donor = await User.findById(req.user.id);
    if (!donor) return res.status(404).json({ error: 'Donor not found' });

    if (donor.rewardPoints < pointsToRedeem) {
      return res.status(400).json({ error: `Insufficient points. You have ${donor.rewardPoints} points.` });
    }

    const hospital = await User.findOne({ _id: hospitalId, role: 'hospital' });
    if (!hospital) return res.status(404).json({ error: 'Selected hospital not found' });

    // Deduct points
    donor.rewardPoints -= pointsToRedeem;
    const discountAmount = pointsToRedeem; // 1 point = ₹1 discount

    donor.redemptions = donor.redemptions || [];
    donor.redemptions.push({
      hospital: hospital._id,
      hospitalName: hospital.name,
      treatmentName,
      pointsRedeemed: pointsToRedeem,
      discountAmount,
      redeemedAt: new Date(),
    });

    await donor.save();

    // Trigger real-time updates
    const io = getIO();
    if (io) {
      io.to(`user:${donor._id}`).emit('points_updated', {
        rewardPoints: donor.rewardPoints,
        redemptions: donor.redemptions,
      });
      io.to(`user:${hospital._id}`).emit('notification_created', {
        message: `New treatment discount applied by donor ${donor.name} for ${treatmentName}`,
      });
    }

    // Create persistent notifications
    await Notification.create({
      recipient: donor._id,
      type: 'system',
      title: '🎁 Points Redeemed!',
      message: `Successfully redeemed ${pointsToRedeem} points for a discount of ₹${discountAmount} on ${treatmentName} at ${hospital.name}.`,
      priority: 'medium',
    });

    await Notification.create({
      recipient: hospital._id,
      type: 'hospital_alert',
      title: '💰 Discount Applied',
      message: `Donor ${donor.name} applied a discount of ₹${discountAmount} using reward points for ${treatmentName}.`,
      priority: 'medium',
    });

    res.json({
      message: 'Points redeemed successfully',
      rewardPoints: donor.rewardPoints,
      user: donor.toSafeObject(),
    });
  } catch (err) {
    next(err);
  }
};

// ─── Get Discounts Applied to Hospital ────────────────────
exports.getHospitalDiscounts = async (req, res, next) => {
  try {
    const donors = await User.find({
      role: 'donor',
      'redemptions.hospital': req.user.id
    }).select('name redemptions');

    const discounts = [];
    donors.forEach(d => {
      d.redemptions.forEach(r => {
        if (r.hospital && r.hospital.toString() === req.user.id) {
          discounts.push({
            donorName: d.name,
            treatmentName: r.treatmentName,
            pointsRedeemed: r.pointsRedeemed,
            discountAmount: r.discountAmount,
            redeemedAt: r.redeemedAt,
          });
        }
      });
    });

    // Sort by date descending
    discounts.sort((a, b) => b.redeemedAt - a.redeemedAt);

    res.json({ discounts });
  } catch (err) {
    next(err);
  }
};
