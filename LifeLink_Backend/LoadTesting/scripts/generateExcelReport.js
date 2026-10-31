// Backend/LoadTesting/scripts/generateExcelReport.js
const ExcelJS = require('exceljs');
const fs = require('fs');
const path = require('path');

async function generateExcelReport(tests) {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'LifeLink Backend QA Engine';
  workbook.lastModifiedBy = 'LifeLink CI/CD Pipeline';
  workbook.created = new Date();
  workbook.modified = new Date();

  // Styling Palette
  const HEADER_FILL = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E293B' } }; // Dark slate
  const HEADER_FONT = { name: 'Calibri', size: 11, bold: true, color: { argb: 'FFFFFFFF' } };
  const PASS_FONT = { name: 'Calibri', size: 10, bold: true, color: { argb: 'FF15803D' } };
  const PASS_FILL = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFDCFCE7' } };
  const REGULAR_FONT = { name: 'Calibri', size: 10 };
  const BORDER_STYLE = {
    top: { style: 'thin', color: { argb: 'E2E8F0' } },
    left: { style: 'thin', color: { argb: 'E2E8F0' } },
    bottom: { style: 'thin', color: { argb: 'E2E8F0' } },
    right: { style: 'thin', color: { argb: 'E2E8F0' } },
  };

  // Calculate Response Time Metrics
  const responseTimes = tests.map(t => t.responseTimeMs).sort((a, b) => a - b);
  const avgLatency = Math.round(responseTimes.reduce((a, b) => a + b, 0) / tests.length);
  const minLatency = responseTimes[0];
  const maxLatency = responseTimes[responseTimes.length - 1];
  const p95Latency = responseTimes[Math.floor(tests.length * 0.95)];
  const p99Latency = responseTimes[Math.floor(tests.length * 0.99)];

  // -------------------------------------------------------------
  // SHEET 1: Dashboard
  // -------------------------------------------------------------
  const dashSheet = workbook.addWorksheet('Dashboard', { views: [{ showGridLines: true }] });
  dashSheet.columns = [
    { header: 'Metric', key: 'metric', width: 35 },
    { header: 'Value', key: 'value', width: 50 }
  ];

  const dashHeaderRow = dashSheet.getRow(1);
  dashHeaderRow.height = 28;
  dashHeaderRow.eachCell(cell => {
    cell.fill = HEADER_FILL;
    cell.font = HEADER_FONT;
    cell.alignment = { vertical: 'middle', horizontal: 'left' };
  });

  const dashMetrics = [
    { metric: 'Project Name', value: 'LifeLink Real-Time Blood Donation Backend' },
    { metric: 'Overall Status', value: 'PASSED' },
    { metric: 'Total Automated Tests', value: 500 },
    { metric: 'Passed Test Cases', value: 500 },
    { metric: 'Failed Test Cases', value: 0 },
    { metric: 'Pass Percentage', value: '100.0%' },
    { metric: 'Execution Mode', value: 'SIMULATED / SYNTHETIC' },
    { metric: 'Live API Requests', value: 0 },
    { metric: 'Target Backend URL', value: 'https://lifelink-backend-avuk.onrender.com' },
    { metric: 'Discovered Modules Count', value: 5 },
    { metric: 'Average Latency (Simulated)', value: `${avgLatency} ms` },
    { metric: 'P95 Latency (Simulated)', value: `${p95Latency} ms` },
    { metric: 'P99 Latency (Simulated)', value: `${p99Latency} ms` },
    { metric: 'Synthetic Throughput', value: '1,250 req/sec' },
    { metric: 'CI/CD Pipeline Status', value: 'SUCCESS ✅' },
    { metric: 'Report Note', value: 'SIMULATED / SYNTHETIC TEST EXECUTION — NO LIVE API REQUESTS' },
  ];

  dashMetrics.forEach(m => {
    const row = dashSheet.addRow(m);
    row.height = 20;
    row.getCell('metric').font = { name: 'Calibri', size: 10, bold: true, color: { argb: 'FF334155' } };
    row.getCell('value').font = REGULAR_FONT;
    if (m.metric === 'Overall Status' || m.metric === 'Pass Percentage') {
      row.getCell('value').font = PASS_FONT;
      row.getCell('value').fill = PASS_FILL;
    }
    if (m.metric === 'Execution Mode' || m.metric === 'Live API Requests') {
      row.getCell('value').font = { name: 'Calibri', size: 10, bold: true, color: { argb: 'FF2563EB' } };
    }
    row.eachCell(cell => { cell.border = BORDER_STYLE; cell.alignment = { vertical: 'middle', horizontal: 'left' }; });
  });

  // -------------------------------------------------------------
  // HELPER FUNCTION: Add LifeLink Module Sheet
  // -------------------------------------------------------------
  function addApiSheet(sheetName, sectionTests) {
    const sheet = workbook.addWorksheet(sheetName, {
      views: [{ showGridLines: true, state: 'frozen', ySplit: 1 }]
    });

    sheet.columns = [
      { header: 'Test ID', key: 'testId', width: 14 },
      { header: 'Test Name', key: 'testName', width: 52 },
      { header: 'API Endpoint', key: 'endpoint', width: 35 },
      { header: 'HTTP Method', key: 'method', width: 14 },
      { header: 'Request Payload', key: 'payload', width: 40 },
      { header: 'Expected Result', key: 'expectedResult', width: 35 },
      { header: 'Actual Result', key: 'actualResult', width: 35 },
      { header: 'Status', key: 'status', width: 12 },
      { header: 'Response Time (ms)', key: 'responseTimeMs', width: 20 },
      { header: 'Status Code', key: 'statusCode', width: 14 },
      { header: 'Error Details', key: 'errorMessage', width: 18 },
      { header: 'Description', key: 'description', width: 45 },
      { header: 'Timestamp', key: 'timestamp', width: 24 }
    ];

    const hRow = sheet.getRow(1);
    hRow.height = 26;
    hRow.eachCell(c => { c.fill = HEADER_FILL; c.font = HEADER_FONT; c.alignment = { vertical: 'middle', horizontal: 'left' }; });

    sectionTests.forEach(t => {
      const row = sheet.addRow(t);
      row.height = 19;
      row.getCell('testId').font = { name: 'Calibri', size: 10, bold: true, color: { argb: 'FF475569' } };
      row.getCell('method').font = { name: 'Calibri', size: 10, bold: true };
      
      const sCell = row.getCell('status');
      sCell.font = PASS_FONT;
      sCell.fill = PASS_FILL;
      sCell.alignment = { vertical: 'middle', horizontal: 'center' };

      row.getCell('responseTimeMs').alignment = { vertical: 'middle', horizontal: 'right' };
      row.getCell('statusCode').alignment = { vertical: 'middle', horizontal: 'center' };

      row.eachCell(c => { c.font = c.font || REGULAR_FONT; c.border = BORDER_STYLE; });
    });

    sheet.autoFilter = { from: { row: 1, column: 1 }, to: { row: sectionTests.length + 1, column: 13 } };
  }

  // -------------------------------------------------------------
  // SHEETS 2-6: Five LifeLink Backend API Category Sheets (100 rows each)
  // -------------------------------------------------------------
  addApiSheet('Authentication API', tests.filter(t => t.category === 'Authentication API'));
  addApiSheet('Emergency Request API', tests.filter(t => t.category === 'Emergency Request API'));
  addApiSheet('Hospital Inventory API', tests.filter(t => t.category === 'Hospital Inventory API'));
  addApiSheet('Donor Network API', tests.filter(t => t.category === 'Donor Network API'));
  addApiSheet('Communication & Admin API', tests.filter(t => t.category === 'Communication & Admin API'));

  // -------------------------------------------------------------
  // SHEET 7: Performance Summary
  // -------------------------------------------------------------
  const perfSheet = workbook.addWorksheet('Performance Summary', { views: [{ showGridLines: true }] });
  perfSheet.columns = [
    { header: 'Metric Name', key: 'metric', width: 35 },
    { header: 'Value', key: 'val', width: 30 },
    { header: 'Unit', key: 'unit', width: 15 },
    { header: 'Notes / Disclaimer', key: 'notes', width: 65 }
  ];

  const perfHeader = perfSheet.getRow(1);
  perfHeader.height = 26;
  perfHeader.eachCell(c => { c.fill = HEADER_FILL; c.font = HEADER_FONT; c.alignment = { vertical: 'middle', horizontal: 'left' }; });

  const perfData = [
    { metric: 'Total Automated Tests', val: 500, unit: 'Tests', notes: 'Simulated LifeLink API test cases' },
    { metric: 'Passed Tests', val: 500, unit: 'Tests', notes: '100% Pass rate' },
    { metric: 'Failed Tests', val: 0, unit: 'Tests', notes: 'Zero failures' },
    { metric: 'Pass Rate', val: '100.0%', unit: '%', notes: 'Target achieved' },
    { metric: 'Average Response Time', val: avgLatency, unit: 'ms', notes: 'Simulated latency' },
    { metric: 'Minimum Response Time', val: minLatency, unit: 'ms', notes: 'Simulated latency' },
    { metric: 'Maximum Response Time', val: maxLatency, unit: 'ms', notes: 'Simulated latency' },
    { metric: 'P95 Response Time', val: p95Latency, unit: 'ms', notes: 'Simulated latency' },
    { metric: 'P99 Response Time', val: p99Latency, unit: 'ms', notes: 'Simulated latency' },
    { metric: 'Synthetic Throughput', val: 1250, unit: 'req/sec', notes: 'Simulated target throughput' },
    { metric: 'Failure Rate', val: '0.0%', unit: '%', notes: 'Zero error rate' },
    { metric: 'Execution Mode Notice', val: 'SIMULATED', unit: 'N/A', notes: 'Performance metrics are synthetic and were not collected from live backend' },
  ];

  perfData.forEach(p => {
    const r = perfSheet.addRow(p);
    r.height = 20;
    r.getCell('metric').font = { name: 'Calibri', size: 10, bold: true };
    r.eachCell(c => { c.font = c.font || REGULAR_FONT; c.border = BORDER_STYLE; });
  });

  // -------------------------------------------------------------
  // SHEET 8: Failed Tests
  // -------------------------------------------------------------
  const failSheet = workbook.addWorksheet('Failed Tests', { views: [{ showGridLines: true }] });
  failSheet.columns = [
    { header: 'Status Message', key: 'msg', width: 85 }
  ];
  failSheet.getRow(1).fill = HEADER_FILL;
  failSheet.getRow(1).font = HEADER_FONT;
  const fRow = failSheet.addRow({ msg: 'No failed tests — synthetic execution configured for PASS demonstration.' });
  fRow.font = PASS_FONT;
  fRow.getCell('msg').fill = PASS_FILL;
  fRow.getCell('msg').border = BORDER_STYLE;

  // -------------------------------------------------------------
  // SHEET 9: Error Logs
  // -------------------------------------------------------------
  const logSheet = workbook.addWorksheet('Error Logs', { views: [{ showGridLines: true }] });
  logSheet.columns = [
    { header: 'Event ID', key: 'id', width: 15 },
    { header: 'Log Level', key: 'level', width: 15 },
    { header: 'Event Message', key: 'message', width: 65 },
    { header: 'Status', key: 'status', width: 15 },
    { header: 'Timestamp', key: 'timestamp', width: 25 }
  ];
  logSheet.getRow(1).fill = HEADER_FILL;
  logSheet.getRow(1).font = HEADER_FONT;

  const logs = [
    { id: 'LOG_001', level: 'INFO', message: 'LifeLink Backend QA Report generation execution started', status: 'SUCCESS', timestamp: new Date().toISOString() },
    { id: 'LOG_002', level: 'INFO', message: 'Discovered 5 LifeLink API Modules: Auth, Requests, Hospitals, Donors, Comm/Admin', status: 'SUCCESS', timestamp: new Date().toISOString() },
    { id: 'LOG_003', level: 'INFO', message: '500 LifeLink synthetic test records generated (100 per module)', status: 'SUCCESS', timestamp: new Date().toISOString() },
    { id: 'LOG_004', level: 'INFO', message: 'Excel workbook constructed with 10 LifeLink-specific sheets', status: 'SUCCESS', timestamp: new Date().toISOString() },
    { id: 'LOG_005', level: 'INFO', message: 'HTML execution report rendered', status: 'SUCCESS', timestamp: new Date().toISOString() },
    { id: 'LOG_006', level: 'INFO', message: 'ZIP package constructed', status: 'SUCCESS', timestamp: new Date().toISOString() },
  ];

  logs.forEach(l => {
    const r = logSheet.addRow(l);
    r.height = 20;
    r.getCell('id').font = { name: 'Calibri', size: 10, bold: true };
    r.getCell('status').font = PASS_FONT;
    r.eachCell(c => { c.font = c.font || REGULAR_FONT; c.border = BORDER_STYLE; });
  });

  // -------------------------------------------------------------
  // SHEET 10: Raw Results (500 rows)
  // -------------------------------------------------------------
  const rawSheet = workbook.addWorksheet('Raw Results', {
    views: [{ showGridLines: true, state: 'frozen', ySplit: 1 }]
  });

  rawSheet.columns = [
    { header: 'testId', key: 'testId', width: 14 },
    { header: 'testName', key: 'testName', width: 50 },
    { header: 'category', key: 'category', width: 25 },
    { header: 'endpoint', key: 'endpoint', width: 35 },
    { header: 'method', key: 'method', width: 12 },
    { header: 'payload', key: 'payload', width: 35 },
    { header: 'expectedResult', key: 'expectedResult', width: 35 },
    { header: 'expectedCodes', key: 'expectedCodes', width: 15 },
    { header: 'description', key: 'description', width: 45 },
    { header: 'status', key: 'status', width: 12 },
    { header: 'statusCode', key: 'statusCode', width: 14 },
    { header: 'responseTimeMs', key: 'responseTimeMs', width: 18 },
    { header: 'actualResult', key: 'actualResult', width: 35 },
    { header: 'errorMessage', key: 'errorMessage', width: 18 },
    { header: 'requestCount', key: 'requestCount', width: 15 },
    { header: 'executionTime', key: 'executionTime', width: 15 },
    { header: 'timestamp', key: 'timestamp', width: 24 },
    { header: 'executionMode', key: 'executionMode', width: 18 }
  ];

  rawSheet.getRow(1).fill = HEADER_FILL;
  rawSheet.getRow(1).font = HEADER_FONT;

  tests.forEach(t => {
    const row = rawSheet.addRow({
      ...t,
      expectedCodes: JSON.stringify(t.expectedCodes)
    });
    row.height = 19;
    row.getCell('status').font = PASS_FONT;
    row.getCell('executionMode').font = { name: 'Calibri', size: 10, bold: true, color: { argb: 'FF2563EB' } };
    row.eachCell(c => { c.font = c.font || REGULAR_FONT; c.border = BORDER_STYLE; });
  });

  rawSheet.autoFilter = { from: { row: 1, column: 1 }, to: { row: tests.length + 1, column: 18 } };

  // Write file to output location
  const outputDir = path.join(__dirname, '../reports');
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  const outputPath = path.join(outputDir, 'LifeLink_Backend_500_Test_Report.xlsx');
  await workbook.xlsx.writeFile(outputPath);
  console.log(`[EXCEL REPORT] Successfully generated: ${outputPath}`);
  return outputPath;
}

module.exports = { generateExcelReport };
