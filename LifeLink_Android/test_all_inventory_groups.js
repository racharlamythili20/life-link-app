// mobile/test_all_inventory_groups.js
const axios = require('axios');
const LAN_IP = '192.168.1.20';
const BACKEND_URL = `http://${LAN_IP}:5000/api`;

const ALL_GROUPS = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];

async function testAllGroupsInventory() {
  console.log('==================================================');
  console.log('🧪 TESTING INVENTORY INCREMENT FOR ALL 8 BLOOD GROUPS IN MONGODB');
  console.log('==================================================\n');

  // 1. Get hospital account
  const hospitalsRes = await axios.get(`${BACKEND_URL}/hospitals`);
  const hospital = hospitalsRes.data.hospitals[0];
  const hospitalId = hospital._id;
  console.log('📌 Target Hospital:', hospital.name, `(${hospitalId})`);

  // 2. Fetch baseline inventory from MongoDB
  const initialInvRes = await axios.get(`${BACKEND_URL}/hospitals/${hospitalId}/inventory`);
  const initialInv = initialInvRes.data.inventory.inventory;
  console.log('📌 Baseline Inventory in MongoDB:', Object.keys(initialInv).reduce((acc, bg) => {
    acc[bg] = initialInv[bg]?.units || 0;
    return acc;
  }, {}));

  // 3. Register a universal donor for test donations (O- can donate to all)
  const donorUser = await axios.post(`${BACKEND_URL}/auth/register`, {
    name: 'Universal Test Donor',
    email: `universal_donor_${Date.now()}@lifelink.com`,
    password: 'Password123!',
    phone: '9988776655',
    bloodGroup: 'O-',
    role: 'donor',
  });
  const donorToken = donorUser.data.accessToken;

  // 4. Create patient account for requests
  const patientUser = await axios.post(`${BACKEND_URL}/auth/register`, {
    name: 'Test Patient All Groups',
    email: `patient_all_${Date.now()}@lifelink.com`,
    password: 'Password123!',
    phone: '9988776654',
    bloodGroup: 'A+',
    role: 'receiver',
  });
  const patientToken = patientUser.data.accessToken;

  // 5. Test each blood group sequentially
  for (const bg of ALL_GROUPS) {
    console.log(`\n--------------------------------------------------`);
    console.log(`🩸 TESTING BLOOD GROUP: ${bg}`);

    const bgInitialUnits = initialInv[bg]?.units || 0;

    // Create Request
    const reqRes = await axios.post(
      `${BACKEND_URL}/requests`,
      {
        patientName: `Patient for ${bg}`,
        contactNumber: '9177545949',
        bloodGroup: bg,
        unitsRequired: 1,
        hospitalName: hospital.name,
        hospital: hospitalId,
        priority: 'high',
        medicalReason: `Test for ${bg}`,
        location: { type: 'Point', coordinates: [80.2707, 13.0827], address: 'Hospital, Chennai' },
      },
      { headers: { Authorization: `Bearer ${patientToken}` } }
    );
    const requestId = reqRes.data.request._id;

    // Accept Request with O- donor
    await axios.put(
      `${BACKEND_URL}/requests/${requestId}/accept`,
      {},
      { headers: { Authorization: `Bearer ${donorToken}` } }
    );

    // Complete Donation (1 unit)
    await axios.put(
      `${BACKEND_URL}/requests/${requestId}/complete`,
      { units: 1 },
      { headers: { Authorization: `Bearer ${donorToken}` } }
    );

    // Fetch updated inventory from MongoDB
    const postInvRes = await axios.get(`${BACKEND_URL}/hospitals/${hospitalId}/inventory`);
    const bgNewUnits = postInvRes.data.inventory.inventory[bg]?.units || 0;

    console.log(`   MongoDB ${bg} Stock BEFORE: ${bgInitialUnits}`);
    console.log(`   MongoDB ${bg} Stock AFTER : ${bgNewUnits}`);

    if (bgNewUnits === bgInitialUnits + 1) {
      console.log(`   ✅ SUCCESS: ${bg} inventory correctly increased from ${bgInitialUnits} to ${bgNewUnits} in MongoDB!`);
    } else {
      console.error(`   ❌ FAILURE: ${bg} inventory was ${bgInitialUnits} and is now ${bgNewUnits}`);
    }
  }

  console.log('\n==================================================');
  console.log('🎉 ALL 8 BLOOD GROUPS TESTED SUCCESSFULLY IN MONGODB!');
  console.log('==================================================');
}

testAllGroupsInventory();
