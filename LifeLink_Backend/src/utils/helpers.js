// src/utils/email.js
const nodemailer = require('nodemailer');
const logger = require('./logger');

let transporter = null;
if (process.env.EMAIL_USER && process.env.EMAIL_PASS) {
  transporter = nodemailer.createTransport({
    host: process.env.EMAIL_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.EMAIL_PORT || '587'),
    secure: false,
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
  });
}

exports.sendEmail = async ({ to, subject, html, text }) => {
  if (!transporter) {
    logger.warn(`Email sending skipped (EMAIL_USER / EMAIL_PASS not set). Recipient: ${to}, Subject: ${subject}`);
    return;
  }
  try {
    const info = await transporter.sendMail({
      from: `"LifeLink 🩸" <${process.env.EMAIL_USER}>`,
      to, subject, html, text,
    });
    logger.info(`Email sent to ${to}: ${info.messageId}`);
    return info;
  } catch (err) {
    logger.error('Email error:', err.message);
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// src/utils/fcm.js
const admin = require('../config/firebase');

exports.sendPushNotification = async (tokens, { title, body, data = {} }) => {
  if (!tokens || tokens.length === 0 || !admin.apps.length) return;

  const message = {
    notification: { title, body },
    data: Object.fromEntries(Object.entries(data).map(([k, v]) => [k, String(v)])),
    tokens: Array.isArray(tokens) ? tokens : [tokens],
  };

  try {
    const response = await admin.messaging().sendMulticast(message);
    return response;
  } catch (err) {
    logger.error('FCM error:', err.message);
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// src/utils/aiHelpers.js

/**
 * Calculate urgency score (0-100) based on request parameters
 */
exports.calculateUrgencyScore = ({ priority, isEmergency, requiredBy }) => {
  let score = 0;

  // Base priority score
  const priorityScores = { critical: 40, high: 30, medium: 20, low: 10 };
  score += priorityScores[priority] || 20;

  // Emergency flag
  if (isEmergency) score += 30;

  // Time pressure
  if (requiredBy) {
    const hoursUntil = (new Date(requiredBy) - Date.now()) / (1000 * 60 * 60);
    if (hoursUntil < 2) score += 30;
    else if (hoursUntil < 6) score += 20;
    else if (hoursUntil < 24) score += 10;
  }

  return Math.min(100, score);
};

/**
 * Basic fraud detection (0-100, higher = more suspicious)
 * In production, replace with ML model
 */
exports.detectFraud = async (requestData, user) => {
  let score = 0;

  // Check for duplicate requests in short time
  const BloodRequest = require('../models/BloodRequest');
  const recentRequests = await BloodRequest.countDocuments({
    requestedBy: user._id,
    createdAt: { $gt: new Date(Date.now() - 24 * 60 * 60 * 1000) },
  });
  if (recentRequests > 3) score += 40;

  // Unverified user requesting critical
  if (!user.isVerified && requestData.priority === 'critical') score += 20;

  // Very large units
  if (requestData.unitsRequired > 10) score += 15;

  return Math.min(100, score);
};
