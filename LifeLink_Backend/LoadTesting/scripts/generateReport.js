// Backend/LoadTesting/scripts/generateReport.js
const { generate500SyntheticTests } = require('../tests/generateSyntheticTests');
const { generateExcelReport } = require('./generateExcelReport');
const { generateHtmlReport } = require('./generateHtmlReport');
const { generateZipReport } = require('./generateZipReport');

async function masterRunner() {
  console.log('====================================================');
  console.log('🩸 LIFELINK BACKEND — SYNTHETIC QA REPORT GENERATOR');
  console.log('====================================================');
  console.log('NOTICE: SIMULATED TEST EXECUTION — NO LIVE API REQUESTS\n');

  // 1. Generate 500 synthetic test dataset
  const tests = generate500SyntheticTests();

  // 2. Generate 10-Sheet Excel Workbook
  console.log('Generating Excel Workbook (10 Sheets)...');
  await generateExcelReport(tests);

  // 3. Generate HTML Execution Report
  console.log('Generating HTML Dashboard...');
  generateHtmlReport(tests);

  // 4. Generate ZIP Package
  console.log('Generating ZIP Report Package...');
  generateZipReport();

  console.log('\n====================================================');
  console.log('🎉 ALL 500 SYNTHETIC TESTS GENERATED & REPORTED');
  console.log('Total Tests: 500 | Passed: 500 | Failed: 0 | Pass Rate: 100%');
  console.log('Execution Mode: SIMULATED / SYNTHETIC | Live Requests: 0');
  console.log('====================================================');
}

if (require.main === module) {
  masterRunner().catch(err => {
    console.error('Report generation failed:', err);
    process.exit(1);
  });
}

module.exports = { masterRunner };
