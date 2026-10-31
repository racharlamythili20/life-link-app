// src/routes/hospitals.js
const router = require('express').Router();
const { protect, authorize } = require('../middleware/auth');
const BloodInventory = require('../models/BloodInventory');
const User = require('../models/User');

// Get all hospitals
router.get('/', async (req, res, next) => {
  try {
    const { lat, lng, radius = 20 } = req.query;
    let query = { role: 'hospital', isActive: true };

    let hospitals;
    if (lat && lng) {
      hospitals = await User.find({
        ...query,
        location: {
          $nearSphere: {
            $geometry: { type: 'Point', coordinates: [parseFloat(lng), parseFloat(lat)] },
            $maxDistance: parseInt(radius) * 1000,
          },
        },
      }).select('name email phone location profileImage hospitalInfo').limit(50);
    } else {
      hospitals = await User.find(query)
        .select('name email phone location profileImage hospitalInfo')
        .limit(100);
    }
    res.json({ hospitals });
  } catch (err) { next(err); }
});

// Get hospital inventory
router.get('/:id/inventory', async (req, res, next) => {
  try {
    let inventory = await BloodInventory.findOne({ hospital: req.params.id });
    if (!inventory) {
      inventory = await BloodInventory.create({
        hospital: req.params.id,
        inventory: {
          'A+': { units: 0 }, 'A-': { units: 0 },
          'B+': { units: 0 }, 'B-': { units: 0 },
          'AB+': { units: 0 }, 'AB-': { units: 0 },
          'O+': { units: 0 }, 'O-': { units: 0 }
        }
      });
    }
    res.json({ inventory });
  } catch (err) { next(err); }
});

router.put('/inventory', protect, authorize('hospital', 'admin'), async (req, res, next) => {
  try {
    const { bloodGroup, units, action, reason } = req.body;
    const deltaUnits = action === 'added' ? parseInt(units) : -parseInt(units);

    // Atomic update using $inc
    let updateQuery = {
      $inc: { [`inventory.${bloodGroup}.units`]: deltaUnits },
      $set: { [`inventory.${bloodGroup}.lastUpdated`]: new Date() },
      $push: {
        history: {
          bloodGroup,
          action,
          units,
          performedBy: req.user.id,
          reason: reason || `Manual inventory update (${action})`,
          timestamp: new Date()
        }
      }
    };

    const updatedDoc = await BloodInventory.findOneAndUpdate(
      { hospital: req.user.id },
      updateQuery,
      { new: true, upsert: true }
    );

    // Prevent negative units for used/expired
    if (updatedDoc.inventory[bloodGroup]?.units < 0) {
      updatedDoc.inventory[bloodGroup].units = 0;
    }

    updatedDoc.markModified('inventory');
    await updatedDoc.save();

    // FRESH VERIFICATION QUERY DIRECT FROM MONGODB ATLAS
    const freshInventory = await BloodInventory.findOne({ hospital: req.user.id }).lean();

    // Broadcast Socket.IO event AFTER database write is confirmed
    const { getIO } = require('../socket');
    const io = getIO();
    if (io) {
      const socketPayload = {
        hospitalId: req.user.id.toString(),
        bloodGroup,
        units,
        newInventoryQuantity: freshInventory.inventory[bloodGroup].units,
        totalUnits: updatedDoc.totalUnits,
        inventory: freshInventory.inventory,
        timestamp: new Date()
      };
      io.to(`user:${req.user.id}`).emit('inventory_updated', socketPayload);
      io.to('role:hospital').emit('inventory_updated', socketPayload);
      io.emit('inventory_updated', socketPayload);
    }

    res.json({ inventory: freshInventory });
  } catch (err) { next(err); }
});

// Hospital dashboard stats
router.get('/dashboard/stats', protect, authorize('hospital'), async (req, res, next) => {
  try {
    const BloodRequest = require('../models/BloodRequest');
    let inventory = await BloodInventory.findOne({ hospital: req.user.id });
    if (!inventory) {
      inventory = await BloodInventory.create({
        hospital: req.user.id,
        inventory: {
          'A+': { units: 0 }, 'A-': { units: 0 },
          'B+': { units: 0 }, 'B-': { units: 0 },
          'AB+': { units: 0 }, 'AB-': { units: 0 },
          'O+': { units: 0 }, 'O-': { units: 0 }
        }
      });
    }

    const [activeRequests, totalRequests] = await Promise.all([
      BloodRequest.countDocuments({
        $or: [{ hospital: req.user.id }, { requestedBy: req.user.id }],
        status: 'active'
      }),
      BloodRequest.countDocuments({
        $or: [{ hospital: req.user.id }, { requestedBy: req.user.id }]
      }),
    ]);
    res.json({ inventory, activeRequests, totalRequests });
  } catch (err) { next(err); }
});

router.get('/discounts', protect, authorize('hospital'), require('../controllers/donorController').getHospitalDiscounts);

module.exports = router;
