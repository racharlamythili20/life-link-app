// src/models/User.js
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  // ─── Basic Info ───────────────────────────────────────
  name: {
    type: String,
    required: [true, 'Name is required'],
    trim: true,
    minlength: 2,
    maxlength: 50,
  },
  email: {
    type: String,
    required: [true, 'Email is required'],
    unique: true,
    lowercase: true,
    trim: true,
    match: [/^\S+@\S+\.\S+$/, 'Invalid email address'],
  },
  phone: {
    type: String,
    trim: true,
    match: [/^\+?[1-9]\d{9,14}$/, 'Invalid phone number'],
  },
  password: {
    type: String,
    minlength: 8,
    select: false,
  },
  profileImage: {
    type: String,
    default: '',
  },

  // ─── Role & Status ────────────────────────────────────
  role: {
    type: String,
    enum: ['donor', 'receiver', 'hospital', 'admin'],
    default: 'donor',
  },
  isVerified: { type: Boolean, default: false },
  isActive: { type: Boolean, default: true },
  isBlocked: { type: Boolean, default: false },
  blockedReason: { type: String },

  // ─── Donor Info ───────────────────────────────────────
  bloodGroup: {
    type: String,
    enum: ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'],
  },
  isAvailable: { type: Boolean, default: true },
  lastDonationDate: { type: Date },
  nextEligibleDate: { type: Date },
  totalDonations: { type: Number, default: 0 },
  rewardPoints: { type: Number, default: 0 },

  // ─── Location ─────────────────────────────────────────
  location: {
    type: {
      type: String,
      enum: ['Point'],
      default: 'Point',
    },
    coordinates: {
      type: [Number], // [longitude, latitude]
      default: [0, 0],
    },
    address: { type: String },
    city: { type: String },
    state: { type: String },
    country: { type: String, default: 'India' },
  },

  // ─── Health Info ─────────────────────────────────────
  age: { type: Number, min: 18, max: 65 },
  weight: { type: Number, min: 45 },
  hasChronicDisease: { type: Boolean, default: false },

  // ─── Auth ─────────────────────────────────────────────
  supabaseUid: { type: String, unique: true, sparse: true },
  firebaseUid: { type: String, unique: true, sparse: true },
  googleId: { type: String },
  refreshToken: { type: String, select: false },
  passwordResetToken: { type: String, select: false },
  passwordResetExpires: { type: Date, select: false },
  emailVerificationToken: { type: String, select: false },

  // ─── Notifications ────────────────────────────────────
  fcmTokens: [{ type: String }],
  notificationPreferences: {
    emergency: { type: Boolean, default: true },
    reminders: { type: Boolean, default: true },
    updates: { type: Boolean, default: true },
  },

  redemptions: [{
    hospital: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    hospitalName: String,
    treatmentName: String,
    pointsRedeemed: Number,
    discountAmount: Number,
    redeemedAt: { type: Date, default: Date.now }
  }],

  // ─── Badges & Achievements ────────────────────────────
  badges: [{
    name: String,
    icon: String,
    earnedAt: { type: Date, default: Date.now },
  }],

  // ─── Hospital Info (for hospital role) ────────────────
  hospitalInfo: {
    registrationNumber: String,
    isVerifiedHospital: { type: Boolean, default: false },
    bloodBankLicense: String,
  },

}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
});

// ─── Indexes ─────────────────────────────────────────────
userSchema.index({ location: '2dsphere' });
userSchema.index({ bloodGroup: 1, isAvailable: 1 });
userSchema.index({ role: 1, isActive: 1 });
userSchema.index({ email: 1 });

// ─── Virtuals ─────────────────────────────────────────────
userSchema.virtual('isEligibleToDonate').get(function () {
  if (!this.lastDonationDate) return true;
  const daysSince = (Date.now() - this.lastDonationDate) / (1000 * 60 * 60 * 24);
  return daysSince >= 90; // 3 months
});

// ─── Pre-save Hook ────────────────────────────────────────
userSchema.pre('save', async function (next) {
  if (this.phone) {
    this.phone = this.phone.replace(/\s+/g, '');
  }
  if (!this.isModified('password') || !this.password) return next();
  this.password = await bcrypt.hash(this.password, 12);
  next();
});

// ─── Methods ──────────────────────────────────────────────
userSchema.methods.comparePassword = async function (candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

userSchema.methods.toSafeObject = function () {
  const obj = this.toObject();
  delete obj.password;
  delete obj.refreshToken;
  delete obj.passwordResetToken;
  delete obj.emailVerificationToken;
  return obj;
};

module.exports = mongoose.model('User', userSchema);
