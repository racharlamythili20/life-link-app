const API = 'http://localhost:5000/api';
async function test() {
  // 1. Login hospital
  const hRes = await fetch(API + '/auth/login', {method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({email:'apollo.hospital@seed.lifelink.com',password:'Hospital@123'})});
  const h = await hRes.json();
  console.log('Hospital login:', hRes.status, h.user?.role, h.user?._id);
  const hToken = h.accessToken;
  const hId = h.user?._id;

  // 2. Login donor
  const dRes = await fetch(API + '/auth/login', {method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({email:'arjun.sharma@seed.lifelink.com',password:'Donor@123'})});
  const d = await dRes.json();
  console.log('Donor login:', dRes.status, d.user?.role, d.user?.bloodGroup, d.user?._id);
  const dToken = d.accessToken;
  const dId = d.user?._id;

  // 3. Check hospital A+ inventory BEFORE
  const inv1Res = await fetch(API + '/hospitals/' + hId + '/inventory', {headers:{Authorization:'Bearer '+hToken}});
  const inv1 = await inv1Res.json();
  const before = inv1.inventory?.inventory?.['A+']?.units;
  console.log('Hospital A+ inventory BEFORE:', before);

  // 4. Create request as hospital
  const rRes = await fetch(API + '/requests', {method:'POST',headers:{'Content-Type':'application/json','Authorization':'Bearer '+hToken},body:JSON.stringify({patientName:'TestPat',patientAge:30,contactNumber:'+919000000001',bloodGroup:'A+',unitsRequired:2,hospitalName:'Apollo',medicalReason:'Surgery',priority:'high',location:{type:'Point',coordinates:[80.2707,13.0827],address:'Chennai'}})});
  const r = await rRes.json();
  const reqId = r.request?._id;
  console.log('Create request:', rRes.status, 'reqId:', reqId, 'hospital field:', r.request?.hospital, 'status:', r.request?.status);

  // 5. Fetch requests as donor
  const feedRes = await fetch(API + '/requests?status=active', {headers:{Authorization:'Bearer '+dToken}});
  const feed = await feedRes.json();
  const myReq = feed.requests?.find(function(x){ return x._id === reqId; });
  console.log('Donor sees new request:', !!myReq);

  if (!reqId) { console.error('Request not created!'); return; }

  // 6. Accept as donor
  const accRes = await fetch(API + '/requests/' + reqId + '/accept', {method:'PUT',headers:{Authorization:'Bearer '+dToken}});
  const acc = await accRes.json();
  console.log('Accept:', accRes.status, acc.message || acc.error);

  // 7. Check request after accept - does it have donor details?
  const checkRes = await fetch(API + '/requests/' + reqId, {headers:{Authorization:'Bearer '+hToken}});
  const check = await checkRes.json();
  const resp = check.request?.responses?.[0];
  console.log('Request responses after accept:', JSON.stringify(resp));

  // 8. Complete donation (donate 2 units)
  const compRes = await fetch(API + '/requests/' + reqId + '/complete', {method:'PUT',headers:{'Content-Type':'application/json','Authorization':'Bearer '+dToken},body:JSON.stringify({units:2})});
  const comp = await compRes.json();
  console.log('Complete donation:', compRes.status, comp.message || comp.error);

  // 9. Check inventory AFTER
  const inv2Res = await fetch(API + '/hospitals/' + hId + '/inventory', {headers:{Authorization:'Bearer '+hToken}});
  const inv2 = await inv2Res.json();
  const after = inv2.inventory?.inventory?.['A+']?.units;
  console.log('Hospital A+ inventory AFTER donation:', after, '(expected:', (before||0)+2, ')');
  console.log('Inventory incremented correctly:', after === (before||0)+2);

  // 10. Test patient request + fulfillment
  // Login patient
  const pRes = await fetch(API + '/auth/login', {method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({email:'patient.tester@lifelink.com',password:'Password@123'})});
  const p = await pRes.json();
  console.log('\nPatient login:', pRes.status, p.user?.role, p.user?._id);
  const pToken = p.accessToken;
  const pId = p.user?._id;

  // Create patient request
  const prRes = await fetch(API + '/requests', {method:'POST',headers:{'Content-Type':'application/json','Authorization':'Bearer '+pToken},body:JSON.stringify({patientName:'TestPatient',patientAge:25,contactNumber:'+919000000002',bloodGroup:'A+',unitsRequired:1,hospitalName:'Apollo',medicalReason:'Emergency',priority:'critical',location:{type:'Point',coordinates:[80.2707,13.0827],address:'Chennai'}})});
  const pr = await prRes.json();
  const patReqId = pr.request?._id;
  console.log('Patient request created:', prRes.status, patReqId);

  // Hospital fulfills
  const fulRes = await fetch(API + '/requests/' + patReqId + '/fulfill', {method:'PUT',headers:{Authorization:'Bearer '+hToken}});
  const ful = await fulRes.json();
  console.log('Fulfill:', fulRes.status, ful.message || ful.error);

  // Inventory after fulfillment
  const inv3Res = await fetch(API + '/hospitals/' + hId + '/inventory', {headers:{Authorization:'Bearer '+hToken}});
  const inv3 = await inv3Res.json();
  const final = inv3.inventory?.inventory?.['A+']?.units;
  console.log('Hospital A+ inventory AFTER fulfillment:', final, '(expected:', after-1, ')');
  console.log('Inventory decremented correctly:', final === after-1);

  // Check patient sees fulfilled request
  const patReqCheck = await fetch(API + '/requests?requestedBy=' + pId + '&status=all', {headers:{Authorization:'Bearer '+pToken}});
  const patFeed = await patReqCheck.json();
  const patReqStatus = patFeed.requests?.find(function(x){ return x._id === patReqId; })?.status;
  console.log('Patient request status:', patReqStatus);

  console.log('\n=== TEST COMPLETE ===');
}
test().catch(function(e){ console.error('FATAL:', e.message); });
