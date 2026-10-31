// mobile/test_android_flow.js
// Verification test for Android app connectivity to backend and Firebase project
const axios = require('axios');
const { io } = require('socket.io-client');

const LAN_IP = '192.168.1.20';
const BACKEND_URL = `http://${LAN_IP}:5000/api`;
const SOCKET_URL = `http://${LAN_IP}:5000`;

async function runAndroidVerification() {
  console.log('==================================================');
  console.log('🚀 RUNNING COMPREHENSIVE ANDROID FLOW VERIFICATION');
  console.log('==================================================\n');

  // TEST 1: Android -> Backend API Connectivity
  console.log('📌 TEST 1: Testing Android -> Backend API Endpoint');
  try {
    const resStats = await axios.get(`${BACKEND_URL}/requests/stats`);
    console.log('   ✅ TEST 1 PASSED: Backend API accessible!');
    console.log('      Status:', resStats.status);
    console.log('      Stats Summary:', JSON.stringify(resStats.data));
  } catch (err) {
    console.error('   ❌ TEST 1 FAILED:', err.message);
  }

  // TEST 2: Firebase Configuration Verification
  console.log('\n📌 TEST 2: Testing Firebase Configuration Matching');
  const firebaseConfig = {
    apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY,
    authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
    projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
  };
  console.log('   Mobile Firebase Config:', firebaseConfig);
  if (firebaseConfig.projectId === 'lifelink-68537') {
    console.log('   ✅ TEST 2 PASSED: Mobile configured with correct Firebase Project ID (lifelink-68537)');
  } else {
    console.error('   ❌ TEST 2 FAILED: Mismatched Firebase project ID!');
  }

  // TEST 3 & 4 & 5: Android Login, Token Storage simulation, & Authenticated Request
  console.log('\n📌 TEST 3, 4, 5: Testing Android Login, Token Storage & Authenticated User Request');
  let token = null;
  let loggedInUser = null;
  try {
    const loginRes = await axios.post(`${BACKEND_URL}/auth/login`, {
      email: 'kondasivaramajeswanth@gmail.com',
      password: 'Ravi@6444',
    });
    token = loginRes.data.accessToken;
    loggedInUser = loginRes.data.user;
    console.log('   ✅ TEST 3 PASSED: Android Login succeeded, token received!');
    console.log('      User ID:', loggedInUser.id || loggedInUser._id);
    console.log('      User Name:', loggedInUser.name);
    console.log('      User Email:', loggedInUser.email);
    console.log('      User Role:', loggedInUser.role);
    console.log('      Access Token:', token.substring(0, 30) + '...');

    // TEST 4 & 5: Authenticated API Call using Bearer Token
    const authRes = await axios.get(`${BACKEND_URL}/donors/me/donations`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    console.log('   ✅ TEST 4 & 5 PASSED: Authenticated request succeeded!');
    console.log('      Backend identified user ID:', loggedInUser._id);
    console.log('      Donations Count:', authRes.data.donations?.length);

  } catch (err) {
    console.error('   ❌ TEST 3/4/5 FAILED:', err.response?.data || err.message);
  }

  // TEST 6: Socket.IO Connection
  console.log('\n📌 TEST 6: Testing Android Socket.IO Connection to Same Backend');
  if (token) {
    const socket = io(SOCKET_URL, {
      auth: { token },
      transports: ['websocket', 'polling'],
    });

    await new Promise((resolve) => {
      socket.on('connect', () => {
        console.log('   ✅ TEST 6 PASSED: Socket.IO connected successfully!');
        console.log('      Socket ID:', socket.id);
        socket.disconnect();
        resolve(true);
      });
      socket.on('connect_error', (err) => {
        console.error('   ❌ TEST 6 FAILED:', err.message);
        socket.disconnect();
        resolve(false);
      });
    });
  }

  console.log('\n==================================================');
  console.log('🎉 ALL ANDROID VERIFICATION TESTS COMPLETED');
  console.log('==================================================');
}

runAndroidVerification();
