// src/controllers/authController.js
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const admin = require('../config/firebase');
const User = require('../models/User');
const { sendEmail } = require('../utils/email');
const logger = require('../utils/logger');

// ─── Token Helpers ────────────────────────────────────────
const JWT_SECRET = process.env.JWT_SECRET || 'lifelink_default_secret_key_change_in_production';
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'lifelink_default_refresh_secret_key_change_in_production';

const generateTokens = (userId) => {
  const accessToken = jwt.sign(
    { id: userId },
    JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
  );
  const refreshToken = jwt.sign(
    { id: userId },
    JWT_REFRESH_SECRET,
    { expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '30d' }
  );
  return { accessToken, refreshToken };
};

// ─── Register ─────────────────────────────────────────────
exports.register = async (req, res, next) => {
  try {
    const { name, email, password, phone, role, bloodGroup, age, weight } = req.body;

    const sanitizedEmail = email ? email.trim().toLowerCase() : email;
    const existing = await User.findOne({ email: sanitizedEmail });
    if (existing) {
      return res.status(409).json({ error: 'Email already registered' });
    }

    const userData = {
      name,
      email: sanitizedEmail,
      password,
      role: role || 'donor',
    };

    // Sanitize phone number (strip spaces) and omit if empty
    if (phone && phone.trim() !== '') {
      userData.phone = phone.replace(/\s+/g, '');
    }

    // Omit bloodGroup if empty to avoid enum validation failure
    if (bloodGroup && bloodGroup.trim() !== '') {
      userData.bloodGroup = bloodGroup;
    }

    if (age) userData.age = Number(age);
    if (weight) userData.weight = Number(weight);

    const verificationToken = crypto.randomBytes(32).toString('hex');
    userData.emailVerificationToken = crypto
      .createHash('sha256')
      .update(verificationToken)
      .digest('hex');

    const user = await User.create(userData);

    // Send verification email
    const verifyUrl = `${process.env.CLIENT_URL}/verify-email/${verificationToken}`;
    await sendEmail({
      to: email,
      subject: 'LifeLink – Verify Your Email',
      html: `
        <h2>Welcome to LifeLink, ${name}!</h2>
        <p>Click below to verify your email address:</p>
        <a href="${verifyUrl}" style="background:#dc2626;color:white;padding:12px 24px;border-radius:8px;text-decoration:none;">
          Verify Email
        </a>
        <p>Link expires in 24 hours.</p>
      `,
    }).catch(err => logger.warn('Email send failed:', err.message));

    const { accessToken, refreshToken } = generateTokens(user._id);
    user.refreshToken = refreshToken;
    await user.save({ validateBeforeSave: false });

    res.status(201).json({
      message: 'Registration successful. Please verify your email.',
      user: user.toSafeObject(),
      accessToken,
      refreshToken,
    });
  } catch (err) {
    next(err);
  }
};

// ─── Login ────────────────────────────────────────────────
exports.login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    // Sanitize email same way as registration (trim + lowercase)
    const sanitizedEmail = email ? email.trim().toLowerCase() : email;

    const user = await User.findOne({ email: sanitizedEmail }).select('+password +refreshToken');
    if (!user || !user.password) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    if (user.isBlocked) {
      return res.status(403).json({ error: 'Account blocked', reason: user.blockedReason });
    }

    const { accessToken, refreshToken } = generateTokens(user._id);
    user.refreshToken = refreshToken;
    await user.save({ validateBeforeSave: false });

    res.json({
      user: user.toSafeObject(),
      accessToken,
      refreshToken,
    });
  } catch (err) {
    next(err);
  }
};

// ─── Supabase Auth ────────────────────────────────────────
exports.supabaseAuth = async (req, res, next) => {
  try {
    const supabase = require('../config/supabase');
    if (!supabase) {
      return res.status(503).json({ error: 'Supabase Auth is not configured on this server.' });
    }
    const token = req.body.accessToken || req.body.idToken || req.headers.authorization?.split(' ')[1];
    if (!token) {
      return res.status(400).json({ error: 'Supabase access token required' });
    }

    const { data: { user: sbUser }, error } = await supabase.auth.getUser(token);
    if (error || !sbUser) {
      return res.status(401).json({ error: 'Invalid Supabase token: ' + (error?.message || 'User not found') });
    }

    const uid = sbUser.id;
    const email = sbUser.email;
    const name = sbUser.user_metadata?.full_name || sbUser.user_metadata?.name || email.split('@')[0];
    const picture = sbUser.user_metadata?.avatar_url || sbUser.user_metadata?.picture || '';

    let user = await User.findOne({ $or: [{ supabaseUid: uid }, { email }] });
    if (!user) {
      user = await User.create({
        name,
        email,
        supabaseUid: uid,
        profileImage: picture,
        isVerified: true,
        role: 'donor',
      });
    } else if (!user.supabaseUid) {
      user.supabaseUid = uid;
      await user.save({ validateBeforeSave: false });
    }

    if (user.isBlocked) {
      return res.status(403).json({ error: 'Account blocked' });
    }

    const { accessToken, refreshToken } = generateTokens(user._id);
    user.refreshToken = refreshToken;
    await user.save({ validateBeforeSave: false });

    res.json({
      user: user.toSafeObject(),
      accessToken,
      refreshToken,
    });
  } catch (err) {
    next(err);
  }
};

// ─── Firebase Auth ────────────────────────────────────────
exports.firebaseAuth = async (req, res, next) => {
  try {
    if (!admin.apps || !admin.apps.length) {
      return res.status(503).json({ error: 'Firebase Auth is not configured on this server.' });
    }
    const { idToken } = req.body;

    const decoded = await admin.auth().verifyIdToken(idToken);
    const { uid, email, name, picture } = decoded;

    let user = await User.findOne({ $or: [{ firebaseUid: uid }, { email }] });

    if (!user) {
      user = await User.create({
        name: name || email.split('@')[0],
        email,
        firebaseUid: uid,
        profileImage: picture || '',
        isVerified: true,
        role: 'donor',
      });
    } else if (!user.firebaseUid) {
      user.firebaseUid = uid;
      await user.save({ validateBeforeSave: false });
    }

    if (user.isBlocked) {
      return res.status(403).json({ error: 'Account blocked' });
    }

    const { accessToken, refreshToken } = generateTokens(user._id);
    user.refreshToken = refreshToken;
    await user.save({ validateBeforeSave: false });

    res.json({
      user: user.toSafeObject(),
      accessToken,
      refreshToken,
    });
  } catch (err) {
    if (err.code?.startsWith('auth/')) {
      return res.status(401).json({ error: 'Invalid Firebase token' });
    }
    next(err);
  }
};

// ─── Get Current User ─────────────────────────────────────
exports.getMe = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json({ user: user.toSafeObject() });
  } catch (err) {
    next(err);
  }
};

// ─── Refresh Token ────────────────────────────────────────
exports.refreshToken = async (req, res, next) => {
  try {
    const { refreshToken } = req.body;
    if (!refreshToken) return res.status(401).json({ error: 'Refresh token required' });

    const decoded = jwt.verify(refreshToken, JWT_REFRESH_SECRET);
    const user = await User.findById(decoded.id).select('+refreshToken');

    if (!user || user.refreshToken !== refreshToken) {
      return res.status(401).json({ error: 'Invalid refresh token' });
    }

    const tokens = generateTokens(user._id);
    user.refreshToken = tokens.refreshToken;
    await user.save({ validateBeforeSave: false });

    res.json(tokens);
  } catch (err) {
    if (err.name === 'JsonWebTokenError' || err.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Invalid or expired refresh token' });
    }
    next(err);
  }
};

// ─── Forgot Password ──────────────────────────────────────
exports.forgotPassword = async (req, res, next) => {
  try {
    const { email } = req.body;
    const sanitizedEmail = email ? email.trim().toLowerCase() : email;
    const user = await User.findOne({ email: sanitizedEmail });

    // Always return success to prevent email enumeration
    if (!user) return res.json({ message: 'If this email exists, a reset link has been sent.' });

    const resetToken = crypto.randomBytes(32).toString('hex');
    user.passwordResetToken = crypto.createHash('sha256').update(resetToken).digest('hex');
    user.passwordResetExpires = Date.now() + 60 * 60 * 1000; // 1 hour
    await user.save({ validateBeforeSave: false });

    const resetUrl = `${process.env.CLIENT_URL}/reset-password/${resetToken}`;
    await sendEmail({
      to: email,
      subject: 'LifeLink – Password Reset Request',
      html: `
        <h2>Password Reset</h2>
        <p>Click below to reset your password (valid for 1 hour):</p>
        <a href="${resetUrl}" style="background:#dc2626;color:white;padding:12px 24px;border-radius:8px;text-decoration:none;">
          Reset Password
        </a>
      `,
    });

    res.json({ message: 'If this email exists, a reset link has been sent.' });
  } catch (err) {
    next(err);
  }
};

// ─── Reset Password ───────────────────────────────────────
exports.resetPassword = async (req, res, next) => {
  try {
    const { token, password } = req.body;
    const hashed = crypto.createHash('sha256').update(token).digest('hex');

    const user = await User.findOne({
      passwordResetToken: hashed,
      passwordResetExpires: { $gt: Date.now() },
    }).select('+passwordResetToken +passwordResetExpires');

    if (!user) return res.status(400).json({ error: 'Invalid or expired token' });

    user.password = password;
    user.passwordResetToken = undefined;
    user.passwordResetExpires = undefined;
    await user.save();

    res.json({ message: 'Password reset successful' });
  } catch (err) {
    next(err);
  }
};

// ─── Verify Email ─────────────────────────────────────────
exports.verifyEmail = async (req, res, next) => {
  try {
    const { token } = req.params;
    const hashed = crypto.createHash('sha256').update(token).digest('hex');

    const user = await User.findOne({ emailVerificationToken: hashed });
    if (!user) return res.status(400).json({ error: 'Invalid verification token' });

    user.isVerified = true;
    user.emailVerificationToken = undefined;
    await user.save({ validateBeforeSave: false });

    res.json({ message: 'Email verified successfully' });
  } catch (err) {
    next(err);
  }
};

// ─── Logout ───────────────────────────────────────────────
exports.logout = async (req, res, next) => {
  try {
    await User.findByIdAndUpdate(req.user.id, { refreshToken: undefined });
    res.json({ message: 'Logged out successfully' });
  } catch (err) {
    next(err);
  }
};
