// backend/src/utils/seed.js
// Run: node src/utils/seed.js
require('dotenv').config();
const dns = require('dns');

// Set DNS servers to Google's public DNS to resolve Atlas SRV lookup issues
dns.setServers(['8.8.8.8', '8.8.4.4']);

const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const User = require('../models/User');
const BloodRequest = require('../models/BloodRequest');
const BloodInventory = require('../models/BloodInventory');

const BLOOD_GROUPS = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];

// Indian cities coordinates
const CITIES = [
  { city: 'Chennai', lat: 13.0827, lng: 80.2707 },
  { city: 'Mumbai', lat: 19.0760, lng: 72.8777 },
  { city: 'Delhi', lat: 28.6139, lng: 77.2090 },
  { city: 'Bangalore', lat: 12.9716, lng: 77.5946 },
  { city: 'Hyderabad', lat: 17.3850, lng: 78.4867 },
  { city: 'Pune', lat: 18.5204, lng: 73.8567 },
  { city: 'Kolkata', lat: 22.5726, lng: 88.3639 },
  { city: 'Ahmedabad', lat: 23.0225, lng: 72.5714 },
];

const randomFrom = (arr) => arr[Math.floor(Math.random() * arr.length)];
const randomInt = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
const randomCoord = (base, range = 0.05) => base + (Math.random() - 0.5) * range * 2;

async function seed() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    // Clear existing data (optional — comment out to keep existing)
    await Promise.all([
      User.deleteMany({ email: { $regex: /@seed\.lifelink\.com$/ } }),
    ]);
    console.log('🗑  Cleared seed data');

    const createdUsers = [];

    // ─── Create Admin ────────────────────────────────────────
    const admin = await User.findOneAndUpdate(
      { email: 'admin@lifelink.com' },
      {
        name: 'LifeLink Admin',
        email: 'admin@lifelink.com',
        password: await bcrypt.hash('Admin@1234', 12),
        role: 'admin',
        isVerified: true,
        isActive: true,
        location: { type: 'Point', coordinates: [80.2707, 13.0827], city: 'Chennai' },
      },
      { upsert: true, new: true }
    );
    console.log('👤 Admin created:', admin.email);

    // ─── Create Hospitals ────────────────────────────────────
    const hospitals = [];
    const hospitalNames = [
      'Apollo Hospital', 'Fortis Hospital', 'AIIMS', 'Manipal Hospital',
      'Max Healthcare', 'Narayana Health', 'Aster CMI', 'Medanta Hospital',
    ];

    for (let i = 0; i < hospitalNames.length; i++) {
      const city = CITIES[i % CITIES.length];
      const hospital = await User.findOneAndUpdate(
        { email: `${hospitalNames[i].toLowerCase().replace(/\s+/g, '.')}@seed.lifelink.com` },
        {
          name: hospitalNames[i],
          email: `${hospitalNames[i].toLowerCase().replace(/\s+/g, '.')}@seed.lifelink.com`,
          password: await bcrypt.hash('Hospital@123', 12),
          role: 'hospital',
          isVerified: true,
          isActive: true,
          phone: `+91 ${randomInt(7000000000, 9999999999)}`,
          location: {
            type: 'Point',
            coordinates: [randomCoord(city.lng), randomCoord(city.lat)],
            address: `${hospitalNames[i]}, ${city.city}`,
            city: city.city,
          },
          hospitalInfo: {
            registrationNumber: `HOS${randomInt(10000, 99999)}`,
            isVerifiedHospital: true,
            bloodBankLicense: `BBL${randomInt(10000, 99999)}`,
          },
        },
        { upsert: true, new: true }
      );
      hospitals.push(hospital);

      // Create blood inventory for hospital
      await BloodInventory.findOneAndUpdate(
        { hospital: hospital._id },
        {
          hospital: hospital._id,
          inventory: Object.fromEntries(
            BLOOD_GROUPS.map(bg => [bg, { units: randomInt(0, 30), lastUpdated: new Date() }])
          ),
        },
        { upsert: true }
      );
    }
    console.log(`🏥 Created ${hospitals.length} hospitals`);

    // ─── Create Donors ────────────────────────────────────────
    const donorNames = [
      'Arjun Sharma', 'Priya Patel', 'Rahul Kumar', 'Sneha Reddy', 'Vikram Singh',
      'Ananya Das', 'Karthik Nair', 'Meera Joshi', 'Rohan Gupta', 'Divya Menon',
      'Suresh Babu', 'Lakshmi Rao', 'Mohammed Ali', 'Pooja Verma', 'Arun Thomas',
      'Kavita Iyer', 'Deepak Chatterjee', 'Sunita Malhotra', 'Ravi Krishnan', 'Nisha Pandey',
      'Ajay Bose', 'Shalini Agarwal', 'Manoj Tiwari', 'Rekha Nayak', 'Sunil Pillai',
    ];

    const donors = [];
    for (let i = 0; i < donorNames.length; i++) {
      const city = CITIES[i % CITIES.length];
      const bloodGroup = BLOOD_GROUPS[i % BLOOD_GROUPS.length];
      const totalDonations = randomInt(0, 25);

      const badges = [];
      if (totalDonations >= 1) badges.push({ name: 'First Drop', icon: '🩸' });
      if (totalDonations >= 5) badges.push({ name: 'Life Saver', icon: '💉' });
      if (totalDonations >= 10) badges.push({ name: 'Hero', icon: '🏆' });
      if (totalDonations >= 20) badges.push({ name: 'Legend', icon: '⭐' });

      const donor = await User.findOneAndUpdate(
        { email: `${donorNames[i].toLowerCase().replace(/\s+/g, '.')}@seed.lifelink.com` },
        {
          name: donorNames[i],
          email: `${donorNames[i].toLowerCase().replace(/\s+/g, '.')}@seed.lifelink.com`,
          password: await bcrypt.hash('Donor@123', 12),
          role: 'donor',
          bloodGroup,
          isVerified: Math.random() > 0.3,
          isActive: true,
          isAvailable: Math.random() > 0.4,
          age: randomInt(18, 55),
          weight: randomInt(50, 90),
          totalDonations,
          rewardPoints: totalDonations * 100 + randomInt(0, 50),
          badges,
          phone: `+91 ${randomInt(7000000000, 9999999999)}`,
          location: {
            type: 'Point',
            coordinates: [randomCoord(city.lng, 0.08), randomCoord(city.lat, 0.08)],
            address: `${city.city}, India`,
            city: city.city,
          },
          lastDonationDate: totalDonations > 0
            ? new Date(Date.now() - randomInt(30, 200) * 24 * 60 * 60 * 1000)
            : undefined,
        },
        { upsert: true, new: true }
      );
      donors.push(donor);
      createdUsers.push(donor);
    }
    console.log(`🩸 Created ${donors.length} donors`);

    // ─── Create Blood Requests ────────────────────────────────
    const priorities = ['critical', 'high', 'medium', 'low'];
    const reasons = [
      'Emergency surgery', 'Road accident', 'Cancer treatment', 'Dengue hemorrhagic fever',
      'Thalassemia', 'Liver transplant', 'Childbirth complications', 'Dialysis', 'Trauma',
    ];

    const requests = [];
    for (let i = 0; i < 20; i++) {
      const city = CITIES[i % CITIES.length];
      const hospital = hospitals[i % hospitals.length];
      const requester = donors[i % donors.length];
      const priority = priorities[i % 4];

      const req = await BloodRequest.create({
        requestedBy: requester._id,
        patientName: `Patient ${randomInt(100, 999)}`,
        patientAge: randomInt(5, 75),
        contactNumber: `+91 ${randomInt(7000000000, 9999999999)}`,
        bloodGroup: BLOOD_GROUPS[i % BLOOD_GROUPS.length],
        unitsRequired: randomInt(1, 5),
        unitsCollected: 0,
        hospitalName: hospital.name,
        hospital: hospital._id,
        location: {
          type: 'Point',
          coordinates: [randomCoord(city.lng, 0.05), randomCoord(city.lat, 0.05)],
          address: `${hospital.name}, ${city.city}`,
        },
        priority,
        status: i < 15 ? 'active' : 'fulfilled',
        medicalReason: randomFrom(reasons),
        isEmergency: priority === 'critical',
        urgencyScore: priority === 'critical' ? randomInt(80, 100) : randomInt(20, 79),
        expiresAt: new Date(Date.now() + randomInt(6, 48) * 60 * 60 * 1000),
        broadcastRadius: priority === 'critical' ? 20 : 10,
      });
      requests.push(req);
    }
    console.log(`📋 Created ${requests.length} blood requests`);

    // ─── Summary ──────────────────────────────────────────────
    console.log('\n✨ Seed complete! Summary:');
    console.log(`  Admin:     admin@lifelink.com / Admin@1234`);
    console.log(`  Hospitals: ${hospitalNames[0].toLowerCase().replace(/\s+/g, '.')}@seed.lifelink.com / Hospital@123`);
    console.log(`  Donors:    arjun.sharma@seed.lifelink.com / Donor@123`);
    console.log(`\n  Total users: ${1 + hospitals.length + donors.length}`);
    console.log(`  Total requests: ${requests.length}`);

    process.exit(0);
  } catch (err) {
    console.error('❌ Seed failed:', err);
    process.exit(1);
  }
}

seed();
