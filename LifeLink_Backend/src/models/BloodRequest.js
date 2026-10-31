// src/models/BloodRequest.js
const mongoose = require('mongoose');

const bloodRequestSchema = new mongoose.Schema({
  // ─── Requestor ────────────────────────────────────────
  requestedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  patientName: { type: String, required: true, trim: true },
  patientAge: { type: Number },
  contactNumber: { type: String, required: true },

  // ─── Blood Requirements ───────────────────────────────
  bloodGroup: {
    type: String,
    enum: ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'],
    required: true,
  },
  unitsRequired: { type: Number, required: true, min: 1, max: 20 },
  unitsCollected: { type: Number, default: 0 },

  // ─── Location ─────────────────────────────────────────
  hospital: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User', // hospital user
  },
  hospitalName: { type: String, required: true },
  location: {
    type: {
      type: String,
      enum: ['Point'],
      default: 'Point',
    },
    coordinates: {
      type: [Number], // [longitude, latitude]
      required: true,
    },
    address: { type: String },
  },

  // ─── Priority & Status ────────────────────────────────
  priority: {
    type: String,
    enum: ['critical', 'high', 'medium', 'low'],
    default: 'medium',
  },
  status: {
    type: String,
    enum: ['active', 'partially_fulfilled', 'fulfilled', 'cancelled', 'expired'],
    default: 'active',
  },

  // ─── Medical Info ─────────────────────────────────────
  medicalReason: { type: String, trim: true },
  isEmergency: { type: Boolean, default: false },
  requiredBy: { type: Date },

  // ─── Responses ───────────────────────────────────────
  responses: [{
    donor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    status: {
      type: String,
      enum: ['accepted', 'declined', 'donated', 'cancelled'],
      default: 'accepted',
    },
    respondedAt: { type: Date, default: Date.now },
    donatedAt: { type: Date },
    units: { type: Number, default: 1 },
    notes: String,
  }],

  // ─── Broadcast Info ───────────────────────────────────
  notifiedDonors: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  }],
  broadcastRadius: { type: Number, default: 10 }, // km
  broadcastCount: { type: Number, default: 0 },

  // ─── AI Score ─────────────────────────────────────────
  urgencyScore: { type: Number, default: 0, min: 0, max: 100 },
  isFraudSuspect: { type: Boolean, default: false },
  fraudScore: { type: Number, default: 0 },

  // ─── Expiry ──────────────────────────────────────────
  expiresAt: {
    type: Date,
    default: () => new Date(Date.now() + 48 * 60 * 60 * 1000), // 48 hours
  },

}, {
  timestamps: true,
  toJSON: { virtuals: true },
});

// Indexes
bloodRequestSchema.index({ location: '2dsphere' });
bloodRequestSchema.index({ bloodGroup: 1, status: 1 });
bloodRequestSchema.index({ priority: 1, status: 1 });
bloodRequestSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
bloodRequestSchema.index({ createdAt: -1 });

// Virtual: fulfillment percentage
bloodRequestSchema.virtual('fulfillmentPercentage').get(function () {
  return Math.round((this.unitsCollected / this.unitsRequired) * 100);
});

// Auto-expire check
bloodRequestSchema.pre('save', function (next) {
  if (this.unitsCollected >= this.unitsRequired) {
    this.status = 'fulfilled';
  }
  next();
});

module.exports = mongoose.model('BloodRequest', bloodRequestSchema);
