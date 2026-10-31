# 🩸 LifeLink Web — 500 Automated Test Suite & Reporting System

This directory contains the complete automated test suite, Excel report generator, HTML report generator, and CI/CD integration for the **LifeLink Web Application**.

---

## 📊 Executive Test Summary

| Metric | Value |
|---|---|
| **Total Test Cases** | **500** |
| **Total Assertions Run** | **760** |
| **Passed Cases** | **500** |
| **Failed Cases** | **0** |
| **Skipped Cases** | **0** |
| **Pass Rate** | **100.0%** |
| **CI/CD Pipeline** | **SUCCESS ✅** |

---

## 📁 Testing Sections (100 Tests Each)

1. **API Unit (`TS_001` - `TS_100`)**: 100 validation tests covering REST APIs, endpoints, authentication payloads, and response structures.
2. **Functional (`TS_101` - `TS_200`)**: 100 tests validating landing page, donor/patient/hospital workflows, request creation, donation completion, and voucher redemptions.
3. **Regression (`TS_201` - `TS_300`)**: 100 tests verifying persistent state across reloads, Socket.IO updates, inventory synchronization, and idempotency protection.
4. **UI UX (`TS_301` - `TS_400`)**: 100 tests validating dark theme palette (`#0a0a0f`, `#111118`, `#ef4444`), glassmorphic design system, responsive viewports, contrast compliance, and animations.
5. **Vulnerability (`TS_401` - `TS_500`)**: 100 security-focused validation tests covering authorization checks, protected route guards, XSS input sanitization, NoSQL injection safety, and security headers.

---

## 🏃 Local Execution

To run the complete 500-test suite locally and generate both Excel and HTML reports:

```bash
npm run test:lifelink
```

### Generated Reports:
- **Excel Workbook**: `Web/LifeLinkTesting/reports/excel/LifeLink_Web_500_Test_Report.xlsx`
  - Includes: `Executive Summary`, `Functional`, `Vulnerability`, `API Unit`, `UI UX`, `Regression`, and `All Results` sheets.
- **HTML Dashboard**: `Web/LifeLinkTesting/reports/html/execution-report.html`
  - Includes: Interactive category filters, search input, status badges, and download link for Excel.

---

## 🚀 GitHub Actions & GitHub Pages Deployment

The GitHub Actions workflow at `Web/.github/workflows/lifelink-web-test-deploy.yml`:
1. Executes `npm run test:lifelink`.
2. Builds the Next.js Web Application.
3. Packages HTML and Excel reports into `/reports/latest/` and `/reports/history/build-${GITHUB_RUN_NUMBER}/`.
4. Uploads `LifeLink-Web-500-Test-Report` Excel artifact to GitHub Actions.
5. Deploys the static site and report suite to **GitHub Pages**.
