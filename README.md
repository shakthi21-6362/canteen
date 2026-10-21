# Library Management System — Test Case Runner (Group 5)

A clean, responsive, single-page web application and automated test runner for a college Library Management System. Designed according to the Group 5 PRD and Software Testing Assignment requirements.

## 🚀 Key Features

1. **Deterministic Test Execution (TC-01 to TC-08)**:
   - Resets state before each run ensuring 100% repeatability (NFR-02).
   - Starts with all tests in "Not Executed" status.
   - One-click **"Run All Tests"** executes the full suite in milliseconds with live visual progress.
   - Individual **"Run"** buttons allow running and explaining single tests live during class presentations.
   - Expandable **"Trace"** drawer shows preconditions, input actions, and exact assertions for each test.

2. **Defect Demo Simulation**:
   - Includes a **"Simulate Defect"** toggle in the header.
   - Mutates the borrowing rule from `< 3` to `<= 3` (off-by-one bug).
   - Demonstrates that **TC-04 fails immediately with expected vs actual output**, proving the test suite actually catches defects (PRD Step 8 / Section 5).

3. **Live Interactive Simulator (FR-12)**:
   - Hand-test business rules in real time.
   - Issue and return books for students S101–S104 and books B01–B06.
   - Enforces 3-book maximum limit, book availability, and duplicate return prevention.
   - Reactive tables for Students, Book Catalog, and Transaction Audit Log (rejected actions create no transaction records).

4. **Persistence & Export (FR-13 & FR-14)**:
   - Results persist across page refreshes using browser `localStorage`.
   - **"Export CSV"** downloads an RFC-4180 compliant CSV report.
   - **"Print / PDF Report"** applies print styles formatted for formal academic submission.

---

## 📂 Project Structure

```
canteen/
├── index.html                               # Main application entry point
├── styles.css                               # Responsive design tokens, 8px grid, print styles
├── js/
│   ├── library.js                           # Core Library Engine (pure business logic, zero DOM)
│   ├── tests.js                             # Test cases definitions matching soft copy
│   ├── runner.js                            # Deterministic test runner
│   └── app.js                               # UI controller, state sync, exports
├── library-test-runner/                     # Standalone mirror folder matching PRD spec
│   ├── index.html
│   ├── styles.css
│   └── js/ (library.js, tests.js, runner.js, app.js)
├── verify_tests.js                          # Automated Node.js verification script
├── PRD Test Case Runner Website...pdf       # Source PRD
└── Group 5 – Library Management System...pdf # Source Soft Copy Assignment
```

---

## 🏃 How to Run

### Option 1: Direct File Open
Simply double-click `index.html` (or `library-test-runner/index.html`) to open it directly in any web browser (Chrome, Edge, Firefox, Safari). No installation, build steps, or server required!

### Option 2: Local Web Server (Optional)
If you prefer running via a local server:
```bash
npx serve .
# or
python -m http.server 8000
```

### Option 3: Automated CLI Verification
Run the verification script with Node.js:
```bash
node verify_tests.js
```
