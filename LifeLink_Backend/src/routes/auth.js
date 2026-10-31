// src/routes/auth.js
const router = require('express').Router();
const { protect } = require('../middleware/auth');
const ctrl = require('../controllers/authController');

router.post('/register', ctrl.register);
router.post('/login', ctrl.login);
router.post('/supabase', ctrl.supabaseAuth);
router.post('/oauth', ctrl.supabaseAuth);
router.post('/firebase', ctrl.supabaseAuth || ctrl.firebaseAuth);
router.post('/forgot-password', ctrl.forgotPassword);
router.post('/reset-password', ctrl.resetPassword);
router.get('/verify-email/:token', ctrl.verifyEmail);
router.post('/refresh', ctrl.refreshToken);
router.get('/me', protect, ctrl.getMe);
router.post('/logout', protect, ctrl.logout);

module.exports = router;
