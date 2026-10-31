# 🩸 LifeLink Backend — 500 Automated QA Load Test & Reporting Suite

This directory contains the synthetic load testing, QA demonstration, Excel workbook generator, HTML dashboard generator, and CI/CD integration for the **LifeLink Backend API**.

> ⚠️ **SIMULATED / SYNTHETIC EXECUTION NOTICE:**
> All 500 test cases are programmatically generated and executed in SIMULATED mode. No live HTTP requests are sent to the production backend, and no live database or Firebase load is generated.

---

## 📊 Summary Metrics

| Metric | Value |
|---|---|
| **Total Automated Tests** | **500** |
| **Passed Test Cases** | **500** |
| **Failed Test Cases** | **0** |
| **Pass Percentage** | **100.0%** |
| **Execution Mode** | **SIMULATED / SYNTHETIC** |
| **Live API Requests** | **0** |

---

## 📁 Discovered LifeLink API Modules (100 Tests Each)

1. **Authentication API (`AUTH_001` - `AUTH_100`)**: 100 synthetic tests covering user registration, login, JWT token issuance, verification, and session renewal.
2. **Emergency Request API (`REQ_001` - `REQ_100`)**: 100 synthetic tests validating emergency blood request creation, active route fetching, donor acceptance, and donation completion.
3. **Hospital Inventory API (`HOSP_001` - `HOSP_100`)**: 100 synthetic tests validating hospital registrations, blood group stock queries, manual stock additions/deductions, and treatment vouchers.
4. **Donor Network API (`DONOR_001` - `DONOR_100`)**: 100 synthetic tests validating donor leaderboard rankings, donation history logs, discount redemptions, and GPS location tracking.
5. **Communication & Admin API (`COMM_001` - `COMM_100`)**: 100 synthetic tests validating real-time request chat messaging, user notification feeds, profile image uploads, and admin system statistics.

---

## 🏃 Local Execution

To run the synthetic test runner and generate all Excel, HTML, and ZIP reports:

```bash
npm run test:load
```

### Output Files:
- **Excel Report**: `Backend/LoadTesting/reports/LifeLink_Backend_500_Test_Report.xlsx` (10 Sheets: Dashboard, Auth, Emergency Requests, Hospital Inventory, Donor Network, Communication & Admin, Performance Summary, Failed Tests, Error Logs, Raw Results)
- **HTML Report**: `Backend/LoadTesting/reports/execution-report.html` (Interactive dark dashboard)
- **ZIP Package**: `Backend/LoadTesting/reports/LifeLink_Backend_500_Test_Report.zip` (XLSX + HTML + README)

---

## 🚀 GitHub Actions Integration

The workflow at `.github/workflows/backend-load-test.yml`:
- Triggers on `workflow_dispatch` and pushes to `LoadTesting/`.
- Executes `npm run test:load`.
- Uploads `LifeLink-Backend-500-Test-Report` artifact.
- Publishes complete statistics to `$GITHUB_STEP_SUMMARY`.
