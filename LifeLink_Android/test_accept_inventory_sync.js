// mobile/test_accept_inventory_sync.js
const axios = require('axios');
const { io } = require('socket.io-client');

const LAN_IP = '192.168.1.20';
const BACKEND_URL = `http://${LAN_IP}:5000/api`;
const SOCKET_URL = `http://${LAN_IP}:5000`;

async function testAcceptInventorySync() {
  console.log('==================================================');
  console.log('🩸 TESTING DONOR REQUEST ACCEPTANCE → HOSPITAL INVENTORY INCREMENT');
  console.log('==================================================\n');

  // STEP 1: Hospital Baseline Stock
  const hospitalsRes = await axios.get(`${BACKEND_URL}/hospitals`);
  const hospital = hospitalsRes.data.hospitals[0];
  const hospitalId = hospital._id;
  console.log('📌 STEP 1: Target Hospital:', hospital.name, `(${hospitalId})`);

  const initialInvRes = await axios.get(`${BACKEND_URL}/hospitals/${hospitalId}/inventory`);
  const initialBPlusUnits = initialInvRes.data.inventory.inventory['B+']?.units || 0;
  console.log('   Baseline MongoDB B+ Inventory:', initialBPlusUnits, 'units');

  // STEP 2: Socket.IO Listener Setup
  console.log('\n📌 STEP 2: Subscribing Real-Time Socket Listener');
  const socket = io(SOCKET_URL);
  let socketReceived = false;
  let socketBPlusUnits = null;

  await new Promise((resolve) => {
    socket.on('connect', () => {
      console.log('   ✅ Socket connected! ID:', socket.id);
      socket.emit('join_room', `user:${hospitalId}`);
      resolve(true);
    });
  });

  socket.on('inventory_updated', (data) => {
    if (data.bloodGroup === 'B+') {
      socketReceived = true;
      socketBPlusUnits = data.newInventoryQuantity;
      console.log('   📩 [SOCKET EVENT RECEIVED] Event: inventory_updated');
      console.log('      Payload B+ Quantity:', socketBPlusUnits);
    }
  });

  // STEP 3: Create B+ Patient Request
  console.log('\n📌 STEP 3: Creating B+ Blood Request');
  const patientUser = await axios.post(`${BACKEND_URL}/auth/register`, {
    name: 'Accept Test Patient',
    email: `accept_patient_${Date.now()}@lifelink.com`,
    password: 'Password123!',
    phone: '9123456770',
    bloodGroup: 'B+',
    role: 'receiver',
  });
  const patientToken = patientUser.data.accessToken;

  const reqRes = await axios.post(
    `${BACKEND_URL}/requests`,
    {
      patientName: 'Accept Test Patient',
      contactNumber: '9123456770',
      bloodGroup: 'B+',
      unitsRequired: 1,
      hospitalName: hospital.name,
      hospital: hospitalId,
      priority: 'high',
      medicalReason: 'Accept Sync Test',
      location: { type: 'Point', coordinates: [80.2707, 13.0827], address: 'Hospital, Chennai' },
    },
    { headers: { Authorization: `Bearer ${patientToken}` } }
  );
  const requestId = reqRes.data.request._id;
  console.log('   Blood Request Created! Request ID:', requestId);

  // STEP 4: Donor Accepts Request
  console.log('\n📌 STEP 4: B+ Donor Accepts Request (PUT /requests/:id/accept)');
  const donorUser = await axios.post(`${BACKEND_URL}/auth/register`, {
    name: 'Accept Test Donor B+',
    email: `accept_donor_${Date.now()}@lifelink.com`,
    password: 'Password123!',
    phone: '9123456771',
    bloodGroup: 'B+',
    role: 'donor',
  });
  const donorToken = donorUser.data.accessToken;

  const acceptRes = await axios.put(
    `${BACKEND_URL}/requests/${requestId}/accept`,
    {},
    { headers: { Authorization: `Bearer ${donorToken}` } }
  );
  console.log('   Accept Response Status:', acceptRes.status);

  // Wait 1 second for socket propagation
  await new Promise(r => setTimeout(r, 1000));

  // STEP 5: Verify MongoDB Inventory Updates
  console.log('\n📌 STEP 5: Verifying MongoDB Inventory & Real-Time Socket Payload');
  const postInvRes = await axios.get(`${BACKEND_URL}/hospitals/${hospitalId}/inventory`);
  const finalBPlusUnits = postInvRes.data.inventory.inventory['B+']?.units || 0;

  console.log('   MongoDB B+ Baseline Units :', initialBPlusUnits);
  console.log('   MongoDB B+ Final Units    :', finalBPlusUnits);
  console.log('   Socket B+ Event Quantity  :', socketBPlusUnits);

  if (finalBPlusUnits === initialBPlusUnits + 1 && socketReceived) {
    console.log('\n   🎉 VERIFICATION SUCCESSFUL!');
    console.log(`      Donor acceptance immediately increased MongoDB B+ stock from ${initialBPlusUnits} to ${finalBPlusUnits}!`);
    console.log(`      Socket.IO broadcasted real-time inventory_updated event!`);
  } else {
    console.error('\n   ❌ VERIFICATION FAILED!');
  }

  socket.disconnect();
}

testAcceptInventorySync();
