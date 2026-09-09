/* =========================================================================
   config.js
   -------------------------------------------------------------------------
   The ONLY file you need to touch to connect this frontend to real data.
   Every screen calls functions on `DataService` — nothing else in the app
   cares whether data came from the mock generator, a Google Sheet, your
   biometric middleware, or an HR/payroll backend.

   HOW THE REAL INTEGRATION WORKS
   -------------------------------------------------------------------------
   1) EMPLOYEE MASTER DATA (Google Sheets)
      Publish a Google Apps Script Web App bound to your "Employee Master"
      sheet: doGet(e) returns the roster as JSON, doPost(e) handles
      add/update/deactivate so HR edits made here write back to the sheet.

   2) PUNCH IN / PUNCH OUT (Biometric machine -> local middleware -> Sheets)
      Your device (ZKTeco / eSSL / etc.) pushes punches to a small local
      middleware service, which appends rows to an "Attendance Log" sheet
      or database and exposes REST endpoints this page can poll:
        GET /api/attendance, GET /api/sync-status, POST /api/sync-now

   3) LEAVE / REGULARIZATION / NOTIFICATIONS / PAYROLL
      These are workflow + calculation features, not raw device data — in
      production they'd live in your HR backend (or a "Requests" and
      "Notifications" sheet/table) with endpoints like:
        GET/POST /api/requests, POST /api/requests/:id/review
        GET      /api/notifications
        GET      /api/payroll/:empId?month=YYYY-MM
      Approving a request server-side should also write the leave-balance
      or corrected punch back to your system of record.

   4) AUTH
      The login here is a CLIENT-SIDE DEMO ONLY. Authenticate against your
      backend or SSO and issue a real session token before going live.

   Until those endpoints exist, USE_MOCK_DATA stays true and everything —
   including employee edits, leave approvals, and payroll — runs against
   the in-memory generator in mockData.js so the whole product is fully
   demoable today.
   ========================================================================= */

const APP_CONFIG = {
  USE_MOCK_DATA: true,

  GOOGLE_SHEETS_EMPLOYEES_URL: "https://script.google.com/macros/s/REPLACE_WITH_YOUR_DEPLOYMENT_ID/exec",
  BIOMETRIC_MIDDLEWARE_URL: "https://REPLACE_WITH_YOUR_LOCAL_MIDDLEWARE/api",
  HR_BACKEND_URL: "https://REPLACE_WITH_YOUR_HR_BACKEND/api",

  COMPANY_NAME: "Northbridge Industries",
  SHIFT_START: "09:30",
  SHIFT_END: "18:30",
  LATE_GRACE_MINUTES: 15,
  SYNC_POLL_INTERVAL_MS: 15000,
  NOTIF_POLL_INTERVAL_MS: 20000,
};

const DataService = {
  /* ------------------------------ employees ------------------------------ */
  async fetchEmployees() {
    if (APP_CONFIG.USE_MOCK_DATA) return MockData.getEmployees();
    const res = await fetch(APP_CONFIG.GOOGLE_SHEETS_EMPLOYEES_URL);
    if (!res.ok) throw new Error("Failed to load employee master data");
    return res.json();
  },
  async addEmployee(data) {
    if (APP_CONFIG.USE_MOCK_DATA) return MockData.addEmployee(data);
    const res = await fetch(`${APP_CONFIG.HR_BACKEND_URL}/employees`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) });
    if (!res.ok) throw new Error("Failed to add employee");
    return res.json();
  },
  async updateEmployee(empId, patch) {
    if (APP_CONFIG.USE_MOCK_DATA) return MockData.updateEmployee(empId, patch);
    const res = await fetch(`${APP_CONFIG.HR_BACKEND_URL}/employees/${empId}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(patch) });
    if (!res.ok) throw new Error("Failed to update employee");
    return res.json();
  },
  async setEmployeeStatus(empId, status) {
    if (APP_CONFIG.USE_MOCK_DATA) return MockData.setEmployeeStatus(empId, status);
    const res = await fetch(`${APP_CONFIG.HR_BACKEND_URL}/employees/${empId}/status`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status }) });
    if (!res.ok) throw new Error("Failed to update employee status");
    return res.json();
  },

  /* ------------------------------ attendance ------------------------------ */
  async fetchAttendance({ empId = null, from = null, to = null } = {}) {
    if (APP_CONFIG.USE_MOCK_DATA) return MockData.getAttendance({ empId, from, to });
    const params = new URLSearchParams();
    if (empId) params.set("empId", empId);
    if (from) params.set("from", from);
    if (to) params.set("to", to);
    const res = await fetch(`${APP_CONFIG.BIOMETRIC_MIDDLEWARE_URL}/attendance?${params}`);
    if (!res.ok) throw new Error("Failed to load attendance records");
    return res.json();
  },
  async fetchSyncStatus() {
    if (APP_CONFIG.USE_MOCK_DATA) return MockData.getSyncStatus();
    const res = await fetch(`${APP_CONFIG.BIOMETRIC_MIDDLEWARE_URL}/sync-status`);
    if (!res.ok) throw new Error("Failed to load device sync status");
    return res.json();
  },
  async pushManualSync() {
    if (APP_CONFIG.USE_MOCK_DATA) return MockData.simulateSync();
    const res = await fetch(`${APP_CONFIG.BIOMETRIC_MIDDLEWARE_URL}/sync-now`, { method: "POST" });
    if (!res.ok) throw new Error("Manual sync failed");
    return res.json();
  },

  /* --------------------------- leave & regularization --------------------------- */
  async fetchLeaveBalances(empId) {
    if (APP_CONFIG.USE_MOCK_DATA) return MockData.getLeaveBalances(empId);
    const res = await fetch(`${APP_CONFIG.HR_BACKEND_URL}/leave-balances/${empId}`);
    if (!res.ok) throw new Error("Failed to load leave balances");
    return res.json();
  },
  async fetchRequests({ empId, status, type } = {}) {
    if (APP_CONFIG.USE_MOCK_DATA) return MockData.getRequests({ empId, status, type });
    const params = new URLSearchParams();
    if (empId) params.set("empId", empId);
    if (status) params.set("status", status);
    if (type) params.set("type", type);
    const res = await fetch(`${APP_CONFIG.HR_BACKEND_URL}/requests?${params}`);
    if (!res.ok) throw new Error("Failed to load requests");
    return res.json();
  },
  async submitLeaveRequest(payload) {
    if (APP_CONFIG.USE_MOCK_DATA) return MockData.submitLeaveRequest(payload);
    const res = await fetch(`${APP_CONFIG.HR_BACKEND_URL}/requests/leave`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
    if (!res.ok) throw new Error("Failed to submit leave request");
    return res.json();
  },
  async submitRegularizationRequest(payload) {
    if (APP_CONFIG.USE_MOCK_DATA) return MockData.submitRegularizationRequest(payload);
    const res = await fetch(`${APP_CONFIG.HR_BACKEND_URL}/requests/regularization`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
    if (!res.ok) throw new Error("Failed to submit regularization request");
    return res.json();
  },
  async reviewRequest(requestId, decision, reviewerNote = "") {
    if (APP_CONFIG.USE_MOCK_DATA) return MockData.reviewRequest(requestId, decision, reviewerNote);
    const res = await fetch(`${APP_CONFIG.HR_BACKEND_URL}/requests/${requestId}/review`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ decision, reviewerNote }) });
    if (!res.ok) throw new Error("Failed to review request");
    return res.json();
  },

  /* ------------------------------ notifications ------------------------------ */
  async fetchNotifications(role, empId) {
    if (APP_CONFIG.USE_MOCK_DATA) return MockData.getNotifications(role, empId);
    const res = await fetch(`${APP_CONFIG.HR_BACKEND_URL}/notifications?role=${role}&empId=${empId || ""}`);
    if (!res.ok) throw new Error("Failed to load notifications");
    return res.json();
  },
  async markNotificationsRead(role, empId, ids = null) {
    if (APP_CONFIG.USE_MOCK_DATA) return MockData.markNotificationsRead(role, empId, ids);
    const res = await fetch(`${APP_CONFIG.HR_BACKEND_URL}/notifications/read`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ role, empId, ids }) });
    if (!res.ok) throw new Error("Failed to mark notifications read");
    return res.json();
  },

  /* ------------------------------ payroll ------------------------------ */
  async fetchPayslip(empId, ym) {
    if (APP_CONFIG.USE_MOCK_DATA) return MockData.getPayslip(empId, ym);
    const res = await fetch(`${APP_CONFIG.HR_BACKEND_URL}/payroll/${empId}?month=${ym}`);
    if (!res.ok) throw new Error("Failed to load payslip");
    return res.json();
  },
  async fetchPayrollSummary(ym) {
    if (APP_CONFIG.USE_MOCK_DATA) return MockData.getPayrollSummary(ym);
    const res = await fetch(`${APP_CONFIG.HR_BACKEND_URL}/payroll/summary?month=${ym}`);
    if (!res.ok) throw new Error("Failed to load payroll summary");
    return res.json();
  },

  /* --------------------------------- auth --------------------------------- */
  async login(role, identifier, password) {
    if (APP_CONFIG.USE_MOCK_DATA) return MockData.authenticate(role, identifier, password);
    throw new Error("Wire this to your real auth backend before going live.");
  },
};
