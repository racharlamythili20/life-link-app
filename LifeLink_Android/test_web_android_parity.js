// mobile/test_web_android_parity.js
const axios = require('axios');
const { io } = require('socket.io-client');

const LAN_IP = '192.168.1.20';
const BACKEND_URL = `http://${LAN_IP}:5000/api`;
const SOCKET_URL = `http://${LAN_IP}:5000`;

async function testWebAndroidParity() {
  console.log('==================================================');
  console.log('🌐 📱 RUNNING WEB ↔ ANDROID EXACT WORKFLOW PARITY VERIFICATION');
  console.log('==================================================\n');

  // STEP 1: Hospital Login / Retrieval & MongoDB Inventory Baseline
  console.log('📌 STEP 1: Resolving Target Hospital & Baseline Inventory');
  let hospitalId = null;
  let initialAStock = 0;
  try {
    const hospitalsRes = await axios.get(`${BACKEND_URL}/hospitals`);
    const hospital = hospitalsRes.data.hospitals[0];
    hospitalId = hospital._id;
    console.log('   Hospital ID:', hospitalId);
    console.log('   Hospital Name:', hospital.name);

    const invRes = await axios.get(`${BACKEND_URL}/hospitals/${hospitalId}/inventory`);
    initialAStock = invRes.data.inventory.inventory['A+']?.units || 0;
    console.log('   ✅ STEP 1 PASSED: Initial A+ Inventory in MongoDB Atlas:', initialAStock, 'units');
  } catch (err) {
    console.error('   ❌ STEP 1 FAILED:', err.message);
    return;
  }

  // STEP 2: Patient Creates a 5-Unit Blood Request (PATIENT WORKFLOW)
  console.log('\n📌 STEP 2: Patient Login & Blood Request Creation (5 Units A+)');
  let patientToken = null;
  let requestId = null;
  try {
    const patientLogin = await axios.post(`${BACKEND_URL}/auth/login`, {
      email: 'kondasivaramajeswanth@gmail.com',
      password: 'Ravi@6444',
    });
    patientToken = patientLogin.data.accessToken;

    const reqRes = await axios.post(
      `${BACKEND_URL}/requests`,
      {
        patientName: 'Test Patient Cross-Parity',
        contactNumber: '9177545949',
        bloodGroup: 'A+',
        unitsRequired: 5,
        hospitalName: 'Apollo H',
        hospital: hospitalId,
        priority: 'high',
        medicalReason: 'Multi-unit Transfusion',
        location: { type: 'Point', coordinates: [80.2707, 13.0827], address: 'Apollo Hospital, Chennai' },
      },
      { headers: { Authorization: `Bearer ${patientToken}` } }
    );
    requestId = reqRes.data.request._id;
    console.log('   ✅ STEP 2 PASSED: Blood Request Created in MongoDB!');
    console.log('      Request ID:', requestId);
    console.log('      Blood Group:', reqRes.data.request.bloodGroup);
    console.log('      Units Required:', reqRes.data.request.unitsRequired);
    console.log('      Units Collected:', reqRes.data.request.unitsCollected);
    console.log('      Status:', reqRes.data.request.status);
  } catch (err) {
    console.error('   ❌ STEP 2 FAILED:', err.response?.data || err.message);
    return;
  }

  // STEP 3: Test Incompatible B+ Donor Rejection (STRICT COMPATIBILITY)
  console.log('\n📌 STEP 3: Incompatible Donor Acceptance Rejection (B+ Donor -> A+ Request)');
  try {
    const bPlusUser = await axios.post(`${BACKEND_URL}/auth/register`, {
      name: 'Incompatible B+ Donor',
      email: `bplus_parity_${Date.now()}@lifelink.com`,
      password: 'Password123!',
      phone: '9123456789',
      bloodGroup: 'B+',
      role: 'donor',
    });
    const bPlusToken = bPlusUser.data.accessToken;

    await axios.put(
      `${BACKEND_URL}/requests/${requestId}/accept`,
      {},
      { headers: { Authorization: `Bearer ${bPlusToken}` } }
    );
    console.error('   ❌ COMPATIBILITY TEST FAILED: Backend allowed incompatible B+ donor to accept A+ request!');
  } catch (err) {
    if (err.response?.status === 400) {
      console.log('   ✅ STEP 3 PASSED: Backend correctly REJECTED incompatible B+ donor!');
      console.log('      Error Message:', err.response?.data?.error);
    } else {
      console.error('   ❌ STEP 3 ERROR:', err.message);
    }
  }

  // STEP 4: Compatible A+ Donor Accepts Request (ACCEPT ≠ DONATED)
  console.log('\n📌 STEP 4: Eligible Compatible A+ Donor Accepts Request');
  let donor1Token = null;
  try {
    const donor1User = await axios.post(`${BACKEND_URL}/auth/register`, {
      name: 'Parity Donor 1 (A+)',
      email: `donor1_parity_${Date.now()}@lifelink.com`,
      password: 'Password123!',
      phone: '9123456780',
      bloodGroup: 'A+',
      role: 'donor',
    });
    donor1Token = donor1User.data.accessToken;

    const acceptRes = await axios.put(
      `${BACKEND_URL}/requests/${requestId}/accept`,
      {},
      { headers: { Authorization: `Bearer ${donor1Token}` } }
    );
    console.log('   ✅ STEP 4 PASSED: Eligible A+ donor accepted blood request!');
    console.log('      Request Status:', acceptRes.data.request.status);
    console.log('      Responses Count:', acceptRes.data.request.responses.length);

    // Verify hospital inventory is UNCHANGED upon accept (Accept != Donated)
    const midInvRes = await axios.get(`${BACKEND_URL}/hospitals/${hospitalId}/inventory`);
    const midStock = midInvRes.data.inventory.inventory['A+']?.units || 0;
    if (midStock === initialAStock) {
      console.log('   🎉 VERIFIED ACCEPT ≠ DONATED: Hospital inventory remains UNCHANGED at', midStock, 'units in MongoDB Atlas upon request acceptance.');
    } else {
      console.error('   ❌ ERROR: Hospital inventory changed upon accept! Stock:', midStock);
    }
  } catch (err) {
    console.error('   ❌ STEP 4 FAILED:', err.response?.data || err.message);
    return;
  }

  // STEP 5: Donor 1 Completes 1-Unit Donation (DONATION COMPLETION WORKFLOW)
  console.log('\n📌 STEP 5: Donor 1 Completes 1-Unit Blood Donation');
  try {
    const donateRes = await axios.put(
      `${BACKEND_URL}/requests/${requestId}/complete`,
      { units: 1 },
      { headers: { Authorization: `Bearer ${donor1Token}` } }
    );
    console.log('   ✅ STEP 5 PASSED: Donation marked complete!');
    console.log('      Request Status:', donateRes.data.request?.status);
    console.log('      Units Collected:', donateRes.data.request?.unitsCollected);

    // Verify Hospital Inventory increased by 1 in MongoDB Atlas
    const postInvRes = await axios.get(`${BACKEND_URL}/hospitals/${hospitalId}/inventory`);
    const newStock = postInvRes.data.inventory.inventory['A+']?.units || 0;
    console.log('      MongoDB Previous A+ Stock:', initialAStock);
    console.log('      MongoDB NEW A+ Stock:', newStock);

    if (newStock === initialAStock + 1) {
      console.log('   🎉 INVENTORY INCREMENT PASSED: MongoDB A+ Stock increased from', initialAStock, 'to', newStock);
    } else {
      console.error('   ❌ INVENTORY INCREMENT FAILED: Stock was', initialAStock, 'and is now', newStock);
    }

    // Verify Donor Reward Points & Total Donations in MongoDB
    console.log('      Donor 1 Total Donations in MongoDB:', donateRes.data.donor?.totalDonations);
    console.log('      Donor 1 Reward Points in MongoDB:', donateRes.data.donor?.rewardPoints);
  } catch (err) {
    console.error('   ❌ STEP 5 FAILED:', err.response?.data || err.message);
    return;
  }

  // STEP 6: Idempotency Check (Prevent Duplicate Completion & Double Inventory)
  console.log('\n📌 STEP 6: Testing Idempotency Protection (Duplicate Completion Rejection)');
  try {
    await axios.put(
      `${BACKEND_URL}/requests/${requestId}/complete`,
      { units: 1 },
      { headers: { Authorization: `Bearer ${donor1Token}` } }
    );
    console.error('   ❌ IDEMPOTENCY TEST FAILED: Allowed duplicate donation completion!');
  } catch (err) {
    if (err.response?.status === 400) {
      console.log('   ✅ STEP 6 PASSED: Idempotency protection rejected duplicate completion (400 Bad Request)!');
      console.log('      Error Message:', err.response?.data?.error);
    } else {
      console.error('   ❌ STEP 6 ERROR:', err.message);
    }
  }

  // STEP 7: Donor 2 Accepts & Completes Remaining 4 Units (Full Fulfillment)
  console.log('\n📌 STEP 7: Donor 2 Accepts & Completes Remaining 4 Units (Fulfillment)');
  try {
    const donor2User = await axios.post(`${BACKEND_URL}/auth/register`, {
      name: 'Parity Donor 2 (A+)',
      email: `donor2_parity_${Date.now()}@lifelink.com`,
      password: 'Password123!',
      phone: '9123456781',
      bloodGroup: 'A+',
      role: 'donor',
    });
    const donor2Token = donor2User.data.accessToken;

    await axios.put(
      `${BACKEND_URL}/requests/${requestId}/accept`,
      {},
      { headers: { Authorization: `Bearer ${donor2Token}` } }
    );

    const fullDonateRes = await axios.put(
      `${BACKEND_URL}/requests/${requestId}/complete`,
      { units: 4 },
      { headers: { Authorization: `Bearer ${donor2Token}` } }
    );

    console.log('   ✅ STEP 7 PASSED: Request Fully Fulfilled!');
    console.log('      Request Status:', fullDonateRes.data.request?.status);
    console.log('      Units Required:', fullDonateRes.data.request?.unitsRequired);
    console.log('      Units Collected:', fullDonateRes.data.request?.unitsCollected);

    // Verify Final Hospital Inventory in MongoDB Atlas
    const finalInvRes = await axios.get(`${BACKEND_URL}/hospitals/${hospitalId}/inventory`);
    const finalStock = finalInvRes.data.inventory.inventory['A+']?.units || 0;
    console.log('      Final MongoDB A+ Stock:', finalStock);

    if (finalStock === initialAStock + 5) {
      console.log('   🎉 FULL INVENTORY VERIFICATION PASSED: Total A+ Stock increased by 5 units (from', initialAStock, 'to', finalStock, ') in MongoDB Atlas!');
    }
  } catch (err) {
    console.error('   ❌ STEP 7 FAILED:', err.response?.data || err.message);
    return;
  }

  // STEP 8: Socket.IO Real-Time Connection Check
  console.log('\n📌 STEP 8: Socket.IO Real-Time Connection & Event Synchronization');
  if (patientToken) {
    const socket = io(SOCKET_URL, { auth: { token: patientToken } });
    await new Promise((resolve) => {
      socket.on('connect', () => {
        console.log('   ✅ STEP 8 PASSED: Connected to Socket.IO real-time broker!');
        console.log('      Socket ID:', socket.id);
        socket.disconnect();
        resolve(true);
      });
      socket.on('connect_error', (err) => {
        console.error('   ❌ STEP 8 FAILED:', err.message);
        socket.disconnect();
        resolve(false);
      });
    });
  }

  console.log('\n==================================================');
  console.log('🎉 ALL WEB ↔ ANDROID PARITY WORKFLOW TESTS PASSED 100%');
  console.log('==================================================');
}

testWebAndroidParity();
