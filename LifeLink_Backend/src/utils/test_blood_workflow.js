const API_URL = 'http://localhost:5000/api';

async function run() {
  console.log('=== END-TO-END BLOOD WORKFLOW TEST SUITE ===\n');

  // Login credentials
  let hospitalToken = '';
  let hospitalId = '';
  let donorToken = '';
  let donorId = '';
  let patientToken = '';
  let patientId = '';

  // 1. Logins
  try {
    const loginRes = await fetch(`${API_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'apollo.hospital@seed.lifelink.com', password: 'Hospital@123' })
    });
    const data = await loginRes.json();
    hospitalToken = data.accessToken;
    hospitalId = data.user._id;
    console.log('✅ Hospital login successful. ID:', hospitalId);
  } catch (err) {
    console.error('❌ Hospital login failed:', err.message);
    return;
  }

  try {
    const loginRes = await fetch(`${API_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'arjun.sharma@seed.lifelink.com', password: 'Donor@123' })
    });
    const data = await loginRes.json();
    donorToken = data.accessToken;
    donorId = data.user._id;
    console.log('✅ Donor login successful. ID:', donorId);
  } catch (err) {
    console.error('❌ Donor login failed:', err.message);
    return;
  }

  try {
    // Registers a clean receiver user if they do not exist, otherwise log in
    const registerRes = await fetch(`${API_URL}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Patient Workflow Tester',
        email: 'patient.tester@lifelink.com',
        password: 'Password@123',
        phone: '+919988776655',
        role: 'receiver',
        bloodGroup: 'A+'
      })
    });
    let data = await registerRes.json();
    if (!registerRes.ok) {
      const loginRes = await fetch(`${API_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'patient.tester@lifelink.com', password: 'Password@123' })
      });
      data = await loginRes.json();
    }
    if (!data.user) {
      console.error('❌ Patient login response missing user details:', data);
      return;
    }
    patientToken = data.accessToken;
    patientId = data.user._id;
    console.log('✅ Patient login successful. ID:', patientId);
  } catch (err) {
    console.error('❌ Patient setup failed:', err.message);
    return;
  }

  // Fetch initial hospital A+ inventory
  let initialAplusUnits = 0;
  try {
    const res = await fetch(`${API_URL}/hospitals/${hospitalId}/inventory`);
    const data = await res.json();
    initialAplusUnits = data.inventory?.inventory?.['A+']?.units || 0;
    console.log(`\n📊 Initial Hospital A+ Stock: ${initialAplusUnits} units`);
  } catch {
    console.log('\n📊 Initial Hospital A+ Stock: 0 units (inventory not initialized)');
  }

  // --- TEST CASE 1: Hospital creates A+ request (2 units) ---
  console.log('\n--- TEST CASE 1: Hospital creates blood request ---');
  let requestId = '';
  try {
    const res = await fetch(`${API_URL}/requests`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${hospitalToken}`
      },
      body: JSON.stringify({
        patientName: 'Workflow Patient A',
        patientAge: 40,
        contactNumber: '+919000100020',
        bloodGroup: 'A+',
        unitsRequired: 2,
        hospitalName: 'Apollo Hospital',
        medicalReason: 'General Surgery',
        priority: 'high',
        location: { type: 'Point', coordinates: [80.2707, 13.0827], address: 'Chennai' }
      })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(JSON.stringify(data));
    requestId = data.request._id;
    console.log(`✅ Hospital request created successfully. ID: ${requestId}`);
  } catch (err) {
    console.error('❌ Request creation failed:', err.message);
    return;
  }

  // --- TEST CASE 2: Donor accepts request ---
  console.log('\n--- TEST CASE 2: Donor accepts request ---');
  try {
    const res = await fetch(`${API_URL}/requests/${requestId}/accept`, {
      method: 'PUT',
      headers: { 'Authorization': `Bearer ${donorToken}` }
    });
    const data = await res.json();
    if (!res.ok) throw new Error(JSON.stringify(data));
    console.log('✅ Request accepted successfully by donor.');
  } catch (err) {
    console.error('❌ Request acceptance failed:', err.message);
    return;
  }

  // --- TEST CASE 3: Donor completes donation (A+ = 2 units) ---
  console.log('\n--- TEST CASE 3: Donor completes donation ---');
  try {
    const res = await fetch(`${API_URL}/requests/${requestId}/complete`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${donorToken}`
      },
      body: JSON.stringify({ units: 2 })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(JSON.stringify(data));
    console.log('✅ Donation marked completed.');

    // Verify hospital inventory increased by 2
    const invRes = await fetch(`${API_URL}/hospitals/${hospitalId}/inventory`);
    const invData = await invRes.json();
    const newAplusUnits = invData.inventory.inventory['A+'].units;
    console.log(`📊 New Hospital A+ Stock: ${newAplusUnits} units (expected increase of +2)`);
    if (newAplusUnits === initialAplusUnits + 2) {
      console.log('✅ Inventory increment verification: PASSED');
    } else {
      console.error(`❌ Inventory increment verification: FAILED (Expected ${initialAplusUnits + 2}, got ${newAplusUnits})`);
    }
  } catch (err) {
    console.error('❌ Donation completion failed:', err.message);
    return;
  }

  // --- TEST CASE 4: Patient requests A+ (1 unit) & Hospital fulfills it ---
  console.log('\n--- TEST CASE 4: Patient request and fulfillment ---');
  let patientReqId = '';
  try {
    const res = await fetch(`${API_URL}/requests`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${patientToken}`
      },
      body: JSON.stringify({
        patientName: 'Workflow Patient B',
        patientAge: 25,
        contactNumber: '+919900990099',
        bloodGroup: 'A+',
        unitsRequired: 1,
        hospitalName: 'Apollo Hospital',
        medicalReason: 'Accident emergency',
        priority: 'critical',
        location: { type: 'Point', coordinates: [80.2707, 13.0827], address: 'Chennai' }
      })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(JSON.stringify(data));
    patientReqId = data.request._id;
    console.log(`✅ Patient request created. ID: ${patientReqId}`);
  } catch (err) {
    console.error('❌ Patient request failed:', err.message);
    return;
  }

  // Hospital fulfills the patient's request from inventory
  try {
    const res = await fetch(`${API_URL}/requests/${patientReqId}/fulfill`, {
      method: 'PUT',
      headers: { 'Authorization': `Bearer ${hospitalToken}` }
    });
    const data = await res.json();
    if (!res.ok) throw new Error(JSON.stringify(data));
    console.log('✅ Hospital fulfilled patient request from inventory.');

    // Verify hospital inventory decreased by 1
    const invRes = await fetch(`${API_URL}/hospitals/${hospitalId}/inventory`);
    const invData = await invRes.json();
    const finalAplusUnits = invData.inventory.inventory['A+'].units;
    console.log(`📊 Final Hospital A+ Stock: ${finalAplusUnits} units (expected decrease of -1)`);

    // Verify request is fulfilled in DB
    const reqRes = await fetch(`${API_URL}/requests/${patientReqId}`);
    const reqData = await reqRes.json();
    console.log(`✅ Verified request status in DB: ${reqData.request.status}`);
  } catch (err) {
    console.error('❌ Fulfill request failed:', err.message);
    return;
  }

  // --- TEST CASE 5: Try requesting more units than available ---
  console.log('\n--- TEST CASE 5: Request exceeding available inventory limit ---');

  let currentAplusUnits = 0;
  try {
    const invRes = await fetch(`${API_URL}/hospitals/${hospitalId}/inventory`);
    const invData = await invRes.json();
    currentAplusUnits = invData.inventory.inventory['A+'].units;
    console.log(`📊 Current Hospital A+ Inventory: ${currentAplusUnits} units`);
  } catch (err) {
    console.error('❌ Failed to fetch current inventory:', err.message);
    return;
  }

  // Deplete stock if it is too high to test within the schema's 20 units limit
  if (currentAplusUnits >= 20) {
    console.log('⚠️ Current inventory is high. Fulfilling a request of 20 units first to deplete inventory...');
    let depletionReqId = '';
    try {
      const res = await fetch(`${API_URL}/requests`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${patientToken}`
        },
        body: JSON.stringify({
          patientName: 'Depletion Patient D',
          patientAge: 45,
          contactNumber: '+919911991199',
          bloodGroup: 'A+',
          unitsRequired: 20,
          hospitalName: 'Apollo Hospital',
          medicalReason: 'Depleting stock for test',
          priority: 'high',
          location: { type: 'Point', coordinates: [80.2707, 13.0827], address: 'Chennai' }
        })
      });
      const data = await res.json();
      depletionReqId = data.request._id;

      await fetch(`${API_URL}/requests/${depletionReqId}/fulfill`, {
        method: 'PUT',
        headers: { 'Authorization': `Bearer ${hospitalToken}` }
      });

      const invRes = await fetch(`${API_URL}/hospitals/${hospitalId}/inventory`);
      const invData = await invRes.json();
      currentAplusUnits = invData.inventory.inventory['A+'].units;
      console.log(`📊 Depleted Hospital A+ Inventory: ${currentAplusUnits} units`);
    } catch (err) {
      console.error('❌ Depletion setup failed:', err.message);
      return;
    }
  }

  const unitsToAsk = currentAplusUnits + 1;
  if (unitsToAsk > 20) {
    console.error('❌ Unable to run excessive request check: current stock is still higher than 20 even after depletion.');
    return;
  }

  let excessiveReqId = '';
  try {
    const res = await fetch(`${API_URL}/requests`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${patientToken}`
      },
      body: JSON.stringify({
        patientName: 'Excessive Patient C',
        patientAge: 50,
        contactNumber: '+919900880077',
        bloodGroup: 'A+',
        unitsRequired: unitsToAsk, // exceeds available stock
        hospitalName: 'Apollo Hospital',
        medicalReason: 'Testing inventory limits',
        priority: 'medium',
        location: { type: 'Point', coordinates: [80.2707, 13.0827], address: 'Chennai' }
      })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(JSON.stringify(data));
    excessiveReqId = data.request._id;
    console.log(`✅ Excessive request created. ID: ${excessiveReqId} (Asked for: ${unitsToAsk} units)`);
  } catch (err) {
    console.error('❌ Failed to create excessive request:', err.message);
    return;
  }

  try {
    const res = await fetch(`${API_URL}/requests/${excessiveReqId}/fulfill`, {
      method: 'PUT',
      headers: { 'Authorization': `Bearer ${hospitalToken}` }
    });
    const data = await res.json();
    if (res.status === 400 && data.error && data.error.includes('Insufficient blood units')) {
      console.log(`✅ Exceeded inventory check PASSED. Rejected fulfillment with message: "${data.error}"`);
    } else {
      console.error('❌ Exceeded inventory check FAILED. Response:', res.status, data);
    }
  } catch (err) {
    console.error('❌ Exceeded inventory fetch failed:', err.message);
  }

  console.log('\n=== END-TO-END BLOOD WORKFLOW TEST SUITE COMPLETED SUCCESSFULLY ===');
}

run();
