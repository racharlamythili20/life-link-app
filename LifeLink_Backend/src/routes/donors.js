// src/routes/donors.js
const router = require('express').Router();
const { protect, authorize } = require('../middleware/auth');
const ctrl = require('../controllers/donorController');

// Public routes - specific paths BEFORE :id
router.get('/nearby', ctrl.getNearbyDonors);
router.get('/leaderboard', ctrl.getLeaderboard);

// Protected routes - specific paths BEFORE :id
router.use(protect);
router.get('/me/donations', ctrl.getDonationHistory);
router.get('/me/eligibility', ctrl.checkEligibility);
router.put('/profile', ctrl.updateProfile);
router.put('/availability', ctrl.toggleAvailability);
router.put('/location', ctrl.updateLocation);
router.post('/redeem', ctrl.redeemPoints);

// Dynamic :id route LAST to avoid catching /me/* paths
router.get('/:id', ctrl.getDonorProfile);

module.exports = router;
