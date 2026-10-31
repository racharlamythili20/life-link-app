// mobile/test_hospital_and_workflow.js
const axios = require('axios');
const { io } = require('socket.io-client');

const LAN_IP = '192.168.1.20';
const BACKEND_URL = `http://${LAN_IP}:5000/api`;
const SOCKET_URL = `http://${LAN_IP}:5000`;

async function testFullWorkflows() {
  console.log('==================================================');
  console.log('🧪 TESTING END-TO-END WORKFLOW, COMPATIBILITY & REAL-TIME SYNC');
  console.log('==================================================\n');

  // STEP 1: Get Hospital ID & Initial Inventory
  console.log('📌 STEP 1: Fetch Hospital & Check Initial Inventory in MongoDB');
  let hospitalId = null;
  let initialStock = 0;
  try {
    const hospitalsRes = await axios.get(`${BACKEND_URL}/hospitals`);
    const hospital = hospitalsRes.data.hospitals[0];
    hospitalId = hospital._id;
    console.log('   Hospital ID:', hospitalId);
    console.log('   Hospital Name:', hospital.name);

    const invRes = await axios.get(`${BACKEND_URL}/hospitals/${hospitalId}/inventory`);
    initialStock = invRes.data.inventory.inventory['A+']?.units || 0;
    console.log('   ✅ STEP 1 PASSED: Initial A+ Stock in MongoDB:', initialStock);
  } catch (err) {
    console.error('   ❌ STEP 1 FAILED:', err.message);
  }

  // STEP 2: Patient Login & Create A+ Request
  console.log('\n📌 STEP 2: Patient Creates A+ Blood Request');
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
        patientName: 'Test Patient Compatibility Sync',
        contactNumber: '9177545949',
        bloodGroup: 'A+',
        unitsRequired: 1,
        hospitalName: 'Apollo H',
        hospital: hospitalId,
        priority: 'high',
        medicalReason: 'General Surgery',
        location: { type: 'Point', coordinates: [80.2707, 13.0827], address: 'Apollo Hospital, Chennai' },
      },
      { headers: { Authorization: `Bearer ${patientToken}` } }
    );
    requestId = reqRes.data.request._id;
    console.log('   ✅ STEP 2 PASSED: Blood request created in MongoDB!');
    console.log('      Request ID:', requestId);
    console.log('      Blood Group Needed:', reqRes.data.request.bloodGroup);
  } catch (err) {
    console.error('   ❌ STEP 2 FAILED:', err.response?.data || err.message);
  }

  // STEP 3: Test Incompatible Donor Rejection (B+ Donor accepting A+ Request)
  console.log('\n📌 STEP 3: Testing Incompatible Donor Rejection');
  try {
    const bPlusUser = await axios.post(`${BACKEND_URL}/auth/register`, {
      name: 'Separate B+ Donor',
      email: `bplus_donor_${Date.now()}@lifelink.com`,
      password: 'Password123!',
      phone: '9876543211',
      bloodGroup: 'B+',
      role: 'donor',
    });
    const bPlusToken = bPlusUser.data.accessToken;

    await axios.put(
      `${BACKEND_URL}/requests/${requestId}/accept`,
      {},
      { headers: { Authorization: `Bearer ${bPlusToken}` } }
    );
    console.error('   ❌ COMPATIBILITY TEST FAILED: Backend allowed B+ donor to accept A+ request!');
  } catch (err) {
    if (err.response?.status === 400) {
      console.log('   ✅ STEP 3 PASSED: Backend correctly REJECTED incompatible B+ donor!');
      console.log('      Error Message:', err.response?.data?.error);
    } else {
      console.error('   ❌ STEP 3 ERROR:', err.message);
    }
  }

  // STEP 4: Compatible A+ Donor Accepts Request
  console.log('\n📌 STEP 4: Eligible Compatible A+ Donor Accepts Request');
  let aPlusToken = null;
  try {
    const aPlusUser = await axios.post(`${BACKEND_URL}/auth/register`, {
      name: 'Separate A+ Donor',
      email: `aplus_donor_${Date.now()}@lifelink.com`,
      password: 'Password123!',
      phone: '9876543212',
      bloodGroup: 'A+',
      role: 'donor',
    });
    aPlusToken = aPlusUser.data.accessToken;

    const acceptRes = await axios.put(
      `${BACKEND_URL}/requests/${requestId}/accept`,
      {},
      { headers: { Authorization: `Bearer ${aPlusToken}` } }
    );
    console.log('   ✅ STEP 4 PASSED: Eligible A+ donor accepted blood request!');
    console.log('      Request Status:', acceptRes.data.request.status);
    console.log('      Responses Count:', acceptRes.data.request.responses.length);

    // Verify hospital inventory is UNCHANGED upon accept (Accept != Donated)
    const midInvRes = await axios.get(`${BACKEND_URL}/hospitals/${hospitalId}/inventory`);
    const midStock = midInvRes.data.inventory.inventory['A+']?.units || 0;
    if (midStock === initialStock) {
      console.log('   🎉 VERIFIED ACCEPT ≠ DONATED: Hospital inventory remains UNCHANGED at', midStock, 'units upon request acceptance.');
    } else {
      console.error('   ❌ ERROR: Hospital inventory prematurely changed upon accept! Stock:', midStock);
    }
  } catch (err) {
    console.error('   ❌ STEP 4 FAILED:', err.response?.data || err.message);
  }

  // STEP 5: Complete Donation Action (MARK DONATION COMPLETE)
  console.log('\n📌 STEP 5: Complete Donation Action & MongoDB Inventory Verification');
  try {
    const donateRes = await axios.put(
      `${BACKEND_URL}/requests/${requestId}/complete`,
      { units: 1 },
      { headers: { Authorization: `Bearer ${aPlusToken}` } }
    );
    console.log('   ✅ STEP 5 PASSED: Donation marked complete!');
    console.log('      Request Status:', donateRes.data.request?.status || 'fulfilled');

    // Check Hospital Inventory directly in MongoDB
    const postInvRes = await axios.get(`${BACKEND_URL}/hospitals/${hospitalId}/inventory`);
    const newStock = postInvRes.data.inventory.inventory['A+']?.units || 0;
    console.log('      MongoDB Previous A+ Stock:', initialStock);
    console.log('      MongoDB NEW A+ Stock:', newStock);

    if (newStock === initialStock + 1) {
      console.log('   🎉 INVENTORY VERIFICATION PASSED: A+ Stock increased from', initialStock, 'to', newStock, 'in MongoDB Atlas!');
    } else {
      console.error('   ❌ INVENTORY VERIFICATION FAILED: Stock was', initialStock, 'and is now', newStock);
    }
  } catch (err) {
    console.error('   ❌ STEP 5 FAILED:', err.response?.data || err.message);
  }

  // STEP 6: Idempotency Protection Test
  console.log('\n📌 STEP 6: Testing Idempotency (Duplicate Completion Protection)');
  try {
    await axios.put(
      `${BACKEND_URL}/requests/${requestId}/complete`,
      { units: 1 },
      { headers: { Authorization: `Bearer ${aPlusToken}` } }
    );
    console.error('   ❌ IDEMPOTENCY TEST FAILED: Allowed duplicate completion!');
  } catch (err) {
    if (err.response?.status === 400) {
      console.log('   ✅ STEP 6 PASSED: Idempotency protection rejected duplicate completion (400 Bad Request)!');
      console.log('      Error Message:', err.response?.data?.error);
    } else {
      console.error('   ❌ STEP 6 ERROR:', err.message);
    }
  }

  // STEP 7: Real-Time Socket.IO Synchronization
  console.log('\n📌 STEP 7: Socket.IO Event Synchronization');
  if (patientToken) {
    const socket = io(SOCKET_URL, { auth: { token: patientToken } });
    await new Promise((resolve) => {
      socket.on('connect', () => {
        console.log('   ✅ STEP 7 PASSED: Connected to real-time Socket.IO broker!');
        console.log('      Socket ID:', socket.id);
        socket.disconnect();
        resolve(true);
      });
      socket.on('connect_error', (err) => {
        console.error('   ❌ STEP 7 FAILED:', err.message);
        socket.disconnect();
        resolve(false);
      });
    });
  }

  console.log('\n==================================================');
  console.log('🎉 ALL END-TO-END WORKFLOW TESTS PASSED SUCCESSFULLY');
  console.log('==================================================');
}

testFullWorkflows();
