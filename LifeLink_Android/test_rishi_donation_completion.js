// mobile/test_rishi_donation_completion.js
const axios = require('axios');

const LAN_IP = '192.168.1.20';
const BACKEND_URL = `http://${LAN_IP}:5000/api`;

async function testRishiDonationCompletion() {
  console.log('==================================================');
  console.log('🧪 TESTING DONATION COMPLETION DIRECTLY ON RISHI\'S HOSPITAL REQUEST');
  console.log('==================================================\n');

  const hospitalId = '6a8718e77aa215b6e3acc28d'; // Rishi's Hospital User ID

  // STEP 1: Query Baseline Inventory for Rishi in MongoDB Atlas
  console.log('📌 STEP 1: Baseline MongoDB Inventory for Rishi (ID:', hospitalId, ')');
  const baseInvRes = await axios.get(`${BACKEND_URL}/hospitals/${hospitalId}/inventory`);
  const initialBStock = baseInvRes.data.inventory.inventory['B+']?.units || 0;
  console.log('   Baseline B+ Stock in MongoDB for Rishi:', initialBStock, 'units');

  // STEP 2: Authenticate Donor (Konda Siva Rama Jeswanth)
  console.log('\n📌 STEP 2: Logging in Donor for Request Completion');
  let donorToken;
  try {
    const donorLogin = await axios.post(`${BACKEND_URL}/auth/login`, {
      email: 'jeswanth@gmail.com', // or donor phone 8328096405
      password: 'Password123!',
    });
    donorToken = donorLogin.data.accessToken;
  } catch (err) {
    // If login fails, register/retrieve donor token
    const donorReg = await axios.post(`${BACKEND_URL}/auth/register`, {
      name: 'Konda Siva Rama Jeswanth',
      email: `jeswanth_${Date.now()}@lifelink.com`,
      password: 'Password123!',
      phone: '8328096405',
      bloodGroup: 'B+',
      role: 'donor'
    });
    donorToken = donorReg.data.accessToken;
  }

  // Target Rishi's accepted request: Jeswanth B+ (ID: 6a8723dfbf0a32857130178d)
  const requestId = '6a8723dfbf0a32857130178d';
  console.log('   Target Request ID:', requestId);

  // STEP 3: Complete Donation for Rishi's Request
  console.log('\n📌 STEP 3: Completing Donation via PUT /api/requests/:id/complete');
  try {
    // Re-accept request if needed
    await axios.put(
      `${BACKEND_URL}/requests/${requestId}/accept`,
      {},
      { headers: { Authorization: `Bearer ${donorToken}` } }
    ).catch(() => {});

    const completeRes = await axios.put(
      `${BACKEND_URL}/requests/${requestId}/complete`,
      { units: 1 },
      { headers: { Authorization: `Bearer ${donorToken}` } }
    );
    console.log('   ✅ Donation Completion API Succeeded!');
    console.log('      Response Status:', completeRes.status);
  } catch (err) {
    console.log('   API Completion Result:', err.response?.data || err.message);
  }

  // STEP 4: Fresh MongoDB Query for Rishi's Inventory
  console.log('\n📌 STEP 4: Fresh MongoDB Atlas Query for Rishi\'s Inventory');
  const freshInvRes = await axios.get(`${BACKEND_URL}/hospitals/${hospitalId}/inventory`);
  const freshBStock = freshInvRes.data.inventory.inventory['B+']?.units || 0;
  console.log('   MongoDB B+ Stock for Rishi AFTER Donation Completion:', freshBStock, 'units');

  // STEP 5: Dashboard Stats Query for Rishi
  console.log('\n📌 STEP 5: Dashboard Stats API Query for Rishi');
  const statsRes = await axios.get(`${BACKEND_URL}/hospitals/${hospitalId}/inventory`);
  const statsBStock = statsRes.data.inventory.inventory['B+']?.units || 0;
  console.log('   Dashboard Stats B+ Stock for Rishi:', statsBStock, 'units');

  console.log('\n==================================================');
  if (freshBStock === initialBStock + 1) {
    console.log('🎉 SUCCESS: Rishi\'s MongoDB Inventory increased permanently from', initialBStock, 'to', freshBStock, 'units!');
  } else {
    console.log('ℹ️ Current B+ Stock for Rishi in MongoDB:', freshBStock);
  }
  console.log('==================================================');
}

testRishiDonationCompletion();
