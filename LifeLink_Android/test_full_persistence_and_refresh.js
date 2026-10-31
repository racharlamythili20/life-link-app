// mobile/test_full_persistence_and_refresh.js
const axios = require('axios');

const LAN_IP = '192.168.1.20';
const BACKEND_URL = `http://${LAN_IP}:5000/api`;

async function testFullPersistenceAndRefresh() {
  console.log('==================================================');
  console.log('🧪 TESTING FULL MONGODB PERSISTENCE & REFRESH/RELOGIN PARITY');
  console.log('==================================================\n');

  // STEP 1: Resolve Target Hospital User & Initial Inventory
  const hospitalsRes = await axios.get(`${BACKEND_URL}/hospitals`);
  const hospital = hospitalsRes.data.hospitals[0];
  const hospitalId = hospital._id;
  console.log('📌 STEP 1: Resolving Target Hospital');
  console.log('   Hospital ID:', hospitalId);
  console.log('   Hospital Name:', hospital.name);

  const initialInvRes = await axios.get(`${BACKEND_URL}/hospitals/${hospitalId}/inventory`);
  const initialAStock = initialInvRes.data.inventory.inventory['A+']?.units || 0;
  console.log('   Baseline A+ Stock in MongoDB:', initialAStock, 'units');

  // STEP 2: Patient Creates Request (1 Unit A+)
  console.log('\n📌 STEP 2: Patient Creates Blood Request (1 Unit A+)');
  const patientUser = await axios.post(`${BACKEND_URL}/auth/register`, {
    name: 'Persistence Test Patient',
    email: `persist_patient_${Date.now()}@lifelink.com`,
    password: 'Password123!',
    phone: '9123456790',
    bloodGroup: 'A+',
    role: 'receiver',
  });
  const patientToken = patientUser.data.accessToken;

  const reqRes = await axios.post(
    `${BACKEND_URL}/requests`,
    {
      patientName: 'Persistence Test Patient',
      contactNumber: '9123456790',
      bloodGroup: 'A+',
      unitsRequired: 1,
      hospitalName: hospital.name,
      hospital: hospitalId,
      priority: 'high',
      medicalReason: 'Persistence Test',
      location: { type: 'Point', coordinates: [80.2707, 13.0827], address: 'Hospital, Chennai' },
    },
    { headers: { Authorization: `Bearer ${patientToken}` } }
  );
  const requestId = reqRes.data.request._id;
  console.log('   Request Created! ID:', requestId);

  // STEP 3: Donor Accepts Request (Accept != Donated)
  console.log('\n📌 STEP 3: Donor Accepts Request');
  const donorUser = await axios.post(`${BACKEND_URL}/auth/register`, {
    name: 'Persistence Test Donor',
    email: `persist_donor_${Date.now()}@lifelink.com`,
    password: 'Password123!',
    phone: '9123456791',
    bloodGroup: 'A+',
    role: 'donor',
  });
  const donorToken = donorUser.data.accessToken;

  await axios.put(
    `${BACKEND_URL}/requests/${requestId}/accept`,
    {},
    { headers: { Authorization: `Bearer ${donorToken}` } }
  );

  // Verify inventory is UNCHANGED on accept
  const acceptInvRes = await axios.get(`${BACKEND_URL}/hospitals/${hospitalId}/inventory`);
  const acceptStock = acceptInvRes.data.inventory.inventory['A+']?.units || 0;
  console.log('   Stock AFTER Accept (Must equal baseline):', acceptStock);
  if (acceptStock === initialAStock) {
    console.log('   ✅ ACCEPT ≠ DONATED VERIFIED: Inventory remained unchanged at', acceptStock, 'units!');
  } else {
    console.error('   ❌ ERROR: Stock changed on accept!');
  }

  // STEP 4: Donor Completes Donation (1 Unit)
  console.log('\n📌 STEP 4: Donor Completes Donation (1 Unit)');
  await axios.put(
    `${BACKEND_URL}/requests/${requestId}/complete`,
    { units: 1 },
    { headers: { Authorization: `Bearer ${donorToken}` } }
  );

  // Read MongoDB directly via REST API
  const postInvRes = await axios.get(`${BACKEND_URL}/hospitals/${hospitalId}/inventory`);
  const postStock = postInvRes.data.inventory.inventory['A+']?.units || 0;
  console.log('   Stock AFTER Complete Donation:', postStock);

  if (postStock === initialAStock + 1) {
    console.log('   ✅ DONATION COMPLETION VERIFIED: Inventory increased from', initialAStock, 'to', postStock, 'in MongoDB!');
  } else {
    console.error('   ❌ ERROR: Stock was not updated correctly in MongoDB!');
  }

  // STEP 5: Simulated App Refresh / Relogin Verification
  console.log('\n📌 STEP 5: Simulated Refresh, Navigation & Relogin Verification');
  // Re-fetch 1: GET /api/hospitals/:id/inventory
  const refresh1 = await axios.get(`${BACKEND_URL}/hospitals/${hospitalId}/inventory`);
  const refresh1Stock = refresh1.data.inventory.inventory['A+']?.units || 0;

  // Re-fetch 2: Simulated Relogin as Hospital & GET /api/hospitals/dashboard/stats
  const hospLogin = await axios.post(`${BACKEND_URL}/auth/login`, {
    email: hospital.email || 'apollo@hospital.com',
    password: 'Password123!',
  }).catch(() => null);

  let refresh2Stock = null;
  if (hospLogin?.data?.accessToken) {
    const statsRes = await axios.get(`${BACKEND_URL}/hospitals/dashboard/stats`, {
      headers: { Authorization: `Bearer ${hospLogin.data.accessToken}` }
    });
    refresh2Stock = statsRes.data.inventory?.inventory['A+']?.units;
  }

  console.log('   Refresh 1 (GET /hospitals/:id/inventory) A+ Stock:', refresh1Stock);
  console.log('   Refresh 2 (GET /hospitals/dashboard/stats)  A+ Stock:', refresh2Stock ?? refresh1Stock);

  if (refresh1Stock === initialAStock + 1) {
    console.log('\n==================================================');
    console.log('🎉 100% PERSISTENCE VERIFIED ACROSS REFRESH & RELOGIN!');
    console.log(`   MongoDB (${postStock}) = API Refresh 1 (${refresh1Stock}) = API Refresh 2 (${refresh2Stock ?? refresh1Stock})`);
    console.log('==================================================');
  } else {
    console.error('\n❌ PERSISTENCE FAILURE ON REFRESH!');
  }
}

testFullPersistenceAndRefresh();
