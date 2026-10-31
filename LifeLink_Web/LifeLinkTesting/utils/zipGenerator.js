// Web/LifeLinkTesting/utils/zipGenerator.js
const AdmZip = require('adm-zip');
const fs = require('fs');
const path = require('path');

function generateReportsZip() {
  const excelPath = path.join(__dirname, '../reports/excel/LifeLink_Web_500_Test_Report.xlsx');
  const htmlPath = path.join(__dirname, '../reports/html/execution-report.html');
  const zipOutputDir = path.join(__dirname, '../reports/zip');

  if (!fs.existsSync(zipOutputDir)) {
    fs.mkdirSync(zipOutputDir, { recursive: true });
  }

  const zipPath = path.join(zipOutputDir, 'LifeLink_Web_Test_Reports.zip');
  const zip = new AdmZip();

  if (fs.existsSync(excelPath)) {
    zip.addLocalFile(excelPath);
  } else {
    console.warn('[ZIP WARNING] Excel report file not found at:', excelPath);
  }

  if (fs.existsSync(htmlPath)) {
    zip.addLocalFile(htmlPath);
  } else {
    console.warn('[ZIP WARNING] HTML report file not found at:', htmlPath);
  }

  zip.writeZip(zipPath);
  console.log(`[ZIP REPORT] Successfully generated: ${zipPath}`);
  return zipPath;
}

module.exports = { generateReportsZip };
