/**
 * HRM bootstrap — everything the standalone HRM server used to do in its own
 * app.js once MongoDB was connected (index cleanup + cron jobs).
 *
 * Called once from the merged backend `index.js` after connectDB() resolves.
 */

const mongoose = require("mongoose");
const cron = require("node-cron");

const {
  autoSyncBangladeshHolidays,
  autoMarkHolidayAttendance,
} = require("./services/HolidayAutoSync");
const { startPayrollCron } = require("./cron/payrollCron");
const attendanceController = require("./controller/attendanceController");

// Fake res object for cron-invoked controllers
const cronRes = {
  status: (code) => ({
    json: (data) => console.log(`[HRM cron] (${code})`, data?.message || data),
  }),
};

async function dropLegacySessionIndex() {
  try {
    const db = mongoose.connection.db;
    await db.collection("sessionlogs").dropIndex("sessionNumber_1");
    console.log(
      "✅ [HRM] Dropped old sessionNumber index — will be recreated as sparse",
    );
  } catch (err) {
    if (err.codeName !== "IndexNotFound") {
      console.error(
        "⚠️ [HRM] Could not drop sessionNumber index:",
        err.message,
      );
    }
  }
}

function scheduleHrmCrons() {
  // Yearly Bangladesh holiday sync → 1 Jan 00:05
  cron.schedule("5 0 1 1 *", async () => {
    try {
      console.log("🗓️ [HRM] Running yearly holiday sync...");
      await autoSyncBangladeshHolidays();
    } catch (err) {
      console.error("❌ [HRM] Yearly holiday sync failed:", err.message);
    }
  });

  // Daily holiday attendance auto-mark → 00:01
  cron.schedule("1 0 * * *", async () => {
    try {
      console.log("⏱️ [HRM] Running daily auto holiday attendance...");
      await autoMarkHolidayAttendance();
    } catch (err) {
      console.error("❌ [HRM] Daily auto attendance failed:", err.message);
    }
  });

  // Daily auto attendance marking → 09:00
  cron.schedule("0 9 * * *", async () => {
    console.log("🕘 [HRM] Running daily auto attendance marking...");
    try {
      await attendanceController.autoMarkAttendance({}, cronRes);
    } catch (error) {
      console.error("❌ [HRM] Auto attendance cron error:", error.message);
    }
  });

  // Payroll auto-generation → 1st of every month
  startPayrollCron();
}

async function initHrm({ runHolidaySyncOnStart = true } = {}) {
  await dropLegacySessionIndex();
  scheduleHrmCrons();

  if (runHolidaySyncOnStart) {
    try {
      await autoSyncBangladeshHolidays();
      await autoMarkHolidayAttendance();
    } catch (err) {
      console.error(
        "❌ [HRM] Initial holiday service run failed:",
        err.message,
      );
    }
  }

  console.log("✅ [HRM] module initialised (routes at /api/v1)");
}

module.exports = { initHrm };
