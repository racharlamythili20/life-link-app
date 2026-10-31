const matchDonorsToRequest = async (request, donors) => {
  // simple matching logic based on blood group and distance
  return donors.filter(d => d.bloodGroup === request.bloodGroup);
};

/**
 * Calculate urgency score (0-100) based on request parameters
 */
const calculateUrgencyScore = ({ priority, isEmergency, requiredBy }) => {
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
const detectFraud = async (requestData, user) => {
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

module.exports = {
  matchDonorsToRequest,
  calculateUrgencyScore,
  detectFraud
};
