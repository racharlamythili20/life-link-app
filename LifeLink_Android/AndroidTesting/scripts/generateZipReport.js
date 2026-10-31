// Android/AndroidTesting/scripts/generateZipReport.js
const AdmZip = require('adm-zip');
const fs = require('fs');
const path = require('path');

function generateZipReport() {
  const reportsDir = path.join(__dirname, '../reports');
  const excelPath = path.join(reportsDir, 'LifeLink_Android_500_Test_Report.xlsx');
  const htmlPath = path.join(reportsDir, 'execution-report.html');
  const zipPath = path.join(reportsDir, 'LifeLink_Android_500_Test_Report.zip');

  const zip = new AdmZip();

  if (fs.existsSync(excelPath)) {
    zip.addLocalFile(excelPath);
  } else {
    console.warn('[ZIP WARNING] Excel file not found:', excelPath);
  }

  if (fs.existsSync(htmlPath)) {
    zip.addLocalFile(htmlPath);
  } else {
    console.warn('[ZIP WARNING] HTML file not found:', htmlPath);
  }

  const readmeText = `====================================================
📱 LIFELINK ANDROID — SYNTHETIC E2E QA TEST REPORT PACKAGE
====================================================

IMPORTANT NOTICE:
This report package contains 500 synthetic Android E2E test cases for LifeLink Android (com.lifelink.app).

EXECUTION DETAILS:
- Mode: SYNTHETIC / SIMULATED ANDROID TEST EXECUTION — NO REAL APP TESTING PERFORMED
- Live API Requests Sent: 0
- Android Application Launched: NO
- APK Installed: NO
- Emulator / Device Started: NO
- Appium / ADB Session: NO
- Total Tests: 500
- Passed: 500
- Failed: 0
- Pass Rate: 100%

PACKAGE CONTENTS:
1. LifeLink_Android_500_Test_Report.xlsx (13 Sheets Workbook)
2. execution-report.html (Interactive Dashboard)
3. README.txt (Execution Metadata & Notice)

Generated for LifeLink Android CI/CD QA Pipeline.
`;

  zip.addFile('README.txt', Buffer.from(readmeText, 'utf8'));
  zip.writeZip(zipPath);
  console.log(`[ZIP REPORT] Successfully generated: ${zipPath}`);
  return zipPath;
}

module.exports = { generateZipReport };
