// src/controllers/requestController.js
const BloodRequest = require('../models/BloodRequest');
const User = require('../models/User');
const BloodInventory = require('../models/BloodInventory');
const Notification = require('../models/Notification');
const { getIO } = require('../socket');
const { sendPushNotification } = require('../utils/fcm');
const { calculateUrgencyScore, detectFraud } = require('../utils/aiHelpers');
const logger = require('../utils/logger');

// ─── Create Blood Request ─────────────────────────────────
exports.createRequest = async (req, res, next) => {
  try {
    const {
      patientName, patientAge, contactNumber, bloodGroup,
      unitsRequired, hospitalName, location, priority,
      medicalReason, isEmergency, requiredBy,
    } = req.body;

    // AI fraud check
    const fraudScore = await detectFraud(req.body, req.user);
    if (fraudScore > 80) {
      logger.warn(`High fraud score (${fraudScore}) for request by ${req.user.id}`);
    }

    // Calculate urgency score
    const urgencyScore = calculateUrgencyScore({ priority, isEmergency, requiredBy });

    // Resolve target hospital user ID
    let targetHospitalId = req.user.role === 'hospital' ? req.user.id : req.body.hospital;
    if (!targetHospitalId && hospitalName) {
      const nameFirstWord = hospitalName.split(' ')[0] || hospitalName;
      const matchedHospital = await User.findOne({
        role: 'hospital',
        $or: [
          { name: new RegExp(hospitalName, 'i') },
          { name: new RegExp(nameFirstWord, 'i') },
          { 'hospitalInfo.hospitalName': new RegExp(hospitalName, 'i') },
          { 'hospitalInfo.hospitalName': new RegExp(nameFirstWord, 'i') }
        ]
      });
      if (matchedHospital) {
        targetHospitalId = matchedHospital._id;
      }
    }

    const request = await BloodRequest.create({
      requestedBy: req.user.id,
      hospital: targetHospitalId,
      patientName, patientAge, contactNumber, bloodGroup,
      unitsRequired, hospitalName, location, priority: priority || 'medium',
      medicalReason, isEmergency: isEmergency || false, requiredBy,
      urgencyScore, fraudScore,
    });

    // Find nearby donors and broadcast
    const searchRadius = isEmergency ? 20 : 10; // km
    const nearbyDonors = await User.find({
      role: 'donor',
      bloodGroup: getCompatibleGroups(bloodGroup),
      isAvailable: true,
      isActive: true,
      isBlocked: false,
      location: {
        $nearSphere: {
          $geometry: {
            type: 'Point',
            coordinates: location.coordinates,
          },
          $maxDistance: searchRadius * 1000, // meters
        },
      },
    }).limit(50).select('_id fcmTokens name');

    // Notify donors via Socket.IO
    const io = getIO();
    nearbyDonors.forEach(donor => {
      io.to(`user:${donor._id}`).emit('new_emergency_request', {
        request: {
          _id: request._id,
          bloodGroup,
          unitsRequired,
          hospitalName,
          priority: request.priority,
          urgencyScore,
          location: request.location,
          isEmergency,
        },
        distance: 'Nearby',
      });
    });

    // Broadcast to all connected clients in the area
    io.emit('request_feed_update', {
      type: 'new',
      request: { ...request.toJSON(), requestedBy: req.user },
    });

    // Send FCM push notifications
    const fcmTokens = nearbyDonors.flatMap(d => d.fcmTokens).filter(Boolean);
    if (fcmTokens.length > 0) {
      await sendPushNotification(fcmTokens, {
        title: isEmergency ? '🚨 EMERGENCY Blood Request!' : '🩸 Blood Request Nearby',
        body: `${bloodGroup} blood needed at ${hospitalName}. ${unitsRequired} units required.`,
        data: { requestId: request._id.toString(), type: 'blood_request' },
      }).catch(err => logger.warn('FCM failed:', err.message));
    }

    // Save notifications in DB
    const notifications = nearbyDonors.map(donor => ({
      recipient: donor._id,
      type: 'emergency_request',
      title: isEmergency ? '🚨 Emergency Blood Request' : '🩸 Blood Request',
      message: `${bloodGroup} blood needed at ${hospitalName}`,
      priority: isEmergency ? 'critical' : 'high',
      relatedRequest: request._id,
      data: { requestId: request._id },
    }));

    if (notifications.length > 0) {
      await Notification.insertMany(notifications);
    }

    // Update request with notified donors count
    request.notifiedDonors = nearbyDonors.map(d => d._id);
    request.broadcastCount = nearbyDonors.length;
    await request.save();

    await request.populate('requestedBy', 'name email phone');

    res.status(201).json({
      message: 'Blood request created and broadcast to nearby donors',
      request,
      donorsNotified: nearbyDonors.length,
    });
  } catch (err) {
    next(err);
  }
};

// ─── Get Stats ────────────────────────────────────────────
exports.getStats = async (req, res, next) => {
  try {
    const [total, active, fulfilled, emergency, byBloodGroup, totalDonors, totalHospitals] = await Promise.all([
      BloodRequest.countDocuments({}),
      BloodRequest.countDocuments({ status: 'active' }),
      BloodRequest.countDocuments({ status: 'fulfilled' }),
      BloodRequest.countDocuments({ isEmergency: true, status: 'active' }),
      BloodRequest.aggregate([
        { $group: { _id: '$bloodGroup', count: { $sum: 1 } } },
        { $sort: { count: -1 } }
      ]),
      User.countDocuments({ role: 'donor', isActive: true }),
      User.countDocuments({ role: 'hospital', isActive: true }),
    ]);
    res.json({ total, active, fulfilled, emergency, byBloodGroup, totalDonors, totalHospitals });
  } catch (err) {
    next(err);
  }
};

// ─── Get All Requests ─────────────────────────────────────
exports.getRequests = async (req, res, next) => {
  try {
    const {
      bloodGroup, priority, status = 'active',
      lat, lng, radius = 50,
      page = 1, limit = 20,
      requestedBy,
    } = req.query;

    const query = {};
    if (status !== 'all') query.status = status;
    if (bloodGroup) query.bloodGroup = bloodGroup;
    if (priority) query.priority = priority;
    if (requestedBy && requestedBy !== 'undefined' && requestedBy !== 'null') {
      query.$or = [{ requestedBy }, { hospital: requestedBy }];
    }

    let requests;
    if (lat && lng) {
      requests = await BloodRequest.find({
        ...query,
        location: {
          $nearSphere: {
            $geometry: { type: 'Point', coordinates: [parseFloat(lng), parseFloat(lat)] },
            $maxDistance: parseInt(radius) * 1000,
          },
        },
      })
        .populate('requestedBy', 'name phone')
        .populate('hospital', 'name hospitalInfo')
        .populate('responses.donor', 'name bloodGroup phone')
        .sort({ urgencyScore: -1, createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(parseInt(limit));
    } else {
      requests = await BloodRequest.find(query)
        .populate('requestedBy', 'name phone')
        .populate('responses.donor', 'name bloodGroup phone')
        .sort({ urgencyScore: -1, createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(parseInt(limit));
    }

    const total = await BloodRequest.countDocuments(query);

    res.json({
      requests,
      pagination: {
        total,
        page: parseInt(page),
        pages: Math.ceil(total / limit),
        limit: parseInt(limit),
      },
    });
  } catch (err) {
    next(err);
  }
};

// ─── Get Single Request ───────────────────────────────────
exports.getRequest = async (req, res, next) => {
  try {
    const request = await BloodRequest.findById(req.params.id)
      .populate('requestedBy', 'name email phone profileImage')
      .populate('responses.donor', 'name bloodGroup profileImage location')
      .populate('hospital', 'name hospitalInfo location');

    if (!request) return res.status(404).json({ error: 'Request not found' });

    res.json({ request });
  } catch (err) {
    next(err);
  }
};

// ─── Accept Request ───────────────────────────────────────
exports.acceptRequest = async (req, res, next) => {
  try {
    const request = await BloodRequest.findById(req.params.id);
    if (!request) return res.status(404).json({ error: 'Request not found' });
    if (request.status === 'fulfilled') {
      return res.status(400).json({ error: 'Request already fulfilled' });
    }
    const activeAcceptedCount = request.responses.filter(r => r.status === 'accepted' || r.status === 'donated').length;
    if (request.unitsCollected >= (request.unitsRequired || 1) || activeAcceptedCount >= (request.unitsRequired || 1)) {
      return res.status(400).json({ error: 'This request has already been accepted or fulfilled by sufficient donors.' });
    }

    // Blood group compatibility validation
    const donorUser = await User.findById(req.user.id);
    const COMPATIBLE_DONORS_FOR_RECIPIENT = {
      'A+': ['A+', 'A-', 'O+', 'O-'],
      'A-': ['A-', 'O-'],
      'B+': ['B+', 'B-', 'O+', 'O-'],
      'B-': ['B-', 'O-'],
      'AB+': ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'],
      'AB-': ['AB-', 'A-', 'B-', 'O-'],
      'O+': ['O+', 'O-'],
      'O-': ['O-'],
    };
    const allowedDonors = COMPATIBLE_DONORS_FOR_RECIPIENT[request.bloodGroup] || [request.bloodGroup];
    if (!donorUser?.bloodGroup || !allowedDonors.includes(donorUser.bloodGroup)) {
      return res.status(400).json({
        error: `Incompatible blood group. Your blood group (${donorUser?.bloodGroup || 'unknown'}) cannot donate to a patient needing ${request.bloodGroup}.`
      });
    }

    const alreadyResponded = request.responses.find(
      r => r.donor.toString() === req.user.id
    );
    if (alreadyResponded) {
      return res.status(400).json({ error: 'You already responded to this request' });
    }

    request.responses.push({
      donor: req.user.id,
      status: 'accepted',
    });

    // Resolve hospital ID
    let hospitalId = request.hospital;
    if (!hospitalId && request.hospitalName) {
      const nameFirstWord = request.hospitalName.split(' ')[0] || request.hospitalName;
      const matchedHospital = await User.findOne({
        role: 'hospital',
        $or: [
          { name: new RegExp(request.hospitalName, 'i') },
          { name: new RegExp(nameFirstWord, 'i') },
          { 'hospitalInfo.hospitalName': new RegExp(request.hospitalName, 'i') },
          { 'hospitalInfo.hospitalName': new RegExp(nameFirstWord, 'i') }
        ]
      });
      if (matchedHospital) {
        hospitalId = matchedHospital._id;
        request.hospital = hospitalId;
      } else {
        const fallbackHospital = await User.findOne({ role: 'hospital', isActive: true });
        if (fallbackHospital) {
          hospitalId = fallbackHospital._id;
          request.hospital = hospitalId;
        }
      }
    }

    await request.save();
    await request.populate('requestedBy', 'name email fcmTokens');

    if (request.requestedBy) {
      const recipientId = request.requestedBy._id || request.requestedBy;
      const io = getIO();
      if (io) {
        io.to(`user:${recipientId}`).emit('request_accepted', {
          requestId: request._id,
          donor: req.user,
        });
      }

      await Notification.create({
        recipient: recipientId,
        type: 'request_accepted',
        title: '✅ Donor Found!',
        message: `A donor has accepted your blood request for ${request.bloodGroup}`,
        relatedRequest: request._id,
        priority: 'high',
      });
    }

    res.json({ message: 'Request accepted', request });
  } catch (err) {
    next(err);
  }
};

// ─── Mark Donation Complete ───────────────────────────────
exports.completeDonation = async (req, res, next) => {
  try {
    const { units = 1 } = req.body;
    const requestId = req.params.id;

    // 1. Fetch request
    const request = await BloodRequest.findById(requestId);
    if (!request) {
      logger.error(`[DONATION ERROR] Request not found: ${requestId}`);
      return res.status(404).json({ error: 'Request not found' });
    }

    // 2. Check if request is already fulfilled or completed
    if (request.status === 'fulfilled' || request.status === 'completed') {
      logger.warn(`[DONATION IDEMPOTENT] Request ${requestId} is already fulfilled`);
      return res.status(400).json({ error: 'Request is already fulfilled' });
    }

    // 3. Find the accepted donor response
    const response = request.responses.find(
      r => (r.donor._id || r.donor).toString() === req.user.id
    );

    if (!response) {
      logger.error(`[DONATION ERROR] User ${req.user.id} has no response for request ${requestId}`);
      return res.status(400).json({ error: 'You have not responded to this request' });
    }

    // IDEMPOTENCY CHECK: If already marked as donated, do not double-process
    if (response.status === 'donated') {
      logger.warn(`[DONATION IDEMPOTENT] User ${req.user.id} already completed donation for request ${requestId}`);
      return res.status(400).json({ error: 'Donation has already been recorded for this request' });
    }

    if (response.status !== 'accepted') {
      return res.status(400).json({ error: 'Must accept request before completing donation' });
    }

    // 4. Update request donor response & collected units
    const donatedUnits = parseInt(units) || 1;
    response.status = 'donated';
    response.donatedAt = new Date();
    response.units = donatedUnits;

    request.unitsCollected = (request.unitsCollected || 0) + donatedUnits;
    if (request.unitsCollected >= (request.unitsRequired || 1)) {
      request.status = 'fulfilled';
    }

    await request.save();

    // 5. RESOLVE HOSPITAL: Find exact hospital ID
    let hospitalId = request.hospital;
    if (!hospitalId && request.requestedBy) {
      const requester = await User.findById(request.requestedBy);
      if (requester && requester.role === 'hospital') {
        hospitalId = requester._id;
      }
    }
    if (!hospitalId && request.hospitalName) {
      const nameFirstWord = request.hospitalName.split(' ')[0] || request.hospitalName;
      const matchedHospital = await User.findOne({
        role: 'hospital',
        $or: [
          { name: new RegExp(request.hospitalName, 'i') },
          { name: new RegExp(nameFirstWord, 'i') },
          { 'hospitalInfo.hospitalName': new RegExp(request.hospitalName, 'i') },
          { 'hospitalInfo.hospitalName': new RegExp(nameFirstWord, 'i') }
        ]
      });
      if (matchedHospital) {
        hospitalId = matchedHospital._id;
      } else {
        const fallbackHospital = await User.findOne({ role: 'hospital', isActive: true });
        if (fallbackHospital) {
          hospitalId = fallbackHospital._id;
        }
      }
    }
    if (hospitalId) {
      request.hospital = hospitalId;
      await request.save();
    }

    // 6. UPDATE HOSPITAL INVENTORY ATOMICALLY IN MONGODB
    let updatedInventoryData = null;
    let newQuantity = 0;

    if (hospitalId) {
      const BloodInventory = require('../models/BloodInventory');
      const bloodGroup = request.bloodGroup;

      // Atomic MongoDB update using $inc
      const updatedDoc = await BloodInventory.findOneAndUpdate(
        { hospital: hospitalId },
        {
          $inc: { [`inventory.${bloodGroup}.units`]: donatedUnits },
          $set: { [`inventory.${bloodGroup}.lastUpdated`]: new Date() },
          $push: {
            history: {
              bloodGroup,
              action: 'added',
              units: donatedUnits,
              performedBy: req.user.id,
              reason: `Donation completion for request ${request._id} (${request.patientName || 'Patient'})`,
              timestamp: new Date()
            }
          }
        },
        { new: true, upsert: true }
      );

      // Force Mongoose pre-save hook recalculation
      updatedDoc.markModified('inventory');
      await updatedDoc.save();

      // FRESH VERIFICATION QUERY DIRECT FROM MONGODB ATLAS
      const freshVerification = await BloodInventory.findOne({ hospital: hospitalId }).lean();
      newQuantity = freshVerification?.inventory?.[bloodGroup]?.units || 0;
      updatedInventoryData = freshVerification;

      logger.info(`[MONGODB INVENTORY VERIFIED] Hospital: ${hospitalId} | Group: ${bloodGroup} | Units: ${newQuantity}`);

      // Broadcast Socket.IO event AFTER database write is confirmed
      const { getIO } = require('../socket');
      const io = getIO();
      if (io) {
        const socketPayload = {
          hospitalId: hospitalId.toString(),
          bloodGroup,
          units: donatedUnits,
          newInventoryQuantity: newQuantity,
          totalUnits: updatedDoc.totalUnits,
          inventory: updatedDoc.inventory,
          requestId: request._id.toString(),
          timestamp: new Date()
        };

        io.to(`user:${hospitalId}`).emit('inventory_updated', socketPayload);
        io.to('role:hospital').emit('inventory_updated', socketPayload);
        io.emit('inventory_updated', socketPayload);
      }
    }

    // 8. UPDATE DONOR REWARDS & BADGES
    const donor = await User.findById(req.user.id);
    if (donor) {
      donor.lastDonationDate = new Date();
      donor.nextEligibleDate = new Date(Date.now() + 90 * 24 * 60 * 60 * 1000);
      donor.totalDonations = (donor.totalDonations || 0) + 1;
      donor.rewardPoints = (donor.rewardPoints || 0) + 100;

      const existingBadges = donor.badges.map(b => b.name);
      if (donor.totalDonations >= 1 && !existingBadges.includes('First Drop')) {
        donor.badges.push({ name: 'First Drop', icon: '🩸' });
      }
      if (donor.totalDonations >= 5 && !existingBadges.includes('Life Saver')) {
        donor.badges.push({ name: 'Life Saver', icon: '💉' });
      }
      if (donor.totalDonations >= 10 && !existingBadges.includes('Hero')) {
        donor.badges.push({ name: 'Hero', icon: '🏆' });
      }

      await donor.save();

      // Emit donor rewards real-time update
      const io = getIO();
      if (io) {
        io.to(`user:${donor._id}`).emit('donor_reward_update', {
          rewardPoints: donor.rewardPoints,
          totalDonations: donor.totalDonations,
          badges: donor.badges
        });
      }
    }

    // 9. EMIT REQUEST FULFILLED SOCKET EVENT TO PATIENT / REQUESTER
    const io = getIO();
    if (io) {
      const recipientId = request.requestedBy ? request.requestedBy.toString() : null;
      if (recipientId) {
        io.to(`user:${recipientId}`).emit('request_fulfilled', {
          requestId: request._id,
          status: request.status,
          bloodGroup: request.bloodGroup,
          unitsCollected: request.unitsCollected,
        });
      }
      // Broadcast global feed update so all dashboards refresh
      io.emit('request_feed_update', {
        type: 'fulfilled',
        requestId: request._id,
      });
    }

    // Save persistent notification for patient
    if (request.requestedBy) {
      await Notification.create({
        recipient: request.requestedBy,
        type: 'request_fulfilled',
        title: '🩸 Blood Donated!',
        message: `A donor has completed the donation for your ${request.bloodGroup} blood request.`,
        relatedRequest: request._id,
        priority: 'high',
      });
    }

    res.json({
      message: 'Donation recorded successfully',
      request,
      donor: {
        totalDonations: donor?.totalDonations,
        rewardPoints: donor?.rewardPoints,
        badges: donor?.badges
      },
      points: donor?.rewardPoints,
      inventory: updatedInventoryData?.inventory
    });
  } catch (err) {
    next(err);
  }
};

// ─── Cancel Request ───────────────────────────────────────
exports.cancelRequest = async (req, res, next) => {
  try {
    const request = await BloodRequest.findById(req.params.id);
    if (!request) return res.status(404).json({ error: 'Request not found' });

    const requestedById = request.requestedBy ? request.requestedBy.toString() : null;
    if (requestedById !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Not authorized' });
    }

    request.status = 'cancelled';
    await request.save();

    const io = getIO();
    io.emit('request_cancelled', { requestId: request._id });

    res.json({ message: 'Request cancelled' });
  } catch (err) {
    next(err);
  }
};

// ─── Fulfill Patient Request (Hospital only) ──────────────
exports.fulfillRequest = async (req, res, next) => {
  try {
    const request = await BloodRequest.findById(req.params.id);
    if (!request) return res.status(404).json({ error: 'Request not found' });
    
    if (request.status !== 'active' && request.status !== 'partially_fulfilled') {
      return res.status(400).json({ error: `Request cannot be fulfilled because status is ${request.status}` });
    }

    const BloodInventory = require('../models/BloodInventory');
    const hospitalInventory = await BloodInventory.findOne({ hospital: req.user.id });
    if (!hospitalInventory) {
      return res.status(400).json({ error: 'Hospital inventory not found. Please initialize your blood inventory first.' });
    }

    const bloodGroup = request.bloodGroup;
    const requiredUnits = request.unitsRequired - request.unitsCollected;
    const availableUnits = hospitalInventory.inventory[bloodGroup]?.units || 0;

    if (availableUnits < requiredUnits) {
      return res.status(400).json({ 
        error: 'Insufficient blood units available', 
        available: availableUnits, 
        required: requiredUnits 
      });
    }

    // Deduct inventory atomically
    hospitalInventory.inventory[bloodGroup].units -= requiredUnits;
    hospitalInventory.inventory[bloodGroup].lastUpdated = new Date();

    hospitalInventory.history.push({
      bloodGroup,
      action: 'used',
      units: requiredUnits,
      performedBy: req.user.id,
      reason: `Fulfilled patient request ${request._id}`,
      timestamp: new Date()
    });

    await hospitalInventory.save();

    // Mark request fulfilled
    request.hospital = req.user.id;
    request.unitsCollected = request.unitsRequired;
    request.status = 'fulfilled';
    await request.save();

    // Socket.IO notifications
    const io = getIO();
    if (io) {
      // Notify patient
      io.to(`user:${request.requestedBy}`).emit('request_fulfilled', {
        requestId: request._id,
        status: request.status,
      });

      // Broadcast inventory update
      io.to(`user:${req.user.id}`).emit('inventory_updated', {
        inventory: hospitalInventory.inventory,
        totalUnits: hospitalInventory.totalUnits
      });
      
      // Update global feeds
      io.emit('request_feed_update', {
        type: 'cancelled', // Removes active card from feeds
        requestId: request._id
      });
    }

    // Persistent notifications
    const Notification = require('../models/Notification');
    await Notification.create({
      recipient: request.requestedBy,
      type: 'request_fulfilled',
      title: '💖 Request Fulfilled!',
      message: `Your request for ${bloodGroup} was successfully fulfilled by ${req.user.name}.`,
      relatedRequest: request._id,
      priority: 'high',
    });

    res.json({
      message: 'Request fulfilled from hospital inventory successfully',
      request,
      inventory: hospitalInventory.inventory
    });
  } catch (err) {
    next(err);
  }
};

// ─── Stats ────────────────────────────────────────────────
exports.getStats = async (req, res, next) => {
  try {
    const [total, active, fulfilled, emergency] = await Promise.all([
      BloodRequest.countDocuments(),
      BloodRequest.countDocuments({ status: 'active' }),
      BloodRequest.countDocuments({ status: 'fulfilled' }),
      BloodRequest.countDocuments({ isEmergency: true, status: 'active' }),
    ]);

    const byBloodGroup = await BloodRequest.aggregate([
      { $match: { status: 'active' } },
      { $group: { _id: '$bloodGroup', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
    ]);

    res.json({ total, active, fulfilled, emergency, byBloodGroup });
  } catch (err) {
    next(err);
  }
};

// ─── Helpers ──────────────────────────────────────────────
function getCompatibleGroups(bloodGroup) {
  const compatibility = {
    'A+':  ['A+', 'A-', 'O+', 'O-'],
    'A-':  ['A-', 'O-'],
    'B+':  ['B+', 'B-', 'O+', 'O-'],
    'B-':  ['B-', 'O-'],
    'AB+': ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'],
    'AB-': ['A-', 'B-', 'AB-', 'O-'],
    'O+':  ['O+', 'O-'],
    'O-':  ['O-'],
  };
  return { $in: compatibility[bloodGroup] || [bloodGroup] };
}
