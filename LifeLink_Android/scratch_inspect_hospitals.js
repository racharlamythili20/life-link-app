// mobile/scratch_inspect_hospitals.js
const axios = require('axios');
const LAN_IP = '192.168.1.20';
const BACKEND_URL = `http://${LAN_IP}:5000/api`;

async function inspectHospitals() {
  try {
    const res = await axios.get(`${BACKEND_URL}/hospitals`);
    console.log('=== HOSPITALS IN DATABASE ===');
    res.data.hospitals.forEach(h => {
      console.log(`ID: ${h._id} | Name: "${h.name}" | Email: ${h.email} | Phone: ${h.phone}`);
      if (h.hospitalInfo) console.log('   HospitalInfo:', h.hospitalInfo);
    });

    console.log('\n=== TESTING INVENTORY FETCH FOR ALL HOSPITALS ===');
    for (const h of res.data.hospitals) {
      try {
        const invRes = await axios.get(`${BACKEND_URL}/hospitals/${h._id}/inventory`);
        console.log(`Hospital "${h.name}" (${h._id}) Inventory:`, invRes.data.inventory.inventory);
      } catch (err) {
        console.log(`Hospital "${h.name}" (${h._id}) Inventory fetch error:`, err.response?.data || err.message);
      }
    }
  } catch (err) {
    console.error('Error:', err.message);
  }
}

inspectHospitals();
