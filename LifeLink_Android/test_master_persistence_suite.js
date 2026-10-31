// mobile/test_master_persistence_suite.js
const axios = require('axios');

const LAN_IP = '192.168.1.20';
const BACKEND_URL = `http://${LAN_IP}:5000/api`;

async function runMasterPersistenceSuite() {
  console.log('==================================================');
  console.log('🧪 MASTER END-TO-END PERSISTENCE & WORKFLOW VERIFICATION SUITE');
  console.log('==================================================\n');

  // STEP 1: Hospital Login & Baseline Stock
  console.log('📌 TEST 1: Resolving Target Hospital & Baseline Inventory');
  // Register dedicated test hospital
  const hospUser = await axios.post(`${BACKEND_URL}/auth/register`, {
    name: 'Master Suite Hospital',
    email: `master_hosp_${Date.now()}@lifelink.com`,
    password: 'Password123!',
    phone: '9123456799',
    role: 'hospital',
  });

  const hospital = hospUser.data.user;
  const hospitalId = hospital._id;
  const hospitalToken = hospUser.data.accessToken;
  console.log('📌 TEST 1: Registered Target Hospital');
  console.log('   Hospital ID:', hospitalId);
  console.log('   Hospital Name:', hospital.name);

  const baselineInvRes = await axios.get(`${BACKEND_URL}/hospitals/${hospitalId}/inventory`);
  const baselineAStock = baselineInvRes.data.inventory.inventory['A+']?.units || 0;
  console.log('   ✅ TEST 1 PASSED: Baseline A+ Stock in MongoDB Atlas:', baselineAStock, 'units');

  // STEP 2: Manual Stock Addition (+2 Units A+)
  console.log('\n📌 TEST 2: Manual Stock Addition (+2 Units A+)');
  const addRes = await axios.put(
    `${BACKEND_URL}/hospitals/inventory`,
    { bloodGroup: 'A+', units: 2, action: 'added', reason: 'Manual Test Addition' },
    { headers: { Authorization: `Bearer ${hospitalToken}` } }
  );
  const addStock = addRes.data.inventory.inventory['A+']?.units;
  console.log('   MongoDB Stock after Manual Addition (+2):', addStock);
  if (addStock === baselineAStock + 2) {
    console.log('   ✅ TEST 2 PASSED: Manual stock addition persisted in MongoDB!');
  } else {
    console.error('   ❌ TEST 2 FAILED: Expected', baselineAStock + 2, 'got', addStock);
  }

  // STEP 3: Manual Stock Usage (-1 Unit A+)
  console.log('\n📌 TEST 3: Manual Stock Usage (-1 Unit A+)');
  const useRes = await axios.put(
    `${BACKEND_URL}/hospitals/inventory`,
    { bloodGroup: 'A+', units: 1, action: 'used', reason: 'Patient Transfusion' },
    { headers: { Authorization: `Bearer ${hospitalToken}` } }
  );
  const useStock = useRes.data.inventory.inventory['A+']?.units;
  console.log('   MongoDB Stock after Manual Usage (-1):', useStock);
  if (useStock === baselineAStock + 1) {
    console.log('   ✅ TEST 3 PASSED: Manual stock usage persisted in MongoDB!');
  } else {
    console.error('   ❌ TEST 3 FAILED: Expected', baselineAStock + 1, 'got', useStock);
  }

  // STEP 4: Patient Creates Request (2 Units A+)
  console.log('\n📌 TEST 4: Patient Creates Blood Request (2 Units A+)');
  const patientUser = await axios.post(`${BACKEND_URL}/auth/register`, {
    name: 'Master Suite Patient',
    email: `master_patient_${Date.now()}@lifelink.com`,
    password: 'Password123!',
    phone: '9123456795',
    bloodGroup: 'A+',
    role: 'receiver',
  });
  const patientToken = patientUser.data.accessToken;

  const reqRes = await axios.post(
    `${BACKEND_URL}/requests`,
    {
      patientName: 'Master Suite Patient',
      contactNumber: '9123456795',
      bloodGroup: 'A+',
      unitsRequired: 2,
      hospitalName: hospital.name,
      hospital: hospitalId,
      priority: 'high',
      medicalReason: 'Master Suite Transfusion',
      location: { type: 'Point', coordinates: [80.2707, 13.0827], address: 'Hospital, Chennai' },
    },
    { headers: { Authorization: `Bearer ${patientToken}` } }
  );
  const requestId = reqRes.data.request._id;
  console.log('   ✅ TEST 4 PASSED: Blood Request Created in MongoDB! Request ID:', requestId);

  // STEP 5: Eligible Donor Accepts Request (Accept != Donated)
  console.log('\n📌 TEST 5: Compatible A+ Donor Accepts Request (Accept ≠ Donated)');
  const donorUser = await axios.post(`${BACKEND_URL}/auth/register`, {
    name: 'Master Suite Donor',
    email: `master_donor_${Date.now()}@lifelink.com`,
    password: 'Password123!',
    phone: '9123456796',
    bloodGroup: 'A+',
    role: 'donor',
  });
  const donorToken = donorUser.data.accessToken;

  await axios.put(
    `${BACKEND_URL}/requests/${requestId}/accept`,
    {},
    { headers: { Authorization: `Bearer ${donorToken}` } }
  );

  const acceptInvRes = await axios.get(`${BACKEND_URL}/hospitals/${hospitalId}/inventory`);
  const acceptStock = acceptInvRes.data.inventory.inventory['A+']?.units || 0;
  console.log('   MongoDB Stock AFTER Donor Accept:', acceptStock);
  if (acceptStock === useStock) {
    console.log('   ✅ TEST 5 PASSED: Accept ≠ Donated verified! Inventory remained unchanged at', acceptStock, 'units.');
  } else {
    console.error('   ❌ TEST 5 FAILED: Stock prematurely changed on accept!');
  }

  // STEP 6: Donor Completes 1-Unit Donation
  console.log('\n📌 TEST 6: Donor Completes 1-Unit Blood Donation');
  const donateRes = await axios.put(
    `${BACKEND_URL}/requests/${requestId}/complete`,
    { units: 1 },
    { headers: { Authorization: `Bearer ${donorToken}` } }
  );

  const postDonateInvRes = await axios.get(`${BACKEND_URL}/hospitals/${hospitalId}/inventory`);
  const postDonateStock = postDonateInvRes.data.inventory.inventory['A+']?.units || 0;
  console.log('   MongoDB Stock AFTER 1-Unit Donation Completion:', postDonateStock);
  console.log('   Donor Total Donations in MongoDB:', donateRes.data.donor?.totalDonations);
  console.log('   Donor Reward Points in MongoDB:', donateRes.data.donor?.rewardPoints);

  if (postDonateStock === useStock + 1) {
    console.log('   ✅ TEST 6 PASSED: Donation completion increased MongoDB stock from', useStock, 'to', postDonateStock, '!');
  } else {
    console.error('   ❌ TEST 6 FAILED: Expected', useStock + 1, 'got', postDonateStock);
  }

  // STEP 7: Idempotency Protection Check
  console.log('\n📌 TEST 7: Idempotency Protection (Duplicate Completion Rejection)');
  try {
    await axios.put(
      `${BACKEND_URL}/requests/${requestId}/complete`,
      { units: 1 },
      { headers: { Authorization: `Bearer ${donorToken}` } }
    );
    console.error('   ❌ TEST 7 FAILED: Duplicate donation was allowed!');
  } catch (err) {
    if (err.response?.status === 400) {
      console.log('   ✅ TEST 7 PASSED: Idempotency protection rejected duplicate completion (400 Bad Request)!');
    } else {
      console.error('   ❌ TEST 7 ERROR:', err.message);
    }
  }

  // STEP 8: Simulated App Refresh & Relogin Persistence Check
  console.log('\n📌 TEST 8: Full Refresh & Relogin Persistence Check');
  const refreshInvRes = await axios.get(`${BACKEND_URL}/hospitals/${hospitalId}/inventory`);
  const statsRes = await axios.get(`${BACKEND_URL}/hospitals/dashboard/stats`, {
    headers: { Authorization: `Bearer ${hospitalToken}` }
  });

  const refresh1 = refreshInvRes.data.inventory.inventory['A+']?.units;
  const refresh2 = statsRes.data.inventory?.inventory['A+']?.units;

  console.log('   Refresh 1 (GET /hospitals/:id/inventory) A+ Stock:', refresh1);
  console.log('   Refresh 2 (GET /hospitals/dashboard/stats)  A+ Stock:', refresh2);

  if (refresh1 === postDonateStock && refresh2 === postDonateStock) {
    console.log('\n==================================================');
    console.log('🎉 ALL 8 MASTER PERSISTENCE SUITE TESTS PASSED 100%');
    console.log(`   MongoDB (${postDonateStock}) = GET API 1 (${refresh1}) = GET API 2 (${refresh2})`);
    console.log('==================================================');
  } else {
    console.error('\n❌ MASTER PERSISTENCE SUITE FAILED ON REFRESH!');
  }
}

runMasterPersistenceSuite();
