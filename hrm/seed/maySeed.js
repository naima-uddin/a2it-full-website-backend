/**
 * Full DB Reset + May 2026 Complete Seed
 *
 * Clears: Attendance, Payroll, Holidays, OfficeSchedule, TemporarySchedule
 * Seeds:  2026 Bangladesh holidays, OfficeSchedule (Fri+Sat),
 *         May 2026 attendance (all employees), May 2026 payrolls
 *
 * Run: node src/seed/maySeed.js
 */

const mongoose = require('mongoose');
const dotenv   = require('dotenv');
dotenv.config();

const User                   = require('../models/UsersModel');
const Attendance             = require('../models/AttendanceModel');
const Payroll                = require('../models/PayrollModel');
const Holiday                = require('../models/HolidayModel');
const OfficeSchedule         = require('../models/OfficeScheduleModel');
const OfficeScheduleOverride = require('../models/TemporaryOfficeSchedule');
const Leave                  = require('../models/LeaveModel');

const MONTH = 5;
const YEAR  = 2026;

// May 2026 all working days (Fri: 1,8,15,22,29  Sat: 2,9,16,23,30 are off)
const ALL_WORKING_DAYS = [
  3,4,5,6,7,
  10,11,12,13,14,
  17,18,19,20,21,
  24,25,26,27,28,
  31
]; // 21 total

const dt = (day, h = 9, m = 0) =>
  new Date(YEAR, MONTH - 1, day, h, m, 0, 0);

const fmt = (n) =>
  `BDT ${Math.round(n).toLocaleString('en-BD')}`;

// ─────────────────────────────────────────────────────────────────────
// Bangladesh 2026 Public Holidays
// ─────────────────────────────────────────────────────────────────────
const BD_HOLIDAYS_2026 = [
  // National + government
  { title: 'Shaheed Dibosh & International Mother Language Day', date: new Date(2026, 1, 21), type: 'GOVT' },
  { title: 'Independence Day of Bangladesh',                      date: new Date(2026, 2, 26), type: 'GOVT' },
  { title: 'Pohela Boishakh (Bengali New Year)',                  date: new Date(2026, 3, 14), type: 'GOVT' },
  { title: 'Labour Day',                                          date: new Date(2026, 4,  1), type: 'GOVT' },
  { title: 'National Mourning Day',                               date: new Date(2026, 7, 15), type: 'GOVT' },
  { title: 'Bijoy Dibosh (Victory Day)',                          date: new Date(2026, 11,16), type: 'GOVT' },
  // Islamic (approximate 2026 dates)
  { title: 'Eid ul-Fitr (Day 1)',                                 date: new Date(2026, 2, 30), type: 'GOVT' },
  { title: 'Eid ul-Fitr (Day 2)',                                 date: new Date(2026, 2, 31), type: 'GOVT' },
  { title: 'Eid ul-Fitr (Day 3)',                                 date: new Date(2026, 3,  1), type: 'GOVT' },
  { title: 'Eid ul-Adha (Day 1)',                                 date: new Date(2026, 5,  6), type: 'GOVT' },
  { title: 'Eid ul-Adha (Day 2)',                                 date: new Date(2026, 5,  7), type: 'GOVT' },
  { title: 'Eid-e-Miladunnabi',                                   date: new Date(2026, 8,  5), type: 'GOVT' },
  { title: 'Shab-e-Barat',                                        date: new Date(2026, 2,  3), type: 'GOVT' },
  { title: 'Shab-e-Qadr',                                         date: new Date(2026, 2, 27), type: 'GOVT' },
];

// ─────────────────────────────────────────────────────────────────────
// Attendance patterns (one per employee slot, cycled if > 8 employees)
// absent days must be from ALL_WORKING_DAYS
// ─────────────────────────────────────────────────────────────────────
const PATTERNS = [
  // 0 → 18 on-time + 2 late + 1 absent
  { late: [6, 13],          absent: [11] },
  // 1 → 20 on-time + 1 late + 0 absent
  { late: [20],             absent: [] },
  // 2 → 16 on-time + 3 late + 2 absent  (3 lates → 1 day deduction)
  { late: [6, 13, 24],      absent: [11, 19] },
  // 3 → 19 on-time + 1 late + 1 absent
  { late: [13],             absent: [27] },
  // 4 → 17 on-time + 2 late + 2 absent
  { late: [6, 24],          absent: [19, 27] },
  // 5 → perfect (21/21, no lates, no absents)
  { late: [],               absent: [] },
  // 6 → 17 on-time + 4 late + 0 absent  (4 lates → 1 day deduction)
  { late: [4, 13, 24, 28],  absent: [] },
  // 7 → 13 on-time + 3 late + 4 absent  (3 lates → 1 day deduction)
  { late: [6, 13, 24],      absent: [11, 19, 27, 31] },
];

// ─────────────────────────────────────────────────────────────────────
// Compute attendance counts from a pattern
// ─────────────────────────────────────────────────────────────────────
function patternCounts(pat) {
  const absentSet = new Set(pat.absent || []);
  const lateSet   = new Set(pat.late   || []);
  let presentDays = 0, lateDays = 0, absentDays = 0;
  for (const day of ALL_WORKING_DAYS) {
    if (absentSet.has(day)) { absentDays++; continue; }
    presentDays++;
    if (lateSet.has(day)) lateDays++;
  }
  return { presentDays, lateDays, absentDays };
}

// ─────────────────────────────────────────────────────────────────────
// Main
// ─────────────────────────────────────────────────────────────────────
async function main() {
  await mongoose.connect(process.env.MONGO_URI);
  console.log('\n✅  MongoDB connected\n');

  // ── 1. FULL CLEAR ──────────────────────────────────────────────────
  console.log('🗑️   Clearing all data...');
  const [a, p, h, s, o] = await Promise.all([
    Attendance.deleteMany({}),
    Payroll.deleteMany({}),
    Holiday.deleteMany({}),
    OfficeSchedule.deleteMany({}),
    OfficeScheduleOverride.deleteMany({}),
  ]);
  console.log(`    Attendance  : ${a.deletedCount} deleted`);
  console.log(`    Payroll     : ${p.deletedCount} deleted`);
  console.log(`    Holidays    : ${h.deletedCount} deleted`);
  console.log(`    Schedule    : ${s.deletedCount} deleted`);
  console.log(`    Overrides   : ${o.deletedCount} deleted\n`);

  // ── 2. OFFICE SCHEDULE ─────────────────────────────────────────────
  console.log('📅  Office Schedule → Friday + Saturday off');
  await OfficeSchedule.create({ weeklyOffDays: ['Friday', 'Saturday'], isActive: true });
  console.log('    ✓ Done\n');

  // ── 3. 2026 HOLIDAYS ───────────────────────────────────────────────
  console.log('🎌  Bangladesh 2026 Holidays');
  await Holiday.insertMany(
    BD_HOLIDAYS_2026.map(h => ({
      title:    h.title,
      date:     h.date,
      type:     h.type,
      year:     2026,
      isActive: true,
      source:   'ADMIN',
    }))
  );
  console.log(`    ✓ ${BD_HOLIDAYS_2026.length} holidays inserted`);

  // May working-day holidays (Labour Day = Friday → already weekend, no impact)
  const mayHolidaysOnWorkday = BD_HOLIDAYS_2026.filter(h => {
    const d = h.date;
    if (d.getFullYear() !== YEAR || d.getMonth() + 1 !== MONTH) return false;
    const day = d.toLocaleDateString('en-US', { weekday: 'long' });
    return !['Friday','Saturday'].includes(day);
  });
  const HOLIDAY_COUNT    = mayHolidaysOnWorkday.length;   // 0
  const WEEKLY_OFF_COUNT = 10;                            // 5×Fri + 5×Sat
  const WORKING_DAYS     = ALL_WORKING_DAYS.length;       // 21

  console.log(`    May ${YEAR}: ${WORKING_DAYS} working days | ${WEEKLY_OFF_COUNT} weekends | ${HOLIDAY_COUNT} workday holiday\n`);

  // ── 4. FETCH USERS ─────────────────────────────────────────────────
  const adminUser = await User.findOne({ role: { $in: ['admin','superAdmin'] }, isActive: true })
    .select('_id firstName lastName')
    .lean();
  if (!adminUser) { console.log('❌  No admin found. Exiting.\n'); await mongoose.disconnect(); return; }
  console.log(`👤  Admin: ${adminUser.firstName} ${adminUser.lastName} (${adminUser._id})\n`);

  const employees = await User.find({
    role:      'employee',
    isActive:  true,
    isDeleted: { $ne: true },
  })
    .select('_id firstName lastName employeeId salary department designation')
    .lean();

  console.log(`👥  Found ${employees.length} employees\n`);
  if (!employees.length) {
    console.log('❌  No employees. Exiting.\n');
    await mongoose.disconnect();
    return;
  }

  // ── 5. ATTENDANCE ──────────────────────────────────────────────────
  console.log('📋  Creating May 2026 attendance records...\n');
  const attendanceDocs = [];

  for (let i = 0; i < employees.length; i++) {
    const emp     = employees[i];
    const pat     = PATTERNS[i % PATTERNS.length];
    const absent  = new Set(pat.absent || []);
    const late    = new Set(pat.late   || []);
    const counts  = patternCounts(pat);

    for (const day of ALL_WORKING_DAYS) {
      if (absent.has(day)) continue;
      const isLate = late.has(day);
      const inMin  = isLate ? 35 : 0;
      attendanceDocs.push({
        employee:    emp._id,
        employeeId:  emp.employeeId,
        date:        dt(day),
        clockIn:     dt(day, 9, inMin),
        clockOut:    dt(day, 18, 0),
        totalHours:  9 - inMin / 60,
        status:      isLate ? 'Late' : 'Present',
        isLate,
        lateMinutes: isLate ? 35 : 0,
        isDeleted:   false,
        autoMarked:  false,
        ipAddress:   '0.0.0.0',
        device:      { type: 'system', os: 'Seed', browser: 'Seed', userAgent: 'Seed Script' },
      });
    }

    const lateDeductDays = Math.floor(counts.lateDays / 3);
    console.log(
      `    ${(emp.firstName + ' ' + emp.lastName).padEnd(22)}` +
      ` P:${String(counts.presentDays).padStart(2)}` +
      ` L:${String(counts.lateDays).padStart(2)}` +
      ` A:${String(counts.absentDays).padStart(2)}` +
      (lateDeductDays ? `  ⚠ ${lateDeductDays} late-deduction day` : '')
    );
  }

  await Attendance.insertMany(attendanceDocs);
  console.log(`\n    ✓ ${attendanceDocs.length} records inserted\n`);

  // ── 6. PAYROLL ─────────────────────────────────────────────────────
  console.log('💰  Calculating & saving May 2026 payrolls...\n');

  const results = [];

  for (let i = 0; i < employees.length; i++) {
    const emp  = employees[i];
    const sal  = emp.salary || 0;
    const pat  = PATTERNS[i % PATTERNS.length];
    const c    = patternCounts(pat);

    if (!sal) {
      console.log(`    ⚠  ${emp.firstName} ${emp.lastName} — no salary set, skipping`);
      continue;
    }

    const dailyRate        = Math.round(sal / WORKING_DAYS);
    const hourlyRate       = Math.round(dailyRate / 8);
    const lateDeductDays   = Math.floor(c.lateDays / 3);
    const lateDeduction    = lateDeductDays * dailyRate;
    const absentDeduction  = c.absentDays * dailyRate;
    const basicPay         = c.presentDays * dailyRate;

    // Use new Payroll(...).save() so the pre-save hook runs
    // (calculates totals, inWords, etc.)
    const payroll = new Payroll({
      employee:    emp._id,
      employeeName:`${emp.firstName} ${emp.lastName}`,
      employeeId:  emp.employeeId,
      department:  emp.department   || '',
      designation: emp.designation  || '',
      periodStart: new Date(YEAR, MONTH - 1, 1),
      periodEnd:   new Date(YEAR, MONTH,     0),
      month:       MONTH,
      year:        YEAR,
      status:      'Pending',

      salaryDetails: {
        monthlySalary: sal,
        dailyRate,
        hourlyRate,
        currency:          'BDT',
        calculationBasis:  `Dynamic: ${sal} ÷ ${WORKING_DAYS} days = ${dailyRate} BDT/day`,
      },

      attendance: {
        totalWorkingDays:     WORKING_DAYS,
        presentDays:          c.presentDays,
        absentDays:           c.absentDays,
        lateDays:             c.lateDays,
        leaveDays:            0,
        halfDays:             0,
        holidays:             HOLIDAY_COUNT,
        weeklyOffs:           WEEKLY_OFF_COUNT,
      },

      monthInfo: {
        totalHolidays:  HOLIDAY_COUNT,
        totalWeeklyOffs:WEEKLY_OFF_COUNT,
        weeklyOffDays:  ['Friday', 'Saturday'],
      },

      earnings: {
        basicPay,
      },

      deductions: {
        lateDeduction,
        absentDeduction,
      },

      summary: {
        netPayable: Math.max(0, basicPay - lateDeduction - absentDeduction),
      },

      calculationNotes: {
        calculationNote:
          `Seed: ${sal} ÷ ${WORKING_DAYS} = ${dailyRate}/day | ` +
          `Present ${c.presentDays} × ${dailyRate} = ${basicPay} | ` +
          `Late(${c.lateDays}÷3=${lateDeductDays})×${dailyRate}=${lateDeduction} | ` +
          `Absent ${c.absentDays}×${dailyRate}=${absentDeduction}`,
      },

      calculation: {
        method:      'auto_backend',
        dataSources: ['attendance', 'holidays', 'office_schedule'],
        calculationNotes: `Bulk seed — May ${YEAR}`,
      },

      metadata: {
        isAutoGenerated: true,
        attendanceBased: true,
        batchId: `SEED-MAY-${YEAR}`,
      },

      createdBy: adminUser._id,
    });

    await payroll.save();
    results.push({ emp, payroll, c, dailyRate, lateDeductDays, lateDeduction, absentDeduction, basicPay });
  }

  // ── 7. SUMMARY TABLE ───────────────────────────────────────────────
  const W = 105;
  console.log('\n' + '═'.repeat(W));
  console.log(
    'Employee'.padEnd(22) +
    'Salary'.padStart(10) +
    'Days'.padStart(6)  +
    'Rate/day'.padStart(10) +
    'Present'.padStart(9)  +
    'Late'.padStart(6)  +
    'Absent'.padStart(8)  +
    'LateDeduct'.padStart(11) +
    'AbsDeduct'.padStart(10)  +
    'NET PAY'.padStart(11)
  );
  console.log('─'.repeat(W));

  let totSal = 0, totDed = 0, totNet = 0;
  for (const r of results) {
    const net = r.payroll.summary.netPayable;
    const ded = r.lateDeduction + r.absentDeduction;
    totSal += r.emp.salary;
    totDed += ded;
    totNet += net;
    console.log(
      `${emp2name(r.emp).padEnd(22)}` +
      `${String(r.emp.salary).padStart(10)}` +
      `${String(WORKING_DAYS).padStart(6)}` +
      `${String(r.dailyRate).padStart(10)}` +
      `${String(r.c.presentDays).padStart(9)}` +
      `${String(r.c.lateDays).padStart(6)}` +
      `${String(r.c.absentDays).padStart(8)}` +
      `${String(r.lateDeduction).padStart(11)}` +
      `${String(r.absentDeduction).padStart(10)}` +
      `${String(net).padStart(11)}`
    );
  }

  console.log('─'.repeat(W));
  console.log(
    'TOTAL'.padEnd(22) +
    String(totSal).padStart(10) +
    ' '.repeat(39) +
    String(totDed).padStart(11) +
    ' '.repeat(10) +
    String(totNet).padStart(11)
  );
  console.log('═'.repeat(W));

  // ── 8. DETAILED BREAKDOWN ──────────────────────────────────────────
  console.log('\n\n📊  DETAILED BREAKDOWN\n');
  for (const r of results) {
    const net = r.payroll.summary.netPayable;
    console.log(`┌─ ${r.emp.firstName} ${r.emp.lastName} (${r.emp.employeeId})`);
    console.log(`│  Salary ${fmt(r.emp.salary)}  ÷  ${WORKING_DAYS} days  =  ${fmt(r.dailyRate)}/day`);
    console.log(`│  Attendance → Present: ${r.c.presentDays}  Late: ${r.c.lateDays}  Absent: ${r.c.absentDays}`);
    if (r.c.lateDays)   console.log(`│  Late deduction  : ${r.c.lateDays} lates ÷ 3 = ${r.lateDeductDays} day(s) × ${fmt(r.dailyRate)} = ${fmt(r.lateDeduction)}`);
    if (r.c.absentDays) console.log(`│  Absent deduction: ${r.c.absentDays} days × ${fmt(r.dailyRate)} = ${fmt(r.absentDeduction)}`);
    if (!r.c.lateDays && !r.c.absentDays) console.log(`│  No deductions — perfect attendance`);
    console.log(`└─ NET PAYABLE: ${fmt(r.basicPay)} − ${fmt(r.lateDeduction + r.absentDeduction)} = ${fmt(net)}\n`);
  }

  console.log(`\n✅  Done! Seeded:\n`);
  console.log(`   • ${BD_HOLIDAYS_2026.length} Bangladesh 2026 holidays`);
  console.log(`   • ${attendanceDocs.length} attendance records (May ${YEAR})`);
  console.log(`   • ${results.length} payroll records (May ${YEAR}, status: Pending)`);
  console.log(`\n   Total payroll for May: ${fmt(totNet)}`);
  console.log(`   Open the Payroll page → filter May ${YEAR} → Approve → Mark Paid.\n`);

  await mongoose.disconnect();
}

const emp2name = (emp) => `${emp.firstName} ${emp.lastName}`;

main().catch(err => {
  console.error('\n❌  Seed failed:', err.message || err);
  process.exit(1);
});
