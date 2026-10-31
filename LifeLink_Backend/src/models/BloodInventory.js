// src/models/BloodInventory.js
const mongoose = require('mongoose');

const bloodInventorySchema = new mongoose.Schema({
  hospital: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true,
  },
  inventory: {
    'A+':  { units: { type: Number, default: 0 }, lastUpdated: Date },
    'A-':  { units: { type: Number, default: 0 }, lastUpdated: Date },
    'B+':  { units: { type: Number, default: 0 }, lastUpdated: Date },
    'B-':  { units: { type: Number, default: 0 }, lastUpdated: Date },
    'AB+': { units: { type: Number, default: 0 }, lastUpdated: Date },
    'AB-': { units: { type: Number, default: 0 }, lastUpdated: Date },
    'O+':  { units: { type: Number, default: 0 }, lastUpdated: Date },
    'O-':  { units: { type: Number, default: 0 }, lastUpdated: Date },
  },
  totalUnits: { type: Number, default: 0 },
  criticalGroups: [{ type: String }], // groups with < 5 units
  history: [{
    bloodGroup: String,
    action: { type: String, enum: ['added', 'used', 'expired'] },
    units: Number,
    performedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    reason: String,
    timestamp: { type: Date, default: Date.now },
  }],
  alerts: [{
    bloodGroup: String,
    message: String,
    severity: { type: String, enum: ['low', 'medium', 'critical'] },
    createdAt: { type: Date, default: Date.now },
    isRead: { type: Boolean, default: false },
  }],
}, { timestamps: true });

// Update totalUnits and criticalGroups before save
bloodInventorySchema.pre('save', function (next) {
  let total = 0;
  const critical = [];
  const groups = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];

  groups.forEach(g => {
    const units = this.inventory[g]?.units || 0;
    total += units;
    if (units < 5) critical.push(g);
  });

  this.totalUnits = total;
  this.criticalGroups = critical;
  next();
});

module.exports = mongoose.model('BloodInventory', bloodInventorySchema);
