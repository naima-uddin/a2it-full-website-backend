const Payroll = require('../models/PayrollModel');
const User = require('../models/UsersModel');
const Attendance = require('../models/AttendanceModel');
const Leave = require('../models/LeaveModel');
const Holiday = require('../models/HolidayModel');
const OfficeSchedule = require('../models/OfficeScheduleModel');
const OfficeScheduleOverride = require('../models/TemporaryOfficeSchedule');
const FoodCost = require('../models/foodCostModel'); 
const Meal = require('../models/mealModel');
const MealSubscription = require('../models/subscriptionMealModel');
const mongoose = require('mongoose');
const momentTZ = require('moment-timezone');
const TIMEZONE = 'Asia/Dhaka';
// ========== HELPER FUNCTIONS ==========

// Round a money value UP to a whole number (e.g. 1022.7272… → 1023); a tiny
// epsilon keeps effectively-whole values (from float noise) unchanged.
const ceilAmount = (n) => {
  const v = Number(n) || 0;
  return v - Math.floor(v) > 1e-6 ? Math.ceil(v) : Math.round(v);
};

// Helper function for currency formatting
const formatCurrency = (amount) => {
  return new Intl.NumberFormat('en-BD', {
    style: 'currency',
    currency: 'BDT',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(amount || 0).replace('BDT', '৳');
};
// ১. প্রথমে এই ফাংশনটি কম্পোনেন্টের ভিতরে যোগ করুন
const handleDownloadPDF = async () => {
  try {
    // jsPDF ডায়নামিক ইমপোর্ট
    const { jsPDF } = await import('jspdf');
    const autoTable = await import('jspdf-autotable').then(module => module.default);
    
    // PDF ডকুমেন্ট তৈরি
    const doc = new jsPDF();
    
    // PDF কন্টেন্ট তৈরি
    const pageWidth = doc.internal.pageSize.width;
    const pageHeight = doc.internal.pageSize.height;
    
    // Header
    doc.setFontSize(24);
    doc.setTextColor(100, 100, 255);
    doc.text("Attendance Report", pageWidth / 2, 20, { align: 'center' });
    
    // Subtitle
    doc.setFontSize(12);
    doc.setTextColor(100, 100, 100);
    doc.text(`Generated on: ${new Date().toLocaleDateString()}`, pageWidth / 2, 30, { align: 'center' });
    
    // Employee Info
    doc.setFontSize(14);
    doc.setTextColor(0, 0, 0);
    let yPos = 45;
    
    const employee = isAdmin && filters.employeeId 
      ? employees.find(e => e._id === filters.employeeId)
      : userData;
    
    doc.text(`Employee: ${employee?.firstName} ${employee?.lastName}`, 20, yPos);
    yPos += 8;
    doc.text(`Employee ID: ${employee?.employeeId || 'N/A'}`, 20, yPos);
    yPos += 8;
    doc.text(`Department: ${employee?.department || 'N/A'}`, 20, yPos);
    yPos += 8;
    doc.text(`Date Range: ${dateRange.startDate} to ${dateRange.endDate}`, 20, yPos);
    yPos += 15;
    
    // Summary Box
    doc.setDrawColor(200, 200, 255);
    doc.setFillColor(240, 240, 255);
    doc.rect(20, yPos, pageWidth - 40, 40, 'F');
    
    doc.setFontSize(12);
    doc.setTextColor(0, 0, 0);
    
    if (summary) {
      const summaryData = [
        [`Present Days: ${summary.presentDays || 0}`, `Absent Days: ${summary.absentDays || 0}`],
        [`Total Hours: ${summary.totalHours?.toFixed(2) || '0.00'}`, `Attendance Rate: ${summary.attendanceRate?.toFixed(1) || '0.0'}%`]
      ];
      
      autoTable(doc, {
        startY: yPos + 5,
        head: [['Summary Statistics']],
        body: summaryData,
        theme: 'grid',
        styles: { fontSize: 10 },
        headStyles: { fillColor: [100, 100, 255], textColor: [255, 255, 255] },
        margin: { left: 25, right: 25 }
      });
    }
    
    yPos += 50;
    
    // Attendance Table
    if (attendance.length > 0) {
      // Table Header
      doc.setFontSize(16);
      doc.setTextColor(100, 100, 255);
      doc.text("Attendance Records", 20, yPos);
      yPos += 10;
      
      // Prepare table data
      const tableData = attendance.map(record => {
        const date = new Date(record.date);
        return [
          date.toLocaleDateString('en-GB'),
          date.toLocaleDateString('en-US', { weekday: 'short' }),
          record.status,
          record.clockIn ? new Date(record.clockIn).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }) : '-',
          record.clockOut ? new Date(record.clockOut).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }) : '-',
          record.totalHours?.toFixed(2) || '0.00'
        ];
      });
      
      // Add table using autoTable
      autoTable(doc, {
        startY: yPos,
        head: [['Date', 'Day', 'Status', 'Clock In', 'Clock Out', 'Hours']],
        body: tableData,
        theme: 'striped',
        headStyles: { fillColor: [100, 100, 255], textColor: [255, 255, 255] },
        alternateRowStyles: { fillColor: [245, 245, 245] },
        styles: { fontSize: 9, cellPadding: 3 },
        margin: { left: 20, right: 20 }
      });
    } else {
      doc.setFontSize(12);
      doc.setTextColor(150, 150, 150);
      doc.text("No attendance records found", pageWidth / 2, yPos, { align: 'center' });
    }
    
    // Footer
    const totalPages = doc.internal.getNumberOfPages();
    for (let i = 1; i <= totalPages; i++) {
      doc.setPage(i);
      doc.setFontSize(8);
      doc.setTextColor(150, 150, 150);
      doc.text(`Page ${i} of ${totalPages}`, pageWidth - 30, pageHeight - 10);
      doc.text("Attendance Management System", 20, pageHeight - 10);
    }
    
    // Save PDF
    const fileName = `attendance_report_${employee?.employeeId || 'all'}_${dateRange.startDate}_${dateRange.endDate}.pdf`;
    doc.save(fileName);
    
    toast.success("PDF downloaded successfully!");
  } catch (error) {
    console.error("PDF generation error:", error);
    toast.error("Failed to generate PDF");
  }
};
// Get month name
const getMonthName = (month) => {
  const months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];
  return months[month - 1] || '';
};

// Helper function: Calculate food cost deduction
// Returns the end date to use for a month's cost calculations.
// For the current (in-progress) month it caps at today so only the days that
// have already passed are counted; completed months use the full month end.
const getMonthCutoffEnd = (month, year) => {
  const fullMonthEnd = new Date(year, month, 0);
  fullMonthEnd.setHours(23, 59, 59, 999);
  const today = new Date();
  const isCurrentMonth =
    year === today.getFullYear() && month - 1 === today.getMonth();
  return isCurrentMonth && today < fullMonthEnd ? today : fullMonthEnd;
};

const calculateFoodCostDeduction = async (month, year) => {
  try {
    // মাসের প্রথম এবং শেষ তারিখ বের করুন
    const startDate = new Date(year, month - 1, 1);
    // Only count food cost up to today for the current (in-progress) month
    const endDate = getMonthCutoffEnd(month, year);

    // 1. মাসের সব Food Cost বিল পান (elapsed days only for current month)
    const foodCosts = await FoodCost.find({
      date: {
        $gte: startDate,
        $lte: endDate
      }
    });
    
    if (foodCosts.length === 0) {
      return {
        totalCost: 0,
        averagePerDay: 0,
        totalDays: 0,
        calculationNote: 'No food costs recorded for this month'
      };
    }
    
    // 2. মাসের মোট Food Cost বের করুন
    const totalCost = foodCosts.reduce((sum, cost) => sum + cost.cost, 0);
    const totalDays = foodCosts.length;
    const averagePerDay = totalCost / totalDays;
    
    // 3. Meal-এ অ্যাপ্রুভড onsite employees পান
    const mealApprovedEmployees = await User.find({
      role: 'employee',
      workLocationType: 'onsite',
      mealRequestStatus: 'approved',
      mealPreference: 'office'
    }).select('_id employeeId firstName lastName');
    
    const totalMealEmployees = mealApprovedEmployees.length;
    
    if (totalMealEmployees === 0) {
      return {
        totalCost: totalCost,
        averagePerDay: averagePerDay,
        totalDays: totalDays,
        calculationNote: 'No meal-approved employees found for this month',
        perEmployeeDeduction: 0,
        totalMealEmployees: 0
      };
    }
    
    // 4. প্রতি employee-এর deduction বের করুন
    const perEmployeeDeduction = Math.round(totalCost / totalMealEmployees);
    
    return {
      totalCost: totalCost,
      averagePerDay: averagePerDay,
      totalDays: totalDays,
      perEmployeeDeduction: perEmployeeDeduction,
      totalMealEmployees: totalMealEmployees,
      mealEmployees: mealApprovedEmployees.map(emp => ({
        id: emp._id,
        employeeId: emp.employeeId,
        name: `${emp.firstName} ${emp.lastName}`
      })),
      calculationNote: `Food cost: ${totalCost} BDT ÷ ${totalMealEmployees} employees = ${perEmployeeDeduction} BDT per employee`
    };
    
  } catch (error) {
    console.error('Food cost calculation error:', error);
    throw error;
  }
};

// Get available food cost bills for dropdown
exports.getFoodCostBillsForPayroll = async (req, res) => {
  try {
    const { month, year } = req.query;
    
    if (!month || !year) {
      return res.status(400).json({
        success: false,
        message: 'Month and year are required'
      });
    }
    
    const startDate = new Date(year, month - 1, 1);
    // Only include bills up to today for the current (in-progress) month
    const endDate = getMonthCutoffEnd(parseInt(month), parseInt(year));

    // Food cost bills for the selected month (elapsed days only for current month)
    const foodCosts = await FoodCost.find({
      date: {
        $gte: startDate,
        $lte: endDate
      }
    }).sort({ date: 1 });
    
    // Calculate total cost
    const totalCost = foodCosts.reduce((sum, cost) => sum + cost.cost, 0);
    
    // Get meal-approved employees
    const mealApprovedEmployees = await User.find({
      role: 'employee',
      workLocationType: 'onsite',
      mealRequestStatus: 'approved',
      mealPreference: 'office'
    }).select('employeeId firstName lastName department');
    
    const totalMealEmployees = mealApprovedEmployees.length;
    const perEmployeeDeduction = totalMealEmployees > 0 ? Math.round(totalCost / totalMealEmployees) : 0;
    
    res.status(200).json({
      success: true,
      data: {
        month: month,
        year: year,
        monthName: new Date(year, month - 1).toLocaleString('default', { month: 'long' }),
        
        foodCosts: foodCosts.map(cost => ({
          id: cost._id,
          date: cost.date,
          cost: cost.cost,
          note: cost.note || ''
        })),
        
        summary: {
          totalCost: totalCost,
          totalDays: foodCosts.length,
          averagePerDay: foodCosts.length > 0 ? totalCost / foodCosts.length : 0,
          totalMealEmployees: totalMealEmployees,
          perEmployeeDeduction: perEmployeeDeduction,
          totalDeductionAmount: perEmployeeDeduction * totalMealEmployees
        },
        
        mealEmployees: mealApprovedEmployees.map(emp => ({
          id: emp._id,
          employeeId: emp.employeeId,
          name: `${emp.firstName} ${emp.lastName}`,
          department: emp.department
        })),
        
        calculation: {
          formula: 'Total Food Cost ÷ Number of Meal-Approved Employees',
          example: `${totalCost} BDT ÷ ${totalMealEmployees} employees = ${perEmployeeDeduction} BDT each`
        }
      }
    });
    
  } catch (error) {
    console.error('Get food cost bills error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

const LATE_GRACE_MIN = 10;

// Effective "late" cutoff (decimal hours) for a record — shift start + 10 min
// grace, defaulting to 09:00 when no shift is set. Ported verbatim from the
// attendance route's own getLateThreshold() (HRM_CLIENT/app/attendance/page.js)
// so payroll never derives a different late/on-time boundary than what's shown
// on the attendance page for the exact same record.
const getLateThresholdHours = (rec) => {
  const start = rec?.shift?.start;
  if (start) {
    const [sh, sm] = start.split(':').map(Number);
    return (sh * 60 + sm + LATE_GRACE_MIN) / 60;
  }
  return 9 + LATE_GRACE_MIN / 60;
};

// Clock-in time as decimal hours in Asia/Dhaka local time — matches what a
// Bangladesh-based browser computes from the same ISO timestamp via
// `new Date(iso).getHours()` on the attendance page, regardless of the
// server's own timezone.
const clockInHours = (iso) => {
  if (!iso) return null;
  const m = momentTZ.tz(iso, TIMEZONE);
  return m.hours() + m.minutes() / 60;
};

// The Dhaka calendar day ("YYYY-MM-DD") a record belongs to. Attendance dates
// are stored inconsistently (some at UTC midnight, some at Dhaka midnight =
// 18:00Z the previous day), so bucketing by the server's local date puts the
// same logical day into two different buckets. The attendance page buckets by
// Asia/Dhaka day — payroll must use the identical rule.
const dhakaDayKey = (date) => momentTZ.tz(date, TIMEZONE).format('YYYY-MM-DD');

// When two records land on the same Dhaka day (duplicates exist in the DB
// precisely because of the mixed date encodings above), pick one winner
// deterministically: an admin-corrected record always beats an auto-generated
// one; otherwise the most recently updated record wins.
const pickBetterRecord = (a, b) => {
  if (!b) return a;
  if (!a) return b;
  const aCorr = a.correctedByAdmin === true;
  const bCorr = b.correctedByAdmin === true;
  if (aCorr !== bCorr) return aCorr ? a : b;
  return new Date(a.updatedAt || 0) >= new Date(b.updatedAt || 0) ? a : b;
};

// present | late | miss | leave | halfday — ported verbatim from the
// attendance route's own classifyRec() so a record is never bucketed
// differently here than it is on the attendance page.
const classifyAttendanceRecord = (rec) => {
  const status = rec?.status || '';
  if (status.toLowerCase().includes('leave')) return 'leave';
  if (status === 'Half Day') return 'halfday';
  if (status === 'Absent') return 'miss';
  if (status === 'Late') return 'late';
  if (status === 'Present' || status === 'Early') {
    const hours = clockInHours(rec?.clockIn);
    if (hours !== null && hours < 12 && hours > getLateThresholdHours(rec) + 1e-9) return 'late';
    return 'present';
  }
  // Fallback for generic/unknown statuses (e.g. "Clocked In")
  const hours = clockInHours(rec?.clockIn);
  if (hours === null) return 'miss';
  if (hours >= 12) return 'miss';
  if (hours > getLateThresholdHours(rec) + 1e-9) return 'late';
  return 'present';
};

// Calculate working days dynamically: calendar days - weekly offs - holidays
const calculateWorkingDays = async (employeeId, month, year) => {
  try {
    const startDate    = new Date(year, month - 1, 1);
    const fullMonthEnd = new Date(year, month, 0); // last day of the month

    // If this is the current (in-progress) month, only COUNT ATTENDANCE up to
    // today (the days that have already passed). The daily-rate divisor still
    // uses the FULL month's working days so the rate stays correct.
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const isCurrentMonth =
      year === today.getFullYear() && month - 1 === today.getMonth();
    // endDate = the last day we count attendance for (today if current month)
    const endDate = isCurrentMonth && today < fullMonthEnd ? today : fullMonthEnd;

    // Load weekly off days - check temp override first, then default
    const schedule = await OfficeSchedule.findOne({ isActive: true });
    const defaultWeeklyOffDays = schedule?.weeklyOffDays || ['Friday', 'Saturday'];

    // Load all active overrides overlapping this month
    const overrides = await OfficeScheduleOverride.find({
      isActive: true,
      startDate: { $lte: endDate },
      endDate: { $gte: startDate }
    }).lean();

    // Get effective weekly off days for a specific date (override takes priority)
    const getWeeklyOffDaysForDate = (date) => {
      const d = new Date(date); d.setHours(12, 0, 0, 0);
      const ov = overrides.find(o => new Date(o.startDate) <= d && d <= new Date(o.endDate));
      return ov ? ov.weeklyOffDays : defaultWeeklyOffDays;
    };

    // Load holidays for the FULL month (used for the working-days divisor).
    // Fetch with a ±1 day margin and bucket by Dhaka day — holiday dates share
    // the same mixed encodings as attendance dates.
    const monthKey = `${year}-${String(month).padStart(2, '0')}`;
    const holidayFetchStart = new Date(startDate);    holidayFetchStart.setDate(holidayFetchStart.getDate() - 1);
    const holidayFetchEnd   = new Date(fullMonthEnd); holidayFetchEnd.setDate(holidayFetchEnd.getDate() + 1);
    const holidaysRaw = await Holiday.find({
      date: { $gte: holidayFetchStart, $lte: holidayFetchEnd },
      isActive: true
    });
    const holidays = holidaysRaw.filter(h => dhakaDayKey(h.date).startsWith(monthKey));
    const holidayDates = holidays.map(h => dhakaDayKey(h.date));
    const holidayNames = holidays.map(h => h.name);

    // Batch-fetch all attendance records for the FULL month (avoids N+1
    // queries), with a ±1 day margin so records stored at Dhaka-midnight
    // (18:00Z the previous day) or UTC-midnight are all captured regardless
    // of the server's timezone; then keep only those whose DHAKA day falls in
    // this month. We fetch the whole month (not just up to today) so that any
    // records that exist for later dates — e.g. imported ahead — count too.
    const attFetchStart = new Date(startDate);    attFetchStart.setDate(attFetchStart.getDate() - 1);
    const attFetchEnd   = new Date(fullMonthEnd); attFetchEnd.setDate(attFetchEnd.getDate() + 1);
    attFetchEnd.setHours(23, 59, 59, 999);
    const allAttendanceRaw = await Attendance.find({
      employee: employeeId,
      date: { $gte: attFetchStart, $lte: attFetchEnd },
      isDeleted: false
    }).select('date status isLate lateMinutes clockIn shift leaveId correctedByAdmin updatedAt').lean();
    const allAttendance = allAttendanceRaw.filter(a => dhakaDayKey(a.date).startsWith(monthKey));

    // Map Dhaka day ("YYYY-MM-DD") → best attendance record for that day.
    // Duplicates for the same logical day are resolved with the same
    // deterministic winner rule the frontend uses (corrected > latest update).
    const attendanceMap = {};
    allAttendance.forEach(att => {
      const key = dhakaDayKey(att.date);
      attendanceMap[key] = pickBetterRecord(att, attendanceMap[key]);
    });

    // The leave-approval sync always writes the GENERIC status:'Leave' onto the
    // Attendance record (see leaveController.js) — never the specific
    // Paid/Unpaid/Sick/HalfPaid string — so it doesn't tell us on its own
    // whether the day should be deducted. Resolve those via the record's own
    // leaveId first (precise), falling back to a date-range Leave lookup for
    // older records that predate the leaveId link.
    const genericLeaveIds = allAttendance
      .filter(a => a.status === 'Leave' && a.leaveId)
      .map(a => a.leaveId);
    const leaveDocs = genericLeaveIds.length
      ? await Leave.find({ _id: { $in: genericLeaveIds } }).select('payStatus leaveType').lean()
      : [];
    const leaveById = {};
    leaveDocs.forEach(l => { leaveById[l._id.toString()] = l; });

    const rangeLeaves = await Leave.find({
      employee: employeeId,
      status: 'Approved',
      startDate: { $lte: endDate },
      endDate:   { $gte: startDate }
    }).select('startDate endDate payStatus leaveType').lean();
    const findRangeLeave = (d) => rangeLeaves.find(
      (l) => d >= new Date(l.startDate) && d <= new Date(l.endDate)
    );

    // Count actual working days over the FULL month (calendar - weekly offs -
    // holidays). This is the divisor for the daily rate and stays constant
    // regardless of how many days have passed.
    let totalWorkingDays = 0;
    let weeklyOffCount   = 0;
    let holidayCount     = 0;
    // Working days that have already elapsed (up to endDate / today)
    let elapsedWorkingDays = 0;

    for (let d = new Date(startDate); d <= fullMonthEnd; d.setDate(d.getDate() + 1)) {
      const dayName = d.toLocaleDateString('en-US', { weekday: 'long' });
      // Calendar-day key ("YYYY-MM-DD") — matches the Dhaka-day bucketing of
      // attendance/holiday records above. Built from the plain calendar date,
      // NOT the server's timezone rendering of a timestamp.
      const dateStr = `${monthKey}-${String(d.getDate()).padStart(2, '0')}`;
      const effOff = getWeeklyOffDaysForDate(new Date(d));
      if (effOff.includes(dayName))            { weeklyOffCount++; }
      else if (holidayDates.includes(dateStr)) { holidayCount++;   }
      else {
        totalWorkingDays++;
        if (d <= endDate) elapsedWorkingDays++;
      }
    }

    // ── Day-by-day classification — IDENTICAL rules to the attendance route ──
    // presentDays/lateDays/absentDays/leaveDays/halfDays are DISPLAY buckets
    // that match the attendance page's own numbers exactly. Business rule:
    // presentDays INCLUDES paid/sick-leave days (they count as present), and
    // absentDays INCLUDES unpaid-leave days (they count as absent). leaveDays
    // stays as the informational all-leave count. paidDays/unpaidLeaveDays/
    // halfDayDeductionUnits are money accumulators used by the deduction math
    // further down.
    let presentDays = 0;
    let lateDays    = 0;
    let absentDays  = 0;
    let leaveDays   = 0;
    let halfDays    = 0;
    let paidDays    = 0;
    let unpaidLeaveDays = 0;
    let halfDayDeductionUnits = 0;

    // Iterate the FULL month. A day with a record is counted even if the date
    // is still in the "future" (e.g. imported ahead); a working day with NO
    // record counts as absent only once it has actually passed (d <= today) —
    // exactly like the attendance page.
    for (let d = new Date(startDate); d <= fullMonthEnd; d.setDate(d.getDate() + 1)) {
      const dayName = d.toLocaleDateString('en-US', { weekday: 'long' });
      const dateStr = `${monthKey}-${String(d.getDate()).padStart(2, '0')}`;
      const isFutureDay = d > today;

      // Skip non-working days (respects temporary overrides)
      const effOff2 = getWeeklyOffDaysForDate(new Date(d));
      if (effOff2.includes(dayName) || holidayDates.includes(dateStr)) continue;

      const att = attendanceMap[dateStr];

      if (!att) {
        if (!isFutureDay) absentDays++;
        continue;
      }

      const cls = classifyAttendanceRecord(att);
      switch (cls) {
        case 'present':
          presentDays++;
          paidDays++;
          break;

        case 'late':
          presentDays++;
          lateDays++;
          paidDays++;
          break;

        case 'miss':
          absentDays++;
          break;

        case 'halfday':
          halfDays += 1;
          paidDays += 0.5;
          halfDayDeductionUnits += 0.5;
          break;

        case 'leave': {
          // Business rule: Paid Leave and Sick Leave count as PRESENT days
          // (both in the displayed present total and in pay); Unpaid Leave
          // counts as an ABSENT day (displayed and deducted). leaveDays
          // remains the informational count of all leave-classified days.
          leaveDays++;
          const status = att.status;
          if (status === 'Unpaid Leave') {
            absentDays++;
            unpaidLeaveDays += 1;
          } else if (status === 'Half Paid Leave') {
            presentDays += 0.5;
            absentDays  += 0.5;
            paidDays += 0.5;
            unpaidLeaveDays += 0.5;
          } else if (status === 'Sick Leave' || status === 'Paid Leave') {
            presentDays++;
            paidDays += 1;
          } else {
            // Generic "Leave" — resolve the real pay status via the linked
            // Leave document; default to paid if it can't be resolved (a data
            // gap should never silently cost the employee a day's pay).
            const doc = (att.leaveId && leaveById[att.leaveId.toString()]) || findRangeLeave(d);
            if (doc && doc.leaveType !== 'Sick' && doc.payStatus === 'Unpaid') {
              absentDays++;
              unpaidLeaveDays += 1;
            } else if (doc && doc.payStatus === 'HalfPaid') {
              presentDays += 0.5;
              absentDays  += 0.5;
              paidDays += 0.5;
              unpaidLeaveDays += 0.5;
            } else {
              presentDays++;
              paidDays += 1;
            }
          }
          break;
        }
      }
    }

    const calendarDays = fullMonthEnd.getDate();
    const elapsedCalendarDays = endDate.getDate();
    return {
      totalWorkingDays,          // full month working days (rate divisor)
      elapsedWorkingDays,        // working days passed so far (today for current month)
      isPartialMonth: isCurrentMonth && endDate < fullMonthEnd,
      // Display buckets — match the attendance route's own numbers exactly.
      presentDays,
      absentDays,
      leaveDays,
      lateDays,
      halfDays,
      // Money-only buckets — used solely for the deduction math below.
      paidDays,
      unpaidLeaveDays,
      halfDayDeductionUnits,
      holidays:      holidayCount,
      holidayList:   holidayNames,
      weeklyOffs:    weeklyOffCount,
      weeklyOffList: defaultWeeklyOffDays,
      calendarDays,
      elapsedCalendarDays,
      calculationNote: (isCurrentMonth && endDate < fullMonthEnd)
        ? `Partial month (up to day ${elapsedCalendarDays}): ${elapsedWorkingDays} of ${totalWorkingDays} working days elapsed`
        : calendarDays + ' calendar days - ' + weeklyOffCount + ' weekly offs - ' + holidayCount + ' holidays = ' + totalWorkingDays + ' working days'
    };

  } catch (error) {
    console.error('Error calculating working days:', error);
    const calendarDays = new Date(year, month, 0).getDate();
    return {
      totalWorkingDays: calendarDays,
      presentDays: 0, absentDays: 0, leaveDays: 0, lateDays: 0, halfDays: 0,
      paidDays: 0, unpaidLeaveDays: 0, halfDayDeductionUnits: 0,
      holidays: 0, weeklyOffs: 0, calendarDays,
      calculationNote: 'Fallback: using calendar days due to error'
    };
  }
};

// Main payroll calculation function
const calculatePayroll = async (employeeId, monthlySalary, month, year, manualInputs = {}) => {
  try {
    // 1. Get employee details
    const employee = await User.findById(employeeId)
      .select('firstName lastName employeeId department designation email phone');
    
    if (!employee) {
      throw new Error('Employee not found');
    }
    
    // 2. Calculate working days (শুধু ডিডাকশনের জন্য)
    const workDays = await calculateWorkingDays(employeeId, month, year);
    
    // 3. Utility bill (khala bill) is a fixed 500 BDT deduction, but it is no
    // longer taken off the top of the monthly salary. It is applied LAST,
    // after basic pay and attendance deductions are settled — see netPayable
    // below. (adjustedSalary is kept only as a display figure for the slip.)
    const utilityBillDeduction = 500;
    const adjustedSalary = Math.max(0, monthlySalary - utilityBillDeduction);

    // Daily/hourly/overtime rates are derived from the FULL monthly salary
    // divided by actual working days — utility bill plays no part here.
    const dailyRate    = workDays.totalWorkingDays > 0 ? ceilAmount(monthlySalary / workDays.totalWorkingDays) : ceilAmount(monthlySalary / 26);
    const hourlyRate = Math.floor(dailyRate / 8);
    const overtimeRate = Math.floor(hourlyRate * 1.5);

    // Partial (in-progress current) month: pay only for the days already passed.
    const isPartialMonth = workDays.isPartialMonth;

    // Pay earned from paid days so far (present + late + paid leave + half-
    // credit for half-days/half-paid-leave), using the full-month daily rate.
    // NOTE: this intentionally uses workDays.paidDays, NOT workDays.presentDays
    // — presentDays is a DISPLAY bucket that matches the attendance route's own
    // "Present" card (present + late only, no leave folded in); paidDays is the
    // money concept that also credits paid/sick leave so those days aren't
    // short-paid during a partial (in-progress) month.
    const earnedPay = ceilAmount(monthlySalary * workDays.paidDays / (workDays.totalWorkingDays || 1));

    // 4. Basic pay
    //  - Full/completed month: full monthly salary (absences deducted below,
    //    utility bill deducted at the very end from net payable)
    //  - Partial month: only what has been earned for elapsed present days
    const basicPay = isPartialMonth ? earnedPay : monthlySalary;

    // 5. Calculate deductions
    // Late deduction: প্রতি 3 বার লেট = 1 দিনের বেতন কাটা (penalty, applies both cases)
    let lateDeduction = 0;
    let lateDeductionDays = 0;
    let lateDeductionFormula = '';

    if (workDays.lateDays >= 3) {
      lateDeductionDays = Math.floor(workDays.lateDays / 3);
      lateDeduction = lateDeductionDays * dailyRate;
      lateDeductionFormula = `${workDays.lateDays} lates ÷ 3 = ${lateDeductionDays} day(s) deduction`;
    } else {
      lateDeductionFormula = 'Less than 3 lates - no deduction';
    }

    // For a partial month, absent/leave/half-day are already excluded by paying
    // only for present days, so those deductions are 0 (avoids double counting).
    // For a completed month, each category is deducted independently as
    // (day count × daily rate) — NOT "adjustedSalary - earnedPay", which would
    // silently re-deduct leave/half-day pay a second time on top of
    // leaveDeduction/halfDayDeduction below (both are already excluded from
    // presentDays, so earnedPay is short by their amount too).
    const absentDeduction = isPartialMonth ? 0 : (workDays.absentDays * dailyRate);
    // unpaidLeaveDays (not the display-only leaveDays bucket, which also
    // includes paid/sick leave) — only the actually-unpaid portion is deducted.
    const leaveDeduction = isPartialMonth ? 0 : (workDays.unpaidLeaveDays * dailyRate);
    const halfDayDeduction = isPartialMonth ? 0 : Math.floor(workDays.halfDayDeductionUnits * dailyRate);
    
    // Attendance deductions (utility bill is deducted separately, at the very
    // end, from net payable — see below)
    // Cap at monthlySalary so net payable never goes negative
    const calculatedDeductions = lateDeduction + absentDeduction + leaveDeduction + halfDayDeduction;
    const totalDeductions = Math.min(calculatedDeductions, monthlySalary);

    // Calculate deduction percentages
    const deductionBreakdown = {
      late: { amount: lateDeduction, percentage: calculatedDeductions > 0 ? (lateDeduction / calculatedDeductions * 100) : 0 },
      absent: { amount: absentDeduction, percentage: calculatedDeductions > 0 ? (absentDeduction / calculatedDeductions * 100) : 0 },
      leave: { amount: leaveDeduction, percentage: calculatedDeductions > 0 ? (leaveDeduction / calculatedDeductions * 100) : 0 },
      halfDay: { amount: halfDayDeduction, percentage: calculatedDeductions > 0 ? (halfDayDeduction / calculatedDeductions * 100) : 0 }
    };

    // Check if deductions were capped
    const deductionsCapped = calculatedDeductions > monthlySalary;
    const cappedAmount = deductionsCapped ? calculatedDeductions - monthlySalary : 0;
    
    // 6. Process manual inputs
    const manualOvertime = manualInputs.overtime || 0;
    const manualBonus = manualInputs.bonus || 0;
    const manualAllowance = manualInputs.allowance || 0;
    
    // 7. Calculate totals
    const totalOvertime = manualOvertime;
    const totalBonus = manualBonus;
    const totalAllowance = manualAllowance;
    
    const totalEarnings = basicPay + totalOvertime + totalBonus + totalAllowance;

    // OPTION A: Net payable minimum 0
    // Order: earnings - attendance deductions - utility bill (deducted LAST)
    const netPayable = Math.max(0, totalEarnings - totalDeductions - utilityBillDeduction);
    
    // 8. Prepare result
    return {
      employeeDetails: {
        id: employee._id,
        name: `${employee.firstName} ${employee.lastName}`.trim(),
        employeeId: employee.employeeId,
        department: employee.department,
        designation: employee.designation,
        email: employee.email,
        phone: employee.phone
      },
      period: {
        month,
        year,
        startDate: new Date(year, month - 1, 1),
        endDate: new Date(year, month, 0),
        isPartialMonth,
        elapsedWorkingDays: workDays.elapsedWorkingDays,
        totalWorkingDays: workDays.totalWorkingDays,
        calculationBasis: isPartialMonth
          ? `Partial month: paid for ${workDays.paidDays} day(s) of ${workDays.elapsedWorkingDays} elapsed (rate based on ${workDays.totalWorkingDays} full-month working days)`
          : 'Basic pay = Monthly salary (fixed), deductions based on attendance'
      },
      rates: {
        monthlySalary,
        utilityBillDeduction,
        adjustedSalary,
        dailyRate,
        hourlyRate,
        overtimeRate,
        calculationBasis: 'Monthly salary / actual working days, utility bill deducted last from net payable'
      },
      attendance: workDays,
      calculations: {
        basicPay,
        basicPayFormula: isPartialMonth
          ? `Partial month: daily rate ${dailyRate} BDT (${monthlySalary} ÷ ${workDays.totalWorkingDays} working days) × ${workDays.paidDays} paid day(s) = ${basicPay} BDT`
          : `Daily rate: ${dailyRate} BDT (${monthlySalary} ÷ ${workDays.totalWorkingDays} working days) | Basic pay = ${monthlySalary} BDT`,
        overtime: {
          amount: totalOvertime,
          isManual: true,
          note: 'Overtime is manual input only'
        },
        bonus: totalBonus,
        allowance: totalAllowance,
        deductions: {
          late: {
            amount: lateDeduction,
            days: lateDeductionDays,
            totalLateDays: workDays.lateDays,
            formula: lateDeductionFormula
          },
          absent: {
            amount: absentDeduction,
            days: workDays.absentDays,
            formula: `Absent Days (${workDays.absentDays}) × Daily Rate (${dailyRate})`
          },
          leave: {
            amount: leaveDeduction,
            days: workDays.unpaidLeaveDays,
            totalLeaveDays: workDays.leaveDays,
            formula: `Unpaid Leave Days (${workDays.unpaidLeaveDays}) × Daily Rate (${dailyRate})`
          },
          halfDay: {
            amount: halfDayDeduction,
            days: workDays.halfDayDeductionUnits,
            formula: `Half Days (${workDays.halfDayDeductionUnits}) × Daily Rate (${dailyRate})`
          },
          calculatedTotal: calculatedDeductions, // Before capping
          actualTotal: totalDeductions, // After capping
          isCapped: deductionsCapped,
          cappedAmount: deductionsCapped ? cappedAmount : 0,
          breakdown: deductionBreakdown,
          capRule: 'Total deductions cannot exceed monthly salary'
        },
        totals: {
          earnings: totalEarnings,
          deductions: totalDeductions,
          netPayable: netPayable,
          ruleApplied: 'Basic pay = Monthly salary, deductions based on attendance'
        }
      },
      manualInputs: {
        overtime: manualOvertime,
        bonus: manualBonus,
        allowance: manualAllowance
      },
      notes: {
        holidayNote: `${workDays.holidays} holidays in month (not deducted)`,
        weeklyOffNote: `${workDays.weeklyOffs} weekly off days in month (not deducted)`,
        calculationNote: 'Basic pay equals monthly salary. Only deductions based on attendance.',
        deductionNote: deductionsCapped 
          ? `Note: Deductions capped at monthly salary (${formatCurrency(monthlySalary)}). Excess: ${formatCurrency(cappedAmount)} not deducted.`
          : ''
      }
    };
    
  } catch (error) {
    console.error('Payroll calculation error:', error);
    throw error;
  }
};

// Shared meal-deduction calculation (monthly subscription takes priority over
// daily meals) — used by the live preview endpoints so "earned so far" shows
// the same meal deduction that createPayroll applies when the payroll is
// actually generated.
const calculateMealDeductionForEmployee = async (employeeId, month, year, dailyMealRate = 0) => {
  const startDate = new Date(year, month - 1, 1);
  // Cap at today for the current month so meal/food cost only counts elapsed days
  const endDate = getMonthCutoffEnd(month, year);

  const subscription = await MealSubscription.findOne({
    user: employeeId,
    status: 'active',
    isDeleted: false
  });
  const hasSubscription = !!subscription;

  const dailyMeals = await Meal.find({
    user: employeeId,
    date: { $gte: startDate, $lte: endDate },
    status: { $in: ['approved', 'served'] },
    isDeleted: false
  });
  const dailyMealDays = dailyMeals.length;
  const hasDailyMeals = dailyMealDays > 0;

  const monthlyFoodCosts = await FoodCost.find({
    date: { $gte: startDate, $lte: endDate }
  });
  const totalMonthlyFoodCost = monthlyFoodCosts.reduce((sum, cost) => sum + cost.cost, 0);

  const activeSubscribers = await MealSubscription.countDocuments({
    status: 'active',
    isDeleted: false
  });

  if (hasSubscription) {
    const amount = activeSubscribers > 0 ? Math.round(totalMonthlyFoodCost / activeSubscribers) : 0;
    return {
      type: 'monthly_subscription',
      amount,
      calculationNote: `Monthly Subscription: ${totalMonthlyFoodCost} BDT ÷ ${activeSubscribers} subscribers = ${amount} BDT`
    };
  }
  if (hasDailyMeals && dailyMealRate > 0) {
    const amount = dailyMealDays * parseFloat(dailyMealRate);
    return {
      type: 'daily_meal',
      amount,
      calculationNote: `Daily Meal: ${dailyMealDays} days × ${dailyMealRate} BDT = ${amount} BDT`
    };
  }
  return { type: 'none', amount: 0, calculationNote: 'No meal deduction' };
};

// Pre-calculation display function
const displayCalculationDetails = (calculationData) => {
  return {
    preview: true,
    calculationDetails: {
      employee: {
        name: calculationData.employeeDetails?.name,
        employeeId: calculationData.employeeDetails?.employeeId,
        department: calculationData.employeeDetails?.department,
        designation: calculationData.employeeDetails?.designation
      },
      period: {
        month: calculationData.period?.month,
        year: calculationData.period?.year,
        monthName: getMonthName(calculationData.period?.month),
        startDate: calculationData.period?.startDate,
        endDate: calculationData.period?.endDate
      },
      salary: {
        monthly: calculationData.rates?.monthlySalary,
        dailyRate: calculationData.rates?.dailyRate,
        hourlyRate: calculationData.rates?.hourlyRate,
        overtimeRate: calculationData.rates?.overtimeRate
      },
      attendance: {
        totalWorkingDays: calculationData.attendance?.totalWorkingDays,
        presentDays: calculationData.attendance?.presentDays,
        absentDays: calculationData.attendance?.absentDays,
        leaveDays: calculationData.attendance?.leaveDays,
        lateDays: calculationData.attendance?.lateDays,
        halfDays: calculationData.attendance?.halfDays,
        holidays: calculationData.attendance?.holidays,
        weeklyOffs: calculationData.attendance?.weeklyOffs
      },
      earnings: {
        basicPay: calculationData.calculations?.basicPay,
        overtime: calculationData.calculations?.overtime?.amount || 0,
        bonus: calculationData.manualInputs?.bonus || 0,
        allowance: calculationData.manualInputs?.allowance || 0,
        total: calculationData.calculations?.totals?.earnings
      },
      deductions: {
        late: calculationData.calculations?.deductions?.late?.amount || 0,
        absent: calculationData.calculations?.deductions?.absent?.amount || 0,
        leave: calculationData.calculations?.deductions?.leave?.amount || 0,
        halfDay: calculationData.calculations?.deductions?.halfDay?.amount || 0,
        total: calculationData.calculations?.deductions?.actualTotal || 0,
        capped: calculationData.calculations?.deductions?.isCapped || false,
        cappedAmount: calculationData.calculations?.deductions?.cappedAmount || 0
      },
      mealDeduction: {
        type: 'none',
        amount: 0
      },
      onsiteBenefits: {
        included: false,
        serviceCharge: 0,
        teaAllowance: 0,
        netEffect: 0
      },
      summary: {
        grossEarnings: calculationData.calculations?.totals?.earnings,
        totalDeductions: calculationData.calculations?.deductions?.actualTotal,
        netPayable: calculationData.calculations?.totals?.netPayable
      },
      calculationNotes: {
        basis: calculationData.period?.calculationBasis || 'Dynamic working days calculation',
        deductionRules: '3 lates = 1 day deduction, 1 absent/leave = 1 day deduction',
        holidayRule: 'Holidays and weekly offs not deducted'
      }
    }
  };
};

// Employee acceptance এর জন্য নতুন ফাংশন
const handleEmployeeAcceptance = async (payrollId, employeeId, userData) => {
  try {
    const payroll = await Payroll.findById(payrollId);
    if (!payroll) {
      throw new Error('Payroll not found');
    }
    
    // Verify ownership
    if (payroll.employee.toString() !== employeeId.toString()) {
      throw new Error('You can only accept your own payroll');
    }
    
    // Check if already accepted
    if (payroll.employeeAccepted?.accepted) {
      throw new Error('Payroll already accepted');
    }
    
    // Update payroll status and acceptance info
    payroll.status = 'Paid';
    payroll.employeeAccepted = {
      accepted: true,
      acceptedAt: new Date(),
      acceptedBy: employeeId,
      employeeName: userData.name || `${userData.firstName} ${userData.lastName}`,
      employeeId: userData.employeeId
    };
    
    // Add payment info
    payroll.payment = {
      paymentDate: new Date(),
      paymentMethod: 'Employee Accepted',
      transactionId: `EMP_ACCEPT_${Date.now()}_${employeeId}`,
      bankAccount: 'Employee Acceptance',
      paidBy: employeeId,
      paymentNotes: 'Payroll accepted by employee'
    };
    
    // Update metadata
    payroll.metadata.employeeAccepted = true;
    payroll.metadata.acceptedVia = 'employee_portal';
    payroll.metadata.acceptedAt = new Date();
    
    // Mark as modified and save
    payroll.markModified('employeeAccepted');
    payroll.markModified('payment');
    payroll.markModified('metadata');
    
    await payroll.save();
    
    return payroll;
  } catch (error) {
    console.error('Employee acceptance error:', error);
    throw error;
  }
};

// Calculate onsite benefits for payroll
exports.calculateOnsiteBenefitsForPayroll = async (employeeId, month, year, attendanceData) => {
  try {
    const employee = await User.findById(employeeId);
    
    // Check if employee is onsite
    if (employee.workLocationType !== 'onsite') {
      return {
        deduction: 0,
        allowance: 0,
        presentDays: 0,
        netEffect: 0,
        calculationNote: 'Not an onsite employee'
      };
    }
    
    const presentDays = attendanceData.presentDays || 0;
    const halfDays = attendanceData.halfDays || 0;
    
    // Calculate eligible days
    const includeHalfDays = employee.onsiteBenefits?.includeHalfDays !== false;
    const eligibleDays = presentDays + (includeHalfDays ? Math.ceil(halfDays / 2) : 0);
    
    // Get rates from employee data
    const fixedDeduction = employee.onsiteBenefits?.fixedDeduction || 500;
    const dailyRate = employee.onsiteBenefits?.dailyAllowanceRate || 10;
    
    // Calculate benefits
    const allowance = eligibleDays * dailyRate;
    const deduction = fixedDeduction;
    const netEffect = allowance - deduction;
    
    return {
      deduction: deduction,
      allowance: allowance,
      presentDays: eligibleDays,
      netEffect: netEffect,
      calculationNote: `Onsite Benefits: ${eligibleDays} days × ${dailyRate} BDT = ${allowance} - ${deduction} deduction = ${netEffect} BDT`
    };
  } catch (error) {
    console.error('Error calculating onsite benefits:', error);
    return {
      deduction: 0,
      allowance: 0,
      presentDays: 0,
      netEffect: 0,
      calculationNote: 'Error in calculation'
    };
  }
};

// ========== CONTROLLER FUNCTIONS ==========

// 1. Calculate Payroll (Preview)
exports.calculatePayroll = async (req, res) => {
  try {
    const { employeeId, month, year, monthlySalary, ...manualInputs } = req.body;
    
    // Validation
    if (!employeeId || !month || !year || !monthlySalary) {
      return res.status(400).json({
        status: 'fail',
        message: 'Employee ID, month, year, and monthly salary are required'
      });
    }
    
    const calculation = await calculatePayroll(
      employeeId,
      parseInt(monthlySalary),
      parseInt(month),
      parseInt(year),
      manualInputs
    );
    
    res.status(200).json({
      status: 'success',
      message: 'Payroll calculated successfully',
      data: calculation
    });
    
  } catch (error) {
    console.error('Calculate payroll error:', error);
    res.status(500).json({
      status: 'fail',
      message: error.message
    });
  }
};

// Live "as of today" preview for ALL active employees (no DB writes).
// Lets admin/moderator view the current month's payroll before it is generated.
// For the current month the calculation is automatically pro-rated to the days
// that have already passed (see calculateWorkingDays / calculatePayroll).
exports.previewAllPayrolls = async (req, res) => {
  try {
    const month = parseInt(req.query.month);
    const year = parseInt(req.query.year);
    const department = req.query.department;

    if (!month || !year) {
      return res.status(400).json({
        status: 'fail',
        message: 'Month and year are required'
      });
    }

    // Same employee set as bulk generate
    const query = { status: 'active', role: 'employee', salary: { $gt: 0 } };
    if (department && department !== 'All' && department !== 'all') {
      query.department = department;
    }

    const employees = await User.find(query)
      .select('_id firstName lastName employeeId salary department designation workLocationType onsiteBenefits');

    // Which employees already have a saved payroll for this period?
    const existing = await Payroll.find({
      month, year, isDeleted: false
    }).select('employee');
    const savedEmpIds = new Set(existing.map(p => p.employee.toString()));

    const rows = [];
    for (const emp of employees) {
      try {
        const calc = await calculatePayroll(emp._id, emp.salary, month, year, {});
        const mealDeduction = await calculateMealDeductionForEmployee(emp._id, month, year);
        // Onsite employees carry a fixed "service charge" deduction that the
        // actual generated payroll (createPayroll) applies. Expose it here so
        // the preview row's deduction estimate matches what will be saved
        // (otherwise an onsite employee under-shows in the preview and then
        // jumps up once generated).
        const onsiteServiceCharge =
          emp.workLocationType === 'onsite'
            ? (emp.onsiteBenefits?.serviceCharge || 500)
            : 0;
        rows.push({
          _id: `preview-${emp._id}`,
          isPreview: true,
          alreadyGenerated: savedEmpIds.has(emp._id.toString()),
          employee: {
            _id: emp._id,
            firstName: emp.firstName,
            lastName: emp.lastName,
            employeeId: emp.employeeId,
            department: emp.department,
            designation: emp.designation
          },
          employeeId: emp.employeeId,
          month,
          year,
          status: 'Draft',
          salaryDetails: {
            monthlySalary: calc.rates.monthlySalary,
            adjustedSalary: calc.rates.adjustedSalary,
            utilityBillDeduction: calc.rates.utilityBillDeduction,
            dailyRate: calc.rates.dailyRate
          },
          attendance: calc.attendance,
          period: calc.period,
          mealSystemData: { mealDeduction },
          deductions: {
            mealDeduction: mealDeduction.amount,
            foodCostDeduction: mealDeduction.amount,
            serviceCharge: onsiteServiceCharge,
            otherDeductions: onsiteServiceCharge
          }
        });
      } catch (e) {
        // Skip employees that fail to calculate; keep the rest of the list usable
        console.error('Preview calc failed for employee', emp._id?.toString(), e.message);
      }
    }

    res.status(200).json({
      status: 'success',
      data: {
        payrolls: rows,
        count: rows.length,
        isPartialMonth: rows[0]?.period?.isPartialMonth || false
      }
    });

  } catch (error) {
    console.error('Preview all payrolls error:', error);
    res.status(500).json({
      status: 'fail',
      message: error.message
    });
  }
};

// Live "as of today" preview for the LOGGED-IN employee (no DB writes).
// Lets an employee see their own current-month payroll before it is generated.
exports.getMyPayrollPreview = async (req, res) => {
  try {
    const month = parseInt(req.query.month);
    const year = parseInt(req.query.year);
    if (!month || !year) {
      return res.status(400).json({ status: 'fail', message: 'Month and year are required' });
    }

    const user = await User.findById(req.user._id)
      .select('_id firstName lastName employeeId salary department designation');
    if (!user) {
      return res.status(404).json({ status: 'fail', message: 'User not found' });
    }
    if (!user.salary || user.salary <= 0) {
      // No salary configured → nothing to preview
      return res.status(200).json({ status: 'success', data: { payroll: null } });
    }

    const existing = await Payroll.findOne({
      employee: user._id, month, year, isDeleted: false
    }).select('_id');

    const calc = await calculatePayroll(user._id, user.salary, month, year, {});
    const mealDeduction = await calculateMealDeductionForEmployee(user._id, month, year);

    const row = {
      _id: `preview-${user._id}`,
      isPreview: true,
      alreadyGenerated: !!existing,
      employee: {
        _id: user._id,
        firstName: user.firstName,
        lastName: user.lastName,
        employeeId: user.employeeId,
        department: user.department,
        designation: user.designation
      },
      employeeId: user.employeeId,
      month,
      year,
      status: 'Draft',
      salaryDetails: {
        monthlySalary: calc.rates.monthlySalary,
        adjustedSalary: calc.rates.adjustedSalary,
        utilityBillDeduction: calc.rates.utilityBillDeduction,
        dailyRate: calc.rates.dailyRate
      },
      attendance: calc.attendance,
      period: calc.period,
      mealSystemData: { mealDeduction },
      deductions: {
        mealDeduction: mealDeduction.amount,
        foodCostDeduction: mealDeduction.amount
      }
    };

    res.status(200).json({ status: 'success', data: { payroll: row } });

  } catch (error) {
    console.error('Get my payroll preview error:', error);
    res.status(500).json({ status: 'fail', message: error.message });
  }
};

// 2. Preview Payroll Calculation
exports.previewPayroll = async (req, res) => {
  try {
    const {
      employeeId,
      month,
      year,
      monthlySalary,
      overtime = 0,
      bonus = 0,
      allowance = 0,
      dailyMealRate = 0
    } = req.body;
    
    // Validation
    if (!employeeId || !month || !year || !monthlySalary) {
      return res.status(400).json({
        status: 'fail',
        message: 'Employee ID, month, year, and monthly salary are required'
      });
    }
    
    // Get employee
    const employee = await User.findById(employeeId);
    if (!employee) {
      return res.status(404).json({
        status: 'fail',
        message: 'Employee not found'
      });
    }
    
    // Calculate payroll
    const calculation = await calculatePayroll(
      employeeId,
      parseInt(monthlySalary),
      parseInt(month),
      parseInt(year),
      { overtime, bonus, allowance }
    );
    
    // Check meal system
    const startDate = new Date(year, month - 1, 1);
    // Cap at today for the current month so meal/food cost only counts elapsed days
    const endDate = getMonthCutoffEnd(parseInt(month), parseInt(year));
    const currentMonth = `${year}-${String(month).padStart(2, '0')}`;
    
    // Meal system check — any active subscription qualifies
    const subscription = await MealSubscription.findOne({
      user: employeeId,
      status: 'active',
      isDeleted: false
    });

    const hasSubscription = !!subscription;

    const dailyMeals = await Meal.find({
      user: employeeId,
      date: { $gte: startDate, $lte: endDate },
      status: { $in: ['approved', 'served'] },
      isDeleted: false
    });

    const dailyMealDays = dailyMeals.length;
    const hasDailyMeals = dailyMealDays > 0;

    // Food cost calculation
    const monthlyFoodCosts = await FoodCost.find({
      date: { $gte: startDate, $lte: endDate }
    });

    const totalMonthlyFoodCost = monthlyFoodCosts.reduce((sum, cost) => sum + cost.cost, 0);
    // Count all active subscribers (same logic as meal management per-person calc)
    const activeSubscribers = await MealSubscription.countDocuments({
      status: 'active',
      isDeleted: false
    });
    
    // Meal deduction
    let mealDeduction = { type: 'none', amount: 0 };
    
    if (hasSubscription) {
      const deductionPerEmployee = activeSubscribers > 0 ? 
        Math.round(totalMonthlyFoodCost / activeSubscribers) : 0;
      mealDeduction = { type: 'monthly_subscription', amount: deductionPerEmployee };
    } else if (hasDailyMeals && dailyMealRate > 0) {
      const totalAmount = dailyMealDays * parseFloat(dailyMealRate);
      mealDeduction = { type: 'daily_meal', amount: totalAmount };
    }
    
    // Onsite benefits
    let onsiteBenefits = { included: false, serviceCharge: 0, teaAllowance: 0, netEffect: 0 };
    
    if (employee.workLocationType === 'onsite' && employee.role === 'employee') {
      const presentDays = calculation.attendance.presentDays || 0;
      const includeHalfDays = employee.onsiteBenefits?.includeHalfDays !== false;
      const serviceCharge = employee.onsiteBenefits?.serviceCharge || 500;
      const teaAllowanceRate = employee.onsiteBenefits?.dailyAllowanceRate || 10;
      
      const eligibleDays = presentDays + (includeHalfDays ? Math.ceil(calculation.attendance.halfDays / 2) : 0);
      const teaAllowance = eligibleDays * teaAllowanceRate;
      const netOnsiteEffect = teaAllowance - serviceCharge;
      
      onsiteBenefits = {
        included: true,
        serviceCharge,
        teaAllowance,
        netEffect: netOnsiteEffect
      };
    }
    
    // Final calculation
    const totalEarnings = calculation.calculations.basicPay + 
                         parseInt(overtime) + 
                         parseInt(bonus) + 
                         parseInt(allowance) +
                         onsiteBenefits.teaAllowance;
    
    const totalDeductions = calculation.calculations.deductions.actualTotal +
                           mealDeduction.amount +
                           onsiteBenefits.serviceCharge +
                           calculation.rates.utilityBillDeduction;

    const netPayable = Math.max(0, totalEarnings - totalDeductions);

    const previewData = {
      ...displayCalculationDetails(calculation).calculationDetails,
      mealDeduction,
      onsiteBenefits,
      finalSummary: {
        grossEarnings: totalEarnings,
        totalDeductions,
        netPayable,
        status: netPayable <= 0 ? 'INVALID - Zero or Negative' : 'VALID'
      },
      warnings: []
    };
    
    if (calculation.calculations.deductions.isCapped) {
      previewData.warnings.push(`Deductions capped at ${formatCurrency(calculation.rates.monthlySalary)}`);
    }
    
    if (onsiteBenefits.included) {
      previewData.warnings.push(`Onsite benefits: ${onsiteBenefits.teaAllowance} - ${onsiteBenefits.serviceCharge} = ${onsiteBenefits.netEffect} BDT net`);
    }
    
    if (mealDeduction.type !== 'none') {
      previewData.warnings.push(`Meal deduction: ${mealDeduction.amount} BDT (${mealDeduction.type})`);
    }
    
    res.status(200).json({
      status: 'success',
      message: 'Payroll calculation preview',
      preview: true,
      data: previewData
    });
    
  } catch (error) {
    console.error('Preview payroll error:', error);
    res.status(500).json({
      status: 'fail',
      message: error.message
    });
  }
};

// 3. Create Payroll 
exports.createPayroll = async (req, res) => {
  try {
    const {
      employeeId,
      month,
      year,
      monthlySalary,
      overtime = 0,
      bonus = 0,
      allowance = 0,
      notes = '',
      dailyMealRate = 0,
      preview = false
    } = req.body;
    
    // ============ 1. VALIDATION ============
    if (!employeeId || !month || !year || !monthlySalary) {
      return res.status(400).json({
        status: 'fail',
        message: 'Employee ID, month, year, and monthly salary are required'
      });
    }
    
    // Check if payroll exists (preview mode হলে skip করুন)
    if (!preview) {
      const existingPayroll = await Payroll.findOne({
        employee: employeeId,
        month: parseInt(month),
        year: parseInt(year),
        isDeleted: false
      });
      
      if (existingPayroll) {
        return res.status(400).json({
          status: 'fail',
          message: 'Payroll already exists for this employee and month'
        });
      }
    }
    
    // Get employee
    const employee = await User.findById(employeeId);
    if (!employee) {
      return res.status(404).json({
        status: 'fail',
        message: 'Employee not found'
      });
    }
    
    // ============ 2. CALCULATION PREVIEW (মিডলওয়্যার) ============
    // First calculate without saving
    const calculation = await calculatePayroll(
      employeeId,
      parseInt(monthlySalary),
      parseInt(month),
      parseInt(year),
      { overtime, bonus, allowance }
    );
    
    // If preview mode, return calculation details only
    if (preview) {
      return res.status(200).json({
        status: 'success',
        message: 'Payroll calculation preview',
        preview: true,
        data: displayCalculationDetails(calculation)
      });
    }
    
    // ============ 3. AUTO LOAD MEAL DATA ============
    const startDate = new Date(year, month - 1, 1);
    // Cap at today for the current month so meal/food cost only counts elapsed days
    const endDate = getMonthCutoffEnd(parseInt(month), parseInt(year));
    const currentMonth = `${year}-${String(month).padStart(2, '0')}`;
    
    // A. Check Monthly Subscription — any active subscription qualifies
    const subscription = await MealSubscription.findOne({
      user: employeeId,
      status: 'active',
      isDeleted: false
    });

    const hasSubscription = !!subscription;

    // B. Count Daily Meals (Auto)
    const dailyMeals = await Meal.find({
      user: employeeId,
      date: { $gte: startDate, $lte: endDate },
      status: { $in: ['approved', 'served'] },
      isDeleted: false
    });

    const dailyMealDays = dailyMeals.length;
    const hasDailyMeals = dailyMealDays > 0;

    // C. AUTO: Calculate Total Monthly Food Cost
    const monthlyFoodCosts = await FoodCost.find({
      date: { $gte: startDate, $lte: endDate }
    });

    const totalMonthlyFoodCost = monthlyFoodCosts.reduce((sum, cost) => sum + cost.cost, 0);
    const foodCostDays = monthlyFoodCosts.length;
    const averageDailyCost = foodCostDays > 0 ? totalMonthlyFoodCost / foodCostDays : 0;

    // D. Count all active subscribers (same logic as meal management per-person calc)
    const activeSubscribers = await MealSubscription.countDocuments({
      status: 'active',
      isDeleted: false
    });
     
// ============ 4. AUTO MEAL DEDUCTION CALCULATION ============
let mealDeduction = {
  type: 'none',
  amount: 0,
  calculationNote: 'No meal deduction',
  details: {}
};

// ✅ FIXED: EXCLUSIVE LOGIC - Monthly subscription takes priority
if (hasSubscription) {
  // Case 1: Monthly Subscription (EXCLUSIVE)
  const deductionPerEmployee = activeSubscribers > 0 ? 
    Math.round(totalMonthlyFoodCost / activeSubscribers) : 0;
  
  mealDeduction = {
    type: 'monthly_subscription',
    amount: deductionPerEmployee,
    calculationNote: `Monthly Subscription: ${totalMonthlyFoodCost} BDT ÷ ${activeSubscribers} subscribers = ${deductionPerEmployee} BDT`,
    details: {
      totalMonthlyFoodCost,
      foodCostDays,
      averageDailyCost,
      activeSubscribers,
      // ✅ IMPORTANT: Daily meals ignored when monthly subscription exists
      dailyMealsIgnored: hasDailyMeals,
      ignoredDailyMealDays: dailyMealDays,
      note: hasDailyMeals ? 
        `Daily meals (${dailyMealDays} days) ignored due to monthly subscription` : 
        'No daily meals to ignore'
    }
  };
  
  // ✅ Important: Add warning if daily meals exist but ignored
  if (hasDailyMeals) {
    console.warn(`Employee ${employeeId} has monthly subscription (${deductionPerEmployee} BDT) - ${dailyMealDays} daily meals ignored`);
  }
} 
else if (hasDailyMeals && dailyMealRate > 0) {
  // Case 2: Daily Meal (ONLY when NO monthly subscription)
  const totalAmount = dailyMealDays * parseFloat(dailyMealRate);
  
  mealDeduction = {
    type: 'daily_meal',
    amount: totalAmount,
    calculationNote: `Daily Meal: ${dailyMealDays} days × ${dailyMealRate} BDT = ${totalAmount} BDT`,
    details: {
      mealDays: dailyMealDays,
      dailyRate: dailyMealRate,
      calculation: `${dailyMealDays} × ${dailyMealRate}`,
      monthlySubscriptionExists: false,
      note: 'Applied because no monthly subscription'
    }
  };
} 
else {
  // Case 3: No meal system at all
  mealDeduction = {
    type: 'none',
    amount: 0,
    calculationNote: 'No meal subscription or daily meals',
    details: {
      monthlySubscriptionExists: hasSubscription,
      dailyMealsExist: hasDailyMeals,
      note: hasSubscription ? 'Monthly subscription found but no active approval' : 
            hasDailyMeals ? 'Daily meals found but no rate provided' : 
            'No meal records found'
    }
  };
}
    
    // ============ 5. ONSITE BENEFITS CALCULATION ============
    let onsiteBenefitsDetails = {
      serviceCharge: 0,
      teaAllowance: 0,
      totalAllowance: 0,
      totalDeduction: 0,
      presentDays: 0,
      netEffect: 0,
      calculationNote: 'Not an onsite employee'
    };
    
    if (employee.workLocationType === 'onsite' && employee.role === 'employee') {
      const presentDays = calculation.attendance.presentDays || 0;
      const halfDays = calculation.attendance.halfDays || 0;
      
      const includeHalfDays = employee.onsiteBenefits?.includeHalfDays !== false;
      const serviceCharge = employee.onsiteBenefits?.serviceCharge || 500;
      const teaAllowanceRate = employee.onsiteBenefits?.dailyAllowanceRate || 10;
      
      const eligibleDays = presentDays + (includeHalfDays ? Math.ceil(halfDays / 2) : 0);
      const teaAllowance = eligibleDays * teaAllowanceRate;
      const serviceChargeDeduction = serviceCharge;
      const netOnsiteEffect = teaAllowance - serviceChargeDeduction;
      
      onsiteBenefitsDetails = {
        serviceCharge: serviceChargeDeduction,
        teaAllowance: teaAllowance,
        totalAllowance: teaAllowance,
        totalDeduction: serviceChargeDeduction,
        presentDays: eligibleDays,
        netEffect: netOnsiteEffect,
        calculationNote: `Onsite Benefits: Service Charge ${serviceChargeDeduction} BDT + Tea Allowance ${eligibleDays} days × ${teaAllowanceRate} BDT = ${teaAllowance} BDT (Net: ${netOnsiteEffect} BDT)`,
        details: {
          serviceCharge: serviceChargeDeduction,
          teaAllowanceRate: teaAllowanceRate,
          eligibleDays: eligibleDays,
          includeHalfDays: includeHalfDays
        },
        breakdown: {
          teaAllowance: `${eligibleDays} days × ${teaAllowanceRate} BDT = ${teaAllowance} BDT`,
          serviceCharge: `Fixed ${serviceChargeDeduction} BDT`,
          calculation: `Service Charge ${serviceChargeDeduction} - Tea Allowance ${teaAllowance}  = Net ${netOnsiteEffect} BDT`
        }
      };
      
      // Add service charge to total deductions
      calculation.calculations.deductions.actualTotal += serviceChargeDeduction;
      calculation.calculations.deductions.calculatedTotal += serviceChargeDeduction;
      
      calculation.calculations.deductions.breakdown.serviceCharge = {
        amount: serviceChargeDeduction,
        percentage: calculation.calculations.deductions.calculatedTotal > 0 
          ? (serviceChargeDeduction / calculation.calculations.deductions.calculatedTotal * 100) 
          : 0,
        description: 'Onsite Service Charge'
      };
      
      calculation.calculations.deductions.breakdown.teaAllowance = {
        amount: -teaAllowance,
        percentage: 0,
        description: 'Onsite Tea Allowance (Added to earnings)'
      };
    }
    
    // ============ 6. FINAL CALCULATION ============
    const totalEarnings = calculation.calculations.basicPay + 
                         calculation.calculations.overtime.amount + 
                         calculation.calculations.bonus + 
                         calculation.calculations.allowance;
    
    const totalDeductions = calculation.calculations.deductions.actualTotal +
                           mealDeduction.amount +
                           calculation.rates.utilityBillDeduction;

    const netPayable = Math.max(0, totalEarnings - totalDeductions);

    if (netPayable <= 0) {
      return res.status(400).json({
        status: 'fail',
        message: 'Net payable amount is 0 or negative. Cannot create payroll.',
        data: {
          originalCalculation: calculation,
          onsiteBenefits: onsiteBenefitsDetails,
          totals: {
            earnings: totalEarnings,
            deductions: totalDeductions,
            netPayable: netPayable
          }
        },
        warning: 'Deductions equal or exceed earnings. Salary would be 0 or negative.'
      });
    }
    
    // ============ 7. CREATE PAYROLL DOCUMENT ============
    const payroll = new Payroll({
      employee: employeeId,
      employeeName: calculation.employeeDetails.name || employee.fullName,
      employeeId: calculation.employeeDetails.employeeId || employee.employeeId,
      department: calculation.employeeDetails.department || employee.department,
      designation: calculation.employeeDetails.designation || employee.designation,
      
      periodStart: calculation.period.startDate,
      periodEnd: calculation.period.endDate,
      month: parseInt(month),
      year: parseInt(year),
      
      status: 'Pending',
      
      // ============ AUTO MEAL SYSTEM DATA ============
      mealSystemData: {
        subscriptionStatus: hasSubscription,
        dailyMealDays: dailyMealDays,
        hasDailyMeals: hasDailyMeals,
        totalMonthlyFoodCost: totalMonthlyFoodCost,
        foodCostDays: foodCostDays,
        averageDailyCost: averageDailyCost,
        activeSubscribers: activeSubscribers,
        mealDeduction: mealDeduction
      },
      
      // ============ ONSITE BENEFITS DETAILS ============
      onsiteBenefitsDetails: onsiteBenefitsDetails,
      
      // ============ FOOD COST DETAILS ============
      foodCostDetails: {
        included: mealDeduction.type === 'monthly_subscription',
        totalMealCost: totalMonthlyFoodCost,
        fixedDeduction: mealDeduction.amount,
        totalFoodDeduction: mealDeduction.amount,
        mealDays: foodCostDays,
        calculationDate: new Date(),
        selectedBills: monthlyFoodCosts.map(bill => ({
          id: bill._id,
          date: bill.date,
          cost: bill.cost,
          note: bill.note
        })),
        calculationNote: mealDeduction.calculationNote
      },

      salaryDetails: {
        monthlySalary: calculation.rates.monthlySalary,
        utilityBillDeduction: calculation.rates.utilityBillDeduction,
        adjustedSalary: calculation.rates.adjustedSalary,
        dailyRate: calculation.rates.dailyRate,
        hourlyRate: calculation.rates.hourlyRate,
        overtimeRate: calculation.rates.overtimeRate,
        currency: 'BDT',
        calculationBasis: calculation.rates.calculationBasis,
        deductionCap: calculation.calculations.deductions.isCapped
          ? `Capped at ${formatCurrency(calculation.rates.monthlySalary)}`
          : 'No cap applied'
      },
      
      attendance: {
        totalWorkingDays: calculation.attendance.totalWorkingDays,
        presentDays: calculation.attendance.presentDays,
        absentDays: calculation.attendance.absentDays,
        leaveDays: calculation.attendance.leaveDays,
        lateDays: calculation.attendance.lateDays,
        halfDays: calculation.attendance.halfDays,
        holidays: calculation.attendance.holidays,
        weeklyOffs: calculation.attendance.weeklyOffs,
        attendancePercentage: Math.round(
          (calculation.attendance.presentDays / calculation.attendance.totalWorkingDays) * 100
        )
      },
      
      earnings: {
        basicPay: calculation.calculations.basicPay,
        
        overtime: {
          amount: calculation.calculations.overtime.amount,
          hours: 0,
          rate: calculation.rates.overtimeRate,
          source: calculation.calculations.overtime.amount > 0 ? 'manual' : 'none',
          description: calculation.calculations.overtime.amount > 0 ? 'Manual overtime entry' : ''
        },
        
        bonus: {
          amount: calculation.calculations.bonus,
          type: calculation.calculations.bonus > 0 ? 'other' : 'none',
          description: calculation.calculations.bonus > 0 ? 'Manual bonus' : ''
        },
        
        allowance: {
          amount: calculation.calculations.allowance,
          type: calculation.calculations.allowance > 0 ? 'other' : 'none',
          description: calculation.calculations.allowance > 0 ? 
            (onsiteBenefitsDetails.teaAllowance > 0 ? 
              `Manual: ${allowance} + Onsite Tea Allowance: ${onsiteBenefitsDetails.teaAllowance}` : 
              'Manual allowance') : 
            ''
        },
        
        houseRent: 0,
        medical: 0,
        conveyance: 0,
        incentives: 0,
        otherAllowances: onsiteBenefitsDetails.teaAllowance,
        onsiteTeaAllowance: onsiteBenefitsDetails.teaAllowance,
        total: totalEarnings
      },
      
      deductions: {
        lateDeduction: calculation.calculations.deductions.late.amount,
        absentDeduction: calculation.calculations.deductions.absent.amount,
        leaveDeduction: calculation.calculations.deductions.leave.amount,
        halfDayDeduction: calculation.calculations.deductions.halfDay.amount,
        taxDeduction: 0,
        providentFund: 0,
        advanceSalary: 0,
        loanDeduction: 0,
        serviceCharge: onsiteBenefitsDetails.serviceCharge,
        otherDeductions: onsiteBenefitsDetails.serviceCharge,
        utilityBillDeduction: calculation.rates.utilityBillDeduction,
        mealDeduction: mealDeduction.amount || 0,
        foodCostDeduction: mealDeduction.amount || 0,
      
        deductionRules: {
          lateRule: "3 days late = 1 day salary deduction",
          absentRule: "1 day absent = 1 day salary deduction",
          leaveRule: "1 day leave = 1 day salary deduction",
          halfDayRule: "1 half day = 0.5 day salary deduction",
          holidayRule: "Holidays are not deducted",
          weeklyOffRule: "Weekly offs are not deducted",
          capRule: "Total deductions cannot exceed monthly salary",
          netPayableRule: "Net payable minimum 0",
          serviceChargeRule: "Fixed 500 BDT service charge for onsite employees",
          teaAllowanceRule: "10 BDT tea allowance per present day for onsite employees",
          mealDeductionRule: mealDeduction.type === 'monthly_subscription' ? 
            `Food cost (${totalMonthlyFoodCost} BDT) ÷ ${activeSubscribers} active subscribers` :
            mealDeduction.type === 'daily_meal' ?
            `Daily meals: ${dailyMealDays} days × ${dailyMealRate} BDT` :
            'No meal deduction'
        },
        
        total: totalDeductions,
        calculatedTotal: calculation.calculations.deductions.calculatedTotal,
        isCapped: calculation.calculations.deductions.isCapped,
        cappedAmount: calculation.calculations.deductions.cappedAmount,
        deductionBreakdown: calculation.calculations.deductions.breakdown
      },
      
      summary: {
        grossEarnings: totalEarnings,
        totalDeductions: totalDeductions,
        netPayable: netPayable,
        payableDays: calculation.attendance.presentDays,
        deductionCapApplied: calculation.calculations.deductions.isCapped,
        rulesApplied: calculation.calculations.totals.ruleApplied,
        onsiteBenefitsApplied: employee.workLocationType === 'onsite',
        onsiteBenefitsDetails: onsiteBenefitsDetails,
        
        onsiteBreakdown: {
          teaAllowance: onsiteBenefitsDetails.teaAllowance,
          serviceCharge: onsiteBenefitsDetails.serviceCharge,
          netOnsiteEffect: onsiteBenefitsDetails.netEffect,
          foodCostIncluded: mealDeduction.type === 'monthly_subscription',
          foodCostDeduction: mealDeduction.amount,
          netPayable: netPayable
        },
        
        mealSystemSummary: {
          type: mealDeduction.type,
          deduction: mealDeduction.amount,
          calculation: mealDeduction.calculationNote,
          details: {
            monthlyFoodCost: totalMonthlyFoodCost,
            activeSubscribers: activeSubscribers,
            dailyMealDays: dailyMealDays,
            dailyMealRate: dailyMealRate
          }
        }
      },
      
      monthInfo: {
        totalHolidays: calculation.attendance.holidays || 0,
        totalWeeklyOffs: calculation.attendance.weeklyOffs || 0,
        holidayList: calculation.attendance.holidayList || [],
        weeklyOffDays: calculation.attendance.weeklyOffList || []
      },
      
      calculationNotes: {
        holidayNote: calculation.notes?.holidayNote || '',
        weeklyOffNote: calculation.notes?.weeklyOffNote || '',
        calculationNote: calculation.notes?.calculationNote || 'Dynamic working days calculation basis',
        deductionNote: calculation.notes?.deductionNote || '',
        onsiteBenefitsNote: onsiteBenefitsDetails.calculationNote,
        mealDeductionNote: mealDeduction.calculationNote
      },
      
      manualInputs: {
        overtime: parseInt(overtime),
        overtimeHours: 0,
        bonus: parseInt(bonus),
        allowance: parseInt(allowance),
        dailyMealRate: parseFloat(dailyMealRate) || 0,
        enteredBy: req.user._id,
        enteredAt: new Date()
      },
      
      calculation: {
        method: 'auto_backend',
        calculatedDate: new Date(),
        calculatedBy: req.user._id,
        dataSources: [
          'attendance', 
          'leaves', 
          'holidays', 
          'office_schedule', 
          'manual_input',
          'meal_system',
          'food_cost_system'
        ],
        calculationNotes: 'Auto-calculated with dynamic working days + Deduction Cap + Onsite Benefits + Meal System'
      },
      
      metadata: {
        isAutoGenerated: true,
        hasManualInputs: overtime > 0 || bonus > 0 || allowance > 0 || dailyMealRate > 0,
        deductionRulesApplied: true,
        deductionCapApplied: calculation.calculations.deductions.isCapped,
        attendanceBased: true,
        dynamicWorkingDays: true,
        version: '4.0',
        safetyRules: ['Deduction cap = monthly salary', 'Net payable minimum 0'],
        onsiteBenefitsIncluded: employee.workLocationType === 'onsite',
        workLocationType: employee.workLocationType,
        mealSystemIncluded: true,
        foodCostIncluded: mealDeduction.type === 'monthly_subscription',
        foodCostBillsCount: monthlyFoodCosts.length,
        activeSubscribersCount: activeSubscribers,
        mealType: mealDeduction.type
      },
      
      notes: (notes || `Payroll for ${new Date(year, month - 1, 1).toLocaleDateString('en-US', { month: 'long' })} ${year}`) + 
        (mealDeduction.type !== 'none' ? ` | Meal Deduction: ${mealDeduction.amount} BDT (${mealDeduction.type})` : '') +
        (employee.workLocationType === 'onsite' ? ` | Onsite: ${onsiteBenefitsDetails.netEffect} BDT net` : ''),
      
      createdBy: req.user._id
    });
    
    await payroll.save();
    
    // Update employee's last calculated date for onsite benefits
    if (employee.workLocationType === 'onsite') {
      employee.onsiteBenefits.lastCalculated = new Date();
      await employee.save();
    }
    
    const response = {
      status: 'success',
      message: 'Payroll created successfully with auto meal system',
      data: {
        payrollId: payroll._id,
        employee: payroll.employeeName,
        netPayable: payroll.summary.netPayable,
        
        mealSystem: {
          status: hasSubscription ? 'Monthly Subscription' : 
                 hasDailyMeals ? 'Daily Meals' : 'No Meals',
          deduction: mealDeduction.amount,
          calculation: mealDeduction.calculationNote,
          autoCalculated: {
            monthlyFoodCost: totalMonthlyFoodCost,
            activeSubscribers: activeSubscribers,
            dailyMealDays: dailyMealDays
          }
        },
        
        foodCostDetails: {
          totalMealCost: totalMonthlyFoodCost,
          deductionPerEmployee: mealDeduction.amount,
          calculation: `${totalMonthlyFoodCost} ÷ ${activeSubscribers} = ${mealDeduction.amount}`
        },
        
        onsiteBenefits: {
          serviceCharge: onsiteBenefitsDetails.serviceCharge,
          teaAllowance: onsiteBenefitsDetails.teaAllowance,
          calculation: onsiteBenefitsDetails.calculationNote,
          netEffect: onsiteBenefitsDetails.netEffect
        },
        
        breakdown: {
          earnings: totalEarnings,
          deductions: {
            attendance: calculation.calculations.deductions.actualTotal,
            meal: mealDeduction.amount,
            onsite: onsiteBenefitsDetails.serviceCharge,
            total: totalDeductions
          },
          netPayable: netPayable
        }
      },
      warnings: []
    };
    
    // Add warnings if needed
    if (calculation.calculations.deductions.isCapped) {
      response.warnings.push('Deductions capped at monthly salary');
      response.warnings.push(`Excess deduction not applied: ${formatCurrency(calculation.calculations.deductions.cappedAmount)}`);
    }
    
    if (employee.workLocationType === 'onsite') {
      response.warnings.push(`Onsite benefits applied: ${onsiteBenefitsDetails.teaAllowance} BDT allowance - ${onsiteBenefitsDetails.serviceCharge} BDT deduction = ${onsiteBenefitsDetails.netEffect} BDT net effect`);
    }
    
    if (mealDeduction.type === 'monthly_subscription') {
      response.warnings.push(`Meal deduction: ${totalMonthlyFoodCost} BDT ÷ ${activeSubscribers} subscribers = ${mealDeduction.amount} BDT`);
    } else if (mealDeduction.type === 'daily_meal') {
      response.warnings.push(`Daily meal deduction: ${dailyMealDays} days × ${dailyMealRate} BDT = ${mealDeduction.amount} BDT`);
    }
    
    res.status(201).json(response);
    
  } catch (error) {
    console.error('Create payroll error:', error);
    res.status(500).json({
      status: 'fail',
      message: error.message
    });
  }
};

// 4. Get All Payrolls
exports.getAllPayrolls = async (req, res) => {
  try {
    const { month, year, status, department, page = 1, limit = 20 } = req.query;
    
    const query = { isDeleted: false };
    
    if (month && year) {
      query.month = parseInt(month);
      query.year = parseInt(year);
    }
    
    if (status && status !== 'All') {
      query.status = status;
    }
    
    if (department && department !== 'All') {
      query.department = department;
    }
    
    const skip = (parseInt(page) - 1) * parseInt(limit);
    
    // Fetch without pagination first so we can deduplicate, then slice
    const allRaw = await Payroll.find(query)
      .populate('employee', 'firstName lastName email phone')
      .populate('createdBy', 'firstName lastName')
      .sort({ year: -1, month: -1, createdAt: -1 });

    // Deduplicate: sorted newest-first, so first match per key is always the latest
    const dedupMap = new Map();
    for (const p of allRaw) {
      const empId = (p.employee?._id || p.employee)?.toString() || p.employeeId || '';
      const key = `${empId}-${p.month}-${p.year}`;
      if (!dedupMap.has(key)) dedupMap.set(key, p);
    }
    const dedupedAll = [...dedupMap.values()];
    const total = dedupedAll.length;

    // Apply pagination after dedup
    const payrolls = dedupedAll.slice(skip, skip + parseInt(limit));

    // Keep every visible (non-finalized) row in sync with live attendance/
    // leave data on every list load — the attendance route is always live,
    // so the payroll list must never show a number that's gone stale since
    // this payroll was last calculated. Finalized (Paid/accepted) rows are
    // frozen snapshots and are skipped by refreshPayrollFromLiveAttendance
    // itself. Mutates the same document objects referenced by dedupedAll, so
    // the summary totals below also pick up the refreshed values.
    for (const p of payrolls) {
      try {
        await refreshPayrollFromLiveAttendance(p, req.user._id);
      } catch (err) {
        console.error(`Live recalculation failed for payroll ${p._id}:`, err);
      }
    }

    // Summary from deduped set
    const totalNetPayable  = dedupedAll.reduce((s, p) => s + (p.summary?.netPayable  || 0), 0);
    const totalDeductions  = dedupedAll.reduce((s, p) => s + (p.deductions?.total    || 0), 0);
    const paidAmount       = dedupedAll.filter(p => p.status === 'Paid').reduce((s, p) => s + (p.summary?.netPayable || 0), 0);
    const pendingAmount    = dedupedAll.filter(p => p.status === 'Pending').reduce((s, p) => s + (p.summary?.netPayable || 0), 0);

    res.status(200).json({
      status: 'success',
      data: {
        payrolls,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / parseInt(limit))
        },
        summary: {
          totalNetPayable,
          totalDeductions,
          totalPayrolls: total,
          paidAmount,
          pendingAmount
        }
      }
    });
    
  } catch (error) {
    console.error('Get all payrolls error:', error);
    res.status(500).json({
      status: 'fail',
      message: error.message
    });
  }
};

// 5. Get Payroll by ID
exports.getPayrollById = async (req, res) => {
  try {
    const payroll = await Payroll.findById(req.params.id)
      .populate('employee', 'firstName lastName email phone department designation')
      .populate('createdBy', 'firstName lastName')
      .populate('approvedBy', 'firstName lastName')
      .populate('paidBy', 'firstName lastName');
    
    if (!payroll || payroll.isDeleted) {
      return res.status(404).json({
        status: 'fail',
        message: 'Payroll not found'
      });
    }
    
    res.status(200).json({
      status: 'success',
      data: payroll
    });
    
  } catch (error) {
    console.error('Get payroll by ID error:', error);
    res.status(500).json({
      status: 'fail',
      message: error.message
    });
  }
};

// 6. Update Payroll Status
exports.updatePayrollStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, paymentMethod, transactionId, bankAccount, notes } = req.body;
    
    const payroll = await Payroll.findById(id);
    
    if (!payroll || payroll.isDeleted) {
      return res.status(404).json({
        status: 'fail',
        message: 'Payroll not found'
      });
    }
    
    // Update status
    if (status) {
      payroll.status = status;
      
      if (status === 'Approved') {
        payroll.approvedBy = req.user._id;
        payroll.approvedAt = new Date();
      } else if (status === 'Rejected') {
        payroll.rejectedBy = req.user._id;
        payroll.rejectedAt = new Date();
        payroll.rejectionReason = notes || '';
      } else if (status === 'Paid') {
        payroll.payment = {
          paymentDate: new Date(),
          paymentMethod: paymentMethod || 'Bank Transfer',
          transactionId: transactionId || '',
          bankAccount: bankAccount || '',
          paidBy: req.user._id,
          paymentNotes: notes || ''
        };
      }
    }
    
    await payroll.save();
    
    res.status(200).json({
      status: 'success',
      message: 'Payroll updated successfully',
      data: payroll
    });
    
  } catch (error) {
    console.error('Update payroll status error:', error);
    res.status(500).json({
      status: 'fail',
      message: error.message
    });
  }
};

// 7. Delete Payroll (Hard Delete - Permanent)
exports.deletePayroll = async (req, res) => {
  try {
    const payroll = await Payroll.findById(req.params.id);
    
    if (!payroll) {
      return res.status(404).json({
        status: 'fail',
        message: 'Payroll not found'
      });
    }
    
    // Permanent delete from database
    await Payroll.findByIdAndDelete(req.params.id);
    
    res.status(200).json({
      status: 'success',
      message: 'Payroll deleted permanently'
    });
    
  } catch (error) {
    console.error('Delete payroll error:', error);
    res.status(500).json({
      status: 'fail',
      message: error.message
    });
  }
};

// 8A. Get Employee Payrolls (Admin/HR দেখার জন্য)
exports.getEmployeePayrolls = async (req, res) => {
  try {
    const { userId } = req.params; // URL থেকে employeeId নিচ্ছে
    const { year } = req.query;
    
    // Check if user is admin/hr
    if (req.user.role !== 'admin' && req.user.role !== 'hr') {
      return res.status(403).json({
        status: 'fail',
        message: 'You do not have permission to view other employee payrolls'
      });
    }
    
    // Build query
    const query = { 
      employee: userId 
    };
    
    if (year && !isNaN(year)) {
      query.year = parseInt(year);
    }
    
    // Get payrolls
    const payrolls = await Payroll.find(query)
      .populate('employee', 'firstName lastName email phone department designation')
      .populate('createdBy', 'firstName lastName')
      .sort({ year: -1, month: -1, createdAt: -1 });
    
    // Get employee details
    const employee = await User.findById(userId)
      .select('firstName lastName employeeId department designation');
    
    // Calculate summary
    const summary = {
      totalRecords: payrolls.length,
      totalNetPayable: payrolls.reduce((sum, p) => sum + (p.summary?.netPayable || 0), 0),
      totalEarnings: payrolls.reduce((sum, p) => sum + (p.summary?.grossEarnings || 0), 0),
      totalDeductions: payrolls.reduce((sum, p) => sum + (p.deductions?.total || 0), 0),
      byStatus: payrolls.reduce((acc, p) => {
        acc[p.status] = (acc[p.status] || 0) + 1;
        return acc;
      }, {}),
      byMonth: payrolls.map(p => ({
        month: p.month,
        monthName: new Date(p.year, p.month - 1, 1).toLocaleDateString('en-US', { month: 'short' }),
        year: p.year,
        netPayable: p.summary?.netPayable || 0,
        status: p.status
      }))
    };
    
    res.status(200).json({
      status: 'success',
      data: {
        employee: employee ? {
          id: employee._id,
          name: `${employee.firstName} ${employee.lastName}`,
          employeeId: employee.employeeId,
          department: employee.department,
          designation: employee.designation
        } : null,
        payrolls,
        summary
      }
    });
    
  } catch (error) {
    console.error('Get employee payrolls error:', error);
    res.status(500).json({
      status: 'fail',
      message: error.message
    });
  }
};

// 8B. Get My Payrolls (Employee নিজের দেখার জন্য)
exports.getMyPayrolls = async (req, res) => {
  try {
    const { year } = req.query;
    const employeeId = req.user._id;
    
    // Build query - employee নিজের ID
    const query = { 
      employee: employeeId 
    };
    
    if (year && !isNaN(year)) {
      query.year = parseInt(year);
    }
    
    // Get payrolls - শুধু নিজের payroll (sorted newest-first for dedup)
    const rawPayrolls = await Payroll.find(query)
      .populate('employee', 'firstName lastName email phone department designation')
      .populate('createdBy', 'firstName lastName')
      .sort({ year: -1, month: -1, createdAt: -1 });

    // Deduplicate: one payroll per month/year, keep the newest (already sorted newest-first)
    const dedupMap = new Map();
    for (const p of rawPayrolls) {
      const key = `${p.month}-${p.year}`;
      if (!dedupMap.has(key)) dedupMap.set(key, p);
    }
    const payrolls = [...dedupMap.values()];

    // Keep every non-finalized payroll in sync with live attendance/leave
    // data (same as the admin list) — Paid/accepted ones are skipped
    // internally as frozen snapshots, so this only touches payrolls the
    // employee hasn't accepted yet.
    for (const p of payrolls) {
      try {
        await refreshPayrollFromLiveAttendance(p, null);
      } catch (err) {
        console.error(`Live recalculation failed for payroll ${p._id}:`, err);
      }
    }

    // Calculate summary
    const summary = {
      totalRecords: payrolls.length,
      totalNetPayable: payrolls.reduce((sum, p) => sum + (p.summary?.netPayable || 0), 0),
      totalEarnings: payrolls.reduce((sum, p) => sum + (p.summary?.grossEarnings || 0), 0),
      totalDeductions: payrolls.reduce((sum, p) => sum + (p.deductions?.total || 0), 0),
      byStatus: payrolls.reduce((acc, p) => {
        acc[p.status] = (acc[p.status] || 0) + 1;
        return acc;
      }, {}),
      byMonth: payrolls.map(p => ({
        month: p.month,
        monthName: new Date(p.year, p.month - 1, 1).toLocaleDateString('en-US', { month: 'short' }),
        year: p.year,
        netPayable: p.summary?.netPayable || 0,
        status: p.status
      }))
    };

    res.status(200).json({
      status: 'success',
      data: {
        employee: {
          id: req.user._id,
          name: `${req.user.firstName} ${req.user.lastName}`,
          employeeId: req.user.employeeId,
          department: req.user.department,
          designation: req.user.designation
        },
        payrolls,
        summary
      }
    });
    
  } catch (error) {
    console.error('Get my payrolls error:', error);
    res.status(500).json({
      status: 'fail',
      message: error.message
    });
  }
};

// 9. Bulk Generate Payrolls
exports.bulkGeneratePayrolls = async (req, res) => {
  try {
    const { month, year, department } = req.body;
    
    if (!month || !year) {
      return res.status(400).json({
        status: 'fail',
        message: 'Month and year are required'
      });
    }
    
    // Get active employees (only employees, not admins/moderators)
    const query = {
      status: 'active',
      role: 'employee',
      salary: { $gt: 0 }
    };
    
    if (department && department !== 'All') {
      query.department = department;
    }
    
    const employees = await User.find(query)
      .select('_id firstName lastName employeeId salary department designation');
    
    const results = [];
    const errors = [];
    
    // Generate payroll for each employee
    for (const employee of employees) {
      try {
        // Check if payroll exists
        const existing = await Payroll.findOne({
          employee: employee._id,
          month: parseInt(month),
          year: parseInt(year),
          isDeleted: false
        });

        if (existing) {
          // Locked payrolls (Approved / Paid / employee-accepted) are frozen
          // snapshots — regeneration must never touch them.
          const isLocked =
            existing.status === 'Approved' ||
            existing.status === 'Paid' ||
            existing.employeeAccepted?.accepted;

          if (isLocked) {
            results.push({
              employeeId: employee._id,
              employeeName: `${employee.firstName} ${employee.lastName}`,
              status: 'skipped',
              reason: `Locked (${existing.status}${existing.employeeAccepted?.accepted ? ', accepted' : ''}) — not regenerated`,
              payrollId: existing._id
            });
            continue;
          }

          // Unlocked existing payroll → REGENERATE it in place from live
          // attendance/leave data instead of skipping (or duplicating).
          await refreshPayrollFromLiveAttendance(existing, req.user._id);
          results.push({
            employeeId: employee._id,
            employeeName: `${employee.firstName} ${employee.lastName}`,
            status: 'regenerated',
            payrollId: existing._id,
            netPayable: existing.summary?.netPayable || 0
          });
          continue;
        }
        
        // Calculate and create payroll
        const calculation = await calculatePayroll(
          employee._id,
          employee.salary || 30000,
          parseInt(month),
          parseInt(year),
          {} // Empty manual inputs
        );
        
        // Create payroll
        const payroll = new Payroll({
          employee: employee._id,
          employeeName: calculation.employeeDetails.name,
          employeeId: calculation.employeeDetails.employeeId,
          department: calculation.employeeDetails.department,
          designation: calculation.employeeDetails.designation,
          
          periodStart: calculation.period.startDate,
          periodEnd: calculation.period.endDate,
          month: parseInt(month),
          year: parseInt(year),
          
          status: 'Pending',
          
          salaryDetails: {
            monthlySalary: calculation.rates.monthlySalary,
            utilityBillDeduction: calculation.rates.utilityBillDeduction,
            adjustedSalary: calculation.rates.adjustedSalary,
            dailyRate: calculation.rates.dailyRate,
            hourlyRate: calculation.rates.hourlyRate,
            overtimeRate: calculation.rates.overtimeRate,
            currency: 'BDT',
            calculationBasis: calculation.rates.calculationBasis
          },
          
          attendance: {
            totalWorkingDays: calculation.attendance.totalWorkingDays,
            presentDays: calculation.attendance.presentDays,
            absentDays: calculation.attendance.absentDays,
            leaveDays: calculation.attendance.leaveDays,
            lateDays: calculation.attendance.lateDays,
            halfDays: calculation.attendance.halfDays,
            holidays: calculation.attendance.holidays,
            weeklyOffs: calculation.attendance.weeklyOffs,
            attendancePercentage: Math.round(
              (calculation.attendance.presentDays / calculation.attendance.totalWorkingDays) * 100
            )
          },
          
          earnings: {
            basicPay: calculation.calculations.basicPay,
            overtime: { 
              amount: 0,
              hours: 0, 
              rate: calculation.rates.overtimeRate, 
              source: 'none',
              description: '' 
            },
            bonus: { amount: 0, type: 'none', description: '' },
            allowance: { amount: 0, type: 'none', description: '' },
            houseRent: 0,
            medical: 0,
            conveyance: 0,
            incentives: 0,
            otherAllowances: 0,
            total: calculation.calculations.basicPay
          },
          
          deductions: {
            lateDeduction: calculation.calculations.deductions.late.amount,
            absentDeduction: calculation.calculations.deductions.absent.amount,
            leaveDeduction: calculation.calculations.deductions.leave.amount,
            halfDayDeduction: calculation.calculations.deductions.halfDay.amount,
            taxDeduction: 0,
            providentFund: 0,
            advanceSalary: 0,
            loanDeduction: 0,
            otherDeductions: 0,
            utilityBillDeduction: calculation.rates.utilityBillDeduction,
            mealDeduction: 0,
            deductionRules: {
              lateRule: "3 days late = 1 day salary deduction",
              absentRule: "1 day absent = 1 day salary deduction",
              leaveRule: "1 day leave = 1 day salary deduction",
              halfDayRule: "1 half day = 0.5 day salary deduction",
              holidayRule: "Holidays are not deducted",
              weeklyOffRule: "Weekly offs are not deducted"
            },
            total: calculation.calculations.deductions.actualTotal
          },
          
          summary: {
            grossEarnings: calculation.calculations.basicPay,
            totalDeductions: calculation.calculations.deductions.actualTotal,
            netPayable: calculation.calculations.totals.netPayable,
            payableDays: calculation.attendance.presentDays
          },
          
          monthInfo: {
            totalHolidays: calculation.attendance.holidays || 0,
            totalWeeklyOffs: calculation.attendance.weeklyOffs || 0,
            holidayList: calculation.attendance.holidayList || [],
            weeklyOffDays: calculation.attendance.weeklyOffList || []
          },
          
          calculationNotes: {
            holidayNote: calculation.notes?.holidayNote || '',
            weeklyOffNote: calculation.notes?.weeklyOffNote || '',
            calculationNote: calculation.notes?.calculationNote || 'Dynamic working days calculation basis'
          },
          
          calculation: {
            method: 'auto_backend',
            calculatedDate: new Date(),
            calculatedBy: req.user._id,
            dataSources: ['attendance', 'leaves', 'holidays', 'office_schedule'],
            calculationNotes: 'Bulk generated payroll (dynamic working days)'
          },
          
          metadata: {
            isAutoGenerated: true,
            hasManualInputs: false,
            deductionRulesApplied: true,
            attendanceBased: true,
            dynamicWorkingDays: true,
            version: '3.0',
            batchId: `BULK_${month}_${year}_${Date.now()}`
          },
          
          createdBy: req.user._id,
          notes: `Bulk generated payroll for ${new Date(year, month - 1, 1).toLocaleDateString('en-US', { month: 'long' })} ${year} (dynamic working days)`
        });

        // Final race-condition guard: check again just before saving
        const raceCheck = await Payroll.findOne({
          employee: employee._id,
          month: parseInt(month),
          year: parseInt(year),
          isDeleted: false
        });
        if (raceCheck) {
          results.push({
            employeeId: employee._id,
            employeeName: `${employee.firstName} ${employee.lastName}`,
            status: 'skipped',
            reason: 'Payroll already exists',
            payrollId: raceCheck._id
          });
          continue;
        }

        await payroll.save();

        results.push({
          employeeId: employee._id,
          employeeName: `${employee.firstName} ${employee.lastName}`,
          status: 'created',
          payrollId: payroll._id,
          netPayable: payroll.summary.netPayable
        });
        
      } catch (error) {
        errors.push({
          employeeId: employee._id,
          employeeName: `${employee.firstName} ${employee.lastName}`,
          error: error.message
        });
      }
    }
    
    // Calculate summary
    const createdCount = results.filter(r => r.status === 'created').length;
    const regeneratedCount = results.filter(r => r.status === 'regenerated').length;
    const skippedCount = results.filter(r => r.status === 'skipped').length;
    const totalNetPayable = results
      .filter(r => r.status === 'created' || r.status === 'regenerated')
      .reduce((sum, r) => sum + (r.netPayable || 0), 0);

    res.status(200).json({
      status: 'success',
      message: `Bulk generation completed. Created: ${createdCount}, Regenerated: ${regeneratedCount}, Skipped (locked): ${skippedCount}, Failed: ${errors.length}`,
      data: {
        summary: {
          totalEmployees: employees.length,
          created: createdCount,
          regenerated: regeneratedCount,
          skipped: skippedCount,
          failed: errors.length,
          totalNetPayable: totalNetPayable
        },
        results,
        errors: errors.length > 0 ? errors : undefined
      }
    });
    
  } catch (error) {
    console.error('Bulk generate error:', error);
    res.status(500).json({
      status: 'fail',
      message: error.message
    });
  }
};

// 10. Get Payroll Statistics
exports.getPayrollStats = async (req, res) => {
  try {
    const { month, year } = req.query;
    
    if (!month || !year) {
      return res.status(400).json({
        status: 'fail',
        message: 'Month and year are required'
      });
    }
    
    const stats = await Payroll.aggregate([
      {
        $match: {
          month: parseInt(month),
          year: parseInt(year),
          isDeleted: false
        }
      },
      {
        $group: {
          _id: null,
          totalNetPayable: { $sum: '$summary.netPayable' },
          totalDeductions: { $sum: '$deductions.total' },
          totalPayrolls: { $sum: 1 },
          paidAmount: { $sum: { $cond: [{ $eq: ['$status', 'Paid'] }, '$summary.netPayable', 0] } },
          pendingAmount: { $sum: { $cond: [{ $eq: ['$status', 'Pending'] }, '$summary.netPayable', 0] } }
        }
      }
    ]);
    
    // Get department-wise breakdown
    const departmentStats = await Payroll.aggregate([
      {
        $match: {
          month: parseInt(month),
          year: parseInt(year),
          isDeleted: false
        }
      },
      {
        $group: {
          _id: '$department',
          count: { $sum: 1 },
          totalNetPayable: { $sum: '$summary.netPayable' },
          totalEmployees: { $addToSet: '$employee' }
        }
      },
      {
        $project: {
          department: '$_id',
          count: 1,
          totalNetPayable: 1,
          employeeCount: { $size: '$totalEmployees' },
          averagePerEmployee: { $divide: ['$totalNetPayable', { $size: '$totalEmployees' }] }
        }
      },
      { $sort: { totalNetPayable: -1 } }
    ]);
    
    res.status(200).json({
      status: 'success',
      data: {
        ...(stats[0] || {
          totalNetPayable: 0,
          totalDeductions: 0,
          totalPayrolls: 0,
          paidAmount: 0,
          pendingAmount: 0
        }),
        departmentStats,
        period: {
          month: parseInt(month),
          year: parseInt(year),
          monthName: new Date(parseInt(year), parseInt(month) - 1, 1).toLocaleDateString('en-US', { month: 'long' })
        }
      }
    });
    
  } catch (error) {
    console.error('Get payroll stats error:', error);
    res.status(500).json({
      status: 'fail',
      message: error.message
    });
  }
};

// 11. Export Payroll Data
exports.exportPayrolls = async (req, res) => {
  try {
    const { month, year, format = 'json' } = req.query;
    
    if (!month || !year) {
      return res.status(400).json({
        status: 'fail',
        message: 'Month and year are required'
      });
    }
    
    const payrolls = await Payroll.find({
      month: parseInt(month),
      year: parseInt(year),
      isDeleted: false
    })
    .populate('employee', 'firstName lastName employeeId department designation')
    .sort({ department: 1, employeeName: 1 });
    
    if (format === 'csv') {
      // CSV export logic
      const csvData = payrolls.map(p => ({
        'Employee ID': p.employeeId,
        'Employee Name': p.employeeName,
        'Department': p.department,
        'Designation': p.designation,
        'Monthly Salary': p.salaryDetails.monthlySalary,
        'Daily Rate': p.salaryDetails.dailyRate,
        'Total Working Days': 23,
        'Present Days': p.attendance.presentDays,
        'Absent Days': p.attendance.absentDays,
        'Leave Days': p.attendance.leaveDays,
        'Late Days': p.attendance.lateDays,
        'Half Days': p.attendance.halfDays,
        'Basic Pay': p.earnings.basicPay,
        'Overtime (Manual)': p.earnings.overtime?.amount || 0,
        'Bonus': p.earnings.bonus?.amount || 0,
        'Allowance': p.earnings.allowance?.amount || 0,
        'Late Deduction': p.deductions.lateDeduction,
        'Absent Deduction': p.deductions.absentDeduction,
        'Leave Deduction': p.deductions.leaveDeduction,
        'Half Day Deduction': p.deductions.halfDayDeduction,
        'Gross Earnings': p.summary.grossEarnings,
        'Total Deductions': p.summary.totalDeductions,
        'Net Payable': p.summary.netPayable,
        'Status': p.status,
        'Payment Method': p.payment?.paymentMethod || 'Not Paid'
      }));
      
      // Convert to CSV string
      const csvString = [
        Object.keys(csvData[0]).join(','),
        ...csvData.map(row => Object.values(row).join(','))
      ].join('\n');
      
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename=payrolls_${month}_${year}.csv`);
      return res.send(csvString);
    }
    
    // JSON export (default)
    res.status(200).json({
      status: 'success',
      data: {
        period: {
          month: parseInt(month),
          year: parseInt(year),
          monthName: new Date(parseInt(year), parseInt(month) - 1, 1).toLocaleDateString('en-US', { month: 'long' })
        },
        payrolls: payrolls,
        summary: await Payroll.aggregate([
          {
            $match: {
              month: parseInt(month),
              year: parseInt(year),
              isDeleted: false
            }
          },
          {
            $group: {
              _id: null,
              totalNetPayable: { $sum: '$summary.netPayable' },
              totalDeductions: { $sum: '$deductions.total' },
              totalPayrolls: { $sum: 1 }
            }
          }
        ])
      }
    });
    
  } catch (error) {
    console.error('Export payrolls error:', error);
    res.status(500).json({
      status: 'fail',
      message: error.message
    });
  }
};

// 12. Update Manual Inputs
exports.updateManualInputs = async (req, res) => {
  try {
    const { id } = req.params;
    const { overtime, bonus, allowance, description } = req.body;
    
    const payroll = await Payroll.findById(id);
    
    if (!payroll || payroll.isDeleted) {
      return res.status(404).json({
        status: 'fail',
        message: 'Payroll not found'
      });
    }
    
    // Update manual inputs
    payroll.manualInputs = {
      overtime: parseInt(overtime) || 0,
      overtimeHours: 0,
      bonus: parseInt(bonus) || 0,
      allowance: parseInt(allowance) || 0,
      enteredBy: req.user._id,
      enteredAt: new Date()
    };
    
    // Update earnings
    payroll.earnings.overtime.amount = parseInt(overtime) || 0;
    payroll.earnings.overtime.hours = 0;
    payroll.earnings.overtime.source = parseInt(overtime) > 0 ? 'manual' : 'none';
    payroll.earnings.overtime.description = description || 'Manual overtime entry';
    
    payroll.earnings.bonus.amount = parseInt(bonus) || 0;
    payroll.earnings.bonus.type = parseInt(bonus) > 0 ? 'other' : 'none';
    payroll.earnings.bonus.description = parseInt(bonus) > 0 ? 'Updated manually' : '';
    
    payroll.earnings.allowance.amount = parseInt(allowance) || 0;
    payroll.earnings.allowance.type = parseInt(allowance) > 0 ? 'other' : 'none';
    payroll.earnings.allowance.description = parseInt(allowance) > 0 ? 'Updated manually' : '';
    
    // Recalculate totals
    await payroll.save();
    
    res.status(200).json({
      status: 'success',
      message: 'Manual inputs updated successfully',
      data: payroll
    });
    
  } catch (error) {
    console.error('Update manual inputs error:', error);
    res.status(500).json({
      status: 'fail',
      message: error.message
    });
  }
};

// 13. Get Payroll with Manual Overtime Only
exports.getPayrollWithManualOvertime = async (req, res) => {
  try {
    const { month, year } = req.query;
    
    const payrolls = await Payroll.find({
      month: parseInt(month),
      year: parseInt(year),
      isDeleted: false,
      'earnings.overtime.amount': { $gt: 0 },
      'earnings.overtime.source': 'manual'
    })
    .populate('employee', 'firstName lastName employeeId')
    .sort({ 'earnings.overtime.amount': -1 });
    
    res.status(200).json({
      status: 'success',
      data: {
        count: payrolls.length,
        totalOvertime: payrolls.reduce((sum, p) => sum + (p.earnings.overtime?.amount || 0), 0),
        payrolls
      }
    });
    
  } catch (error) {
    console.error('Get payroll with manual overtime error:', error);
    res.status(500).json({
      status: 'fail',
      message: error.message
    });
  }
};

// 14. Recalculate Payroll (আপডেট লজিক)
// Recompute a payroll's attendance/deductions/summary from LIVE Attendance/
// Leave data and persist it — the one place that does this, shared by the
// single-payroll recalculate route AND the admin list endpoint (which keeps
// every visible row in sync with current attendance without requiring an
// explicit "Recalculate" click, since the attendance route itself is always
// live). A finalized (Approved/Paid/accepted) payroll is a locked snapshot
// and is left untouched; returns false in that case, true after a real recalc.
const refreshPayrollFromLiveAttendance = async (payroll, userId, opts = {}) => {
  const { force = false } = opts;
  if (
    payroll.status === 'Paid' ||
    payroll.status === 'Approved' ||
    payroll.employeeAccepted?.accepted
  ) {
    return false;
  }

  // A manually-edited payroll is an intentional override. The automatic
  // "keep in sync with live attendance" callers (list load, employee view)
  // must NOT touch it — otherwise every list refresh silently reverts the
  // admin's edits back to the live-attendance figures. Only an EXPLICIT
  // Recalculate (force:true) re-syncs it, and that also clears the edited flag.
  if (payroll.metadata?.isEdited === true && !force) {
    return false;
  }
  if (force && payroll.metadata) {
    payroll.metadata.isEdited = false;
    payroll.markModified('metadata');
  }

  const employeeId = payroll.employee?._id || payroll.employee;
  const month = payroll.month;
  const year = payroll.year;
  const monthlySalary = payroll.salaryDetails.monthlySalary;
  const manualInputs = {
    overtime: payroll.manualInputs.overtime || 0,
    bonus: payroll.manualInputs.bonus || 0,
    allowance: payroll.manualInputs.allowance || 0
  };

  const calculation = await calculatePayroll(
    employeeId,
    monthlySalary,
    month,
    year,
    manualInputs
  );

  payroll.attendance = {
    totalWorkingDays: calculation.attendance.totalWorkingDays,
    presentDays:      calculation.attendance.presentDays,
    absentDays:       calculation.attendance.absentDays,
    leaveDays:        calculation.attendance.leaveDays,
    lateDays:         calculation.attendance.lateDays,
    halfDays:         calculation.attendance.halfDays,
    holidays:         calculation.attendance.holidays,
    weeklyOffs:       calculation.attendance.weeklyOffs,
    attendancePercentage: Math.round(
      (calculation.attendance.presentDays / (calculation.attendance.totalWorkingDays || 1)) * 100
    )
  };

  payroll.salaryDetails.utilityBillDeduction = calculation.rates.utilityBillDeduction;
  payroll.salaryDetails.adjustedSalary       = calculation.rates.adjustedSalary;
  payroll.salaryDetails.dailyRate            = calculation.rates.dailyRate;
  payroll.salaryDetails.hourlyRate           = calculation.rates.hourlyRate;
  payroll.salaryDetails.overtimeRate         = calculation.rates.overtimeRate;
  payroll.salaryDetails.calculationBasis     = calculation.rates.calculationBasis;

  payroll.earnings.basicPay = calculation.calculations.basicPay;

  payroll.deductions.lateDeduction    = calculation.calculations.deductions.late.amount;
  payroll.deductions.absentDeduction  = calculation.calculations.deductions.absent.amount;
  payroll.deductions.leaveDeduction   = calculation.calculations.deductions.leave.amount;
  payroll.deductions.halfDayDeduction = calculation.calculations.deductions.halfDay.amount;
  payroll.deductions.utilityBillDeduction = calculation.rates.utilityBillDeduction;

  // ── Refresh the MEAL source fields + onsite service charge ──
  // The Payroll pre('save') hook is the single source of truth for the totals
  // (deductions.total / summary.netPayable) — it recomputes them from
  // foodCostDetails.totalFoodDeduction (or mealDeduction.totalDeductionAmount)
  // and onsiteBenefitsDetails.serviceCharge. Previously this refresh never
  // updated those meal source fields, so a regenerate kept a STALE meal figure
  // (or 0), which then disagreed with the live food cost the frontend layers on
  // top and made the meal get subtracted twice. Recompute the current meal from
  // live data and write it into the fields the hook actually reads, so the
  // saved net stays consistent with the meal the UI shows.
  const mealDeduction = await calculateMealDeductionForEmployee(
    employeeId,
    month,
    year,
    payroll.manualInputs?.dailyMealRate || 0
  );
  const mealAmount = mealDeduction.amount || 0;

  if (!payroll.foodCostDetails) payroll.foodCostDetails = {};
  payroll.foodCostDetails.totalFoodDeduction = mealAmount;
  payroll.foodCostDetails.fixedDeduction = mealAmount;
  payroll.foodCostDetails.calculationNote = mealDeduction.calculationNote;
  if (!payroll.mealDeduction) payroll.mealDeduction = {};
  payroll.mealDeduction.totalDeductionAmount = mealAmount;
  payroll.mealSystemData = {
    ...(payroll.mealSystemData || {}),
    mealDeduction: {
      type: mealDeduction.type,
      amount: mealAmount,
      calculationNote: mealDeduction.calculationNote
    }
  };
  payroll.markModified('foodCostDetails');
  payroll.markModified('mealDeduction');
  payroll.markModified('mealSystemData');

  // Onsite service charge (only for onsite employees; 0 otherwise) — written to
  // the field the pre-save hook reads so it is folded into the totals.
  const empDoc = await User.findById(employeeId).select('workLocationType onsiteBenefits');
  if (empDoc && empDoc.workLocationType === 'onsite') {
    if (!payroll.onsiteBenefitsDetails) payroll.onsiteBenefitsDetails = {};
    payroll.onsiteBenefitsDetails.serviceCharge =
      empDoc.onsiteBenefits?.serviceCharge || 500;
    payroll.markModified('onsiteBenefitsDetails');
  }

  payroll.monthInfo = {
    totalHolidays: calculation.attendance.holidays || 0,
    totalWeeklyOffs: calculation.attendance.weeklyOffs || 0,
    holidayList: calculation.attendance.holidayList || [],
    weeklyOffDays: calculation.attendance.weeklyOffList || []
  };

  payroll.calculationNotes = {
    holidayNote:     calculation.notes?.holidayNote || '',
    weeklyOffNote:   calculation.notes?.weeklyOffNote || '',
    calculationNote: calculation.notes?.calculationNote || ''
  };

  payroll.metadata.dynamicWorkingDays = true;
  payroll.metadata.version = '4.0';

  payroll.calculation.calculatedDate = new Date();
  if (userId) payroll.calculation.calculatedBy = userId;
  payroll.calculation.calculationNotes = 'Recalculated — fresh attendance data applied';

  await payroll.save();
  return true;
};

exports.recalculatePayroll = async (req, res) => {
  try {
    const { id } = req.params;

    const payroll = await Payroll.findById(id)
      .populate('employee', 'firstName lastName employeeId department designation workLocationType onsiteBenefits');

    if (!payroll || payroll.isDeleted) {
      return res.status(404).json({
        status: 'fail',
        message: 'Payroll not found'
      });
    }

    // Explicit Recalculate button — force a live re-sync even if the payroll
    // was manually edited (and clear the edited flag so it tracks live again).
    const didRecalculate = await refreshPayrollFromLiveAttendance(payroll, req.user._id, { force: true });

    if (!didRecalculate) {
      return res.status(200).json({
        status: 'success',
        message: 'Payroll is locked (Approved/Paid/accepted) — not recalculated',
        recalculated: false,
        data: payroll
      });
    }

    res.status(200).json({
      status: 'success',
      message: 'Payroll recalculated successfully with dynamic working days',
      recalculated: true,
      data: payroll
    });

  } catch (error) {
    console.error('Recalculate payroll error:', error);
    res.status(500).json({
      status: 'fail',
      message: error.message
    });
  }
};

// 15. Employee Accept Payroll
exports.employeeAcceptPayroll = async (req, res) => {
  try {
    const { id } = req.params;
    const employeeId = req.user._id;
    
    // Get employee data
    const employee = await User.findById(employeeId).select('firstName lastName employeeId');
    if (!employee) {
      return res.status(404).json({
        status: 'fail',
        message: 'Employee not found'
      });
    }
    
    // Process acceptance
    const updatedPayroll = await handleEmployeeAcceptance(
      id, 
      employeeId, 
      {
        name: `${employee.firstName} ${employee.lastName}`,
        employeeId: employee.employeeId,
        firstName: employee.firstName,
        lastName: employee.lastName
      }
    );
    
    res.status(200).json({
      status: 'success',
      message: 'Payroll accepted successfully! Status updated to "Paid".',
      data: {
        payrollId: updatedPayroll._id,
        employeeName: `${employee.firstName} ${employee.lastName}`,
        employeeId: employee.employeeId,
        month: updatedPayroll.month,
        year: updatedPayroll.year,
        monthName: getMonthName(updatedPayroll.month),
        netPayable: updatedPayroll.summary.netPayable,
        acceptedAt: updatedPayroll.employeeAccepted.acceptedAt,
        previousStatus: 'Pending',
        newStatus: 'Paid',
        acceptedBy: updatedPayroll.employeeAccepted.employeeName
      }
    });
    
  } catch (error) {
    console.error('Employee accept payroll error:', error);
    
    if (error.message.includes('only accept your own')) {
      return res.status(403).json({
        status: 'fail',
        message: error.message
      });
    }
    
    if (error.message.includes('already accepted')) {
      return res.status(400).json({
        status: 'fail',
        message: error.message
      });
    }
    
    res.status(500).json({
      status: 'fail',
      message: error.message || 'Failed to accept payroll'
    });
  }
};

// 16. Check Employee Acceptance Status
exports.checkEmployeeAcceptance = async (req, res) => {
  try {
    const { id } = req.params;
    
    const payroll = await Payroll.findById(id).select('employeeAccepted status payment employee');
    
    if (!payroll) {
      return res.status(404).json({
        status: 'fail',
        message: 'Payroll not found'
      });
    }
    
    res.status(200).json({
      status: 'success',
      data: {
        employeeAccepted: payroll.employeeAccepted || { accepted: false },
        status: payroll.status,
        paymentDate: payroll.payment?.paymentDate,
        employeeId: payroll.employee
      }
    });
    
  } catch (error) {
    console.error('Check employee acceptance error:', error);
    res.status(500).json({
      status: 'fail',
      message: error.message
    });
  }
};

// 17. Get payroll details for employee - নতুন ফাংশন
exports.getEmployeePayrollDetails = async (req, res) => {
  try {
    const { id } = req.params;
    const employeeId = req.user._id;
    
    // Find payroll
    const payroll = await Payroll.findById(id)
      .select('employee employeeName employeeId department designation month year status summary deductions earnings attendance salaryDetails periodStart periodEnd employeeAccepted payment metadata calculationNotes')
      .lean();
    
    if (!payroll) {
      return res.status(404).json({
        status: 'fail',
        message: 'Payroll not found'
      });
    }
    
    // Verify ownership (employee can only see their own payroll)
    if (payroll.employee.toString() !== employeeId.toString() && req.user.role === 'employee') {
      return res.status(403).json({
        status: 'fail',
        message: 'You can only view your own payroll details'
      });
    }
    
    // Format the response for employee view
    const response = {
      status: 'success',
      data: {
        payrollId: payroll._id,
        employee: {
          name: payroll.employeeName,
          employeeId: payroll.employeeId,
          department: payroll.department,
          designation: payroll.designation
        },
        period: {
          month: payroll.month,
          year: payroll.year,
          monthName: getMonthName(payroll.month),
          startDate: payroll.periodStart,
          endDate: payroll.periodEnd,
          formattedPeriod: `${getMonthName(payroll.month)} ${payroll.year}`
        },
        salary: {
          monthly: payroll.salaryDetails?.monthlySalary || 0,
          daily: payroll.salaryDetails?.dailyRate || 0,
          hourly: payroll.salaryDetails?.hourlyRate || 0
        },
        attendance: {
          totalDays: payroll.attendance?.totalWorkingDays || 23,
          presentDays: payroll.attendance?.presentDays || 0,
          absentDays: payroll.attendance?.absentDays || 0,
          leaveDays: payroll.attendance?.leaveDays || 0,
          lateDays: payroll.attendance?.lateDays || 0,
          halfDays: payroll.attendance?.halfDays || 0,
          attendancePercentage: payroll.attendance?.attendancePercentage || 0
        },
        earnings: {
          basicPay: payroll.earnings?.basicPay || 0,
          overtime: payroll.earnings?.overtime?.amount || 0,
          bonus: payroll.earnings?.bonus?.amount || 0,
          allowance: payroll.earnings?.allowance?.amount || 0,
          total: payroll.summary?.grossEarnings || 0
        },
        deductions: {
          late: payroll.deductions?.lateDeduction || 0,
          absent: payroll.deductions?.absentDeduction || 0,
          leave: payroll.deductions?.leaveDeduction || 0,
          halfDay: payroll.deductions?.halfDayDeduction || 0,
          total: payroll.deductions?.total || 0
        },
        summary: {
          grossEarnings: payroll.summary?.grossEarnings || 0,
          totalDeductions: payroll.deductions?.total || 0,
          netPayable: payroll.summary?.netPayable || 0,
          netPayableInWords: payroll.summary?.inWords || ''
        },
        status: {
          current: payroll.status,
          employeeAccepted: payroll.employeeAccepted?.accepted || false,
          acceptedAt: payroll.employeeAccepted?.acceptedAt,
          payment: payroll.payment ? {
            date: payroll.payment.paymentDate,
            method: payroll.payment.paymentMethod,
            transactionId: payroll.payment.transactionId
          } : null
        },
        metadata: {
          calculationBasis: payroll.salaryDetails?.calculationBasis || 'Dynamic working days',
          dynamicWorkingDays: payroll.metadata?.dynamicWorkingDays || true,
          version: payroll.metadata?.version || '1.0',
          createdDate: payroll.createdAt,
          lastUpdated: payroll.updatedAt
        },
        notes: payroll.calculationNotes || {}
      }
    };
    
    res.status(200).json(response);
    
  } catch (error) {
    console.error('Get employee payroll details error:', error);
    res.status(500).json({
      status: 'fail',
      message: error.message || 'Failed to get payroll details'
    });
  }
};
// payrollController.js

exports.getEmployeeMealData = async (req, res) => {
  try {
    const { employeeId } = req.params;
    const { month, year } = req.query;
    
    if (!employeeId || !month || !year) {
      return res.status(400).json({
        status: 'fail',
        message: 'Employee ID, month and year are required'
      });
    }
    
    const startDate = new Date(year, month - 1, 1);
    // Cap at today for the current month so meal/food cost only counts elapsed days
    const endDate = getMonthCutoffEnd(parseInt(month), parseInt(year));
    const currentMonth = `${year}-${String(month).padStart(2, '0')}`;
    
    // 1. Check Monthly Subscription
    const subscription = await MealSubscription.findOne({
      user: employeeId,
      isDeleted: false,
      'monthlyApprovals.month': currentMonth,
      'monthlyApprovals.status': 'approved'
    });
    
    const hasMonthlySubscription = !!subscription;
    
    // 2. Count Daily Meals
    const dailyMeals = await Meal.find({
      user: employeeId,
      date: { $gte: startDate, $lte: endDate },
      status: { $in: ['approved', 'served'] },
      isDeleted: false
    });
    
    const dailyMealDays = dailyMeals.length;
    
    // 3. Get Monthly Food Costs
    const monthlyFoodCosts = await FoodCost.find({
      date: { $gte: startDate, $lte: endDate }
    });
    
    const totalMonthlyFoodCost = monthlyFoodCosts.reduce((sum, cost) => sum + cost.cost, 0);
    const foodCostDays = monthlyFoodCosts.length;
    const averageDailyCost = foodCostDays > 0 ? totalMonthlyFoodCost / foodCostDays : 0;
    
    // 4. Count Active Subscribers (for monthly subscription calculation)
    const activeSubscribers = await MealSubscription.countDocuments({
      status: 'active',
      isDeleted: false,
      isPaused: false,
      'monthlyApprovals.month': currentMonth,
      'monthlyApprovals.status': 'approved'
    });
    
    // 5. Calculate deduction per employee (if monthly subscription)
    const deductionPerEmployee = activeSubscribers > 0 ? 
      Math.round(totalMonthlyFoodCost / activeSubscribers) : 0;
    
    res.status(200).json({
      status: 'success',
      message: 'Meal data loaded successfully',
      data: {
        hasMonthlySubscription,
        dailyMealDays,
        monthlyFoodCost: totalMonthlyFoodCost,
        activeSubscribers,
        deductionPerEmployee,
        averageDailyCost: Math.round(averageDailyCost),
        foodCostDays,
        mealDetails: {
          subscriptionPreference: subscription?.preference || 'none',
          subscriptionStatus: subscription?.status || 'none',
          dailyMeals: dailyMeals.map(meal => ({
            date: meal.date,
            preference: meal.preference,
            status: meal.status
          }))
        }
      }
    });
    
  } catch (error) {
    console.error('Get employee meal data error:', error);
    res.status(500).json({
      status: 'fail',
      message: error.message || 'Failed to load meal data'
    });
  }
};
// 18. Update Payroll (Admin Edit)
exports.updatePayroll = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      monthlySalary,
      overtime,
      bonus,
      allowance,
      dailyMealRate,
      manualMealAmount,
      mealDeduction,
      mealDeductionType,
      notes,
      recalculate = true
    } = req.body;

    const payroll = await Payroll.findById(id);
    
    if (!payroll || payroll.isDeleted) {
      return res.status(404).json({
        status: 'fail',
        message: 'Payroll not found'
      });
    }

    // Check if payroll is already paid/accepted
    if (payroll.status === 'Paid' || payroll.employeeAccepted?.accepted) {
      return res.status(400).json({
        status: 'fail',
        message: 'Cannot edit paid or accepted payroll'
      });
    }

    // Store original values for audit
    const originalData = {
      salary: payroll.salaryDetails.monthlySalary,
      overtime: payroll.earnings.overtime.amount,
      bonus: payroll.earnings.bonus.amount,
      allowance: payroll.earnings.allowance.amount,
      mealDeduction: payroll.mealSystemData?.mealDeduction?.amount || 0
    };

    // Update manual inputs
    const updates = {
      monthlySalary: parseInt(monthlySalary) || originalData.salary,
      overtime: parseInt(overtime) || 0,
      bonus: parseInt(bonus) || 0,
      allowance: parseInt(allowance) || 0,
      dailyMealRate: parseFloat(dailyMealRate) || 0,
      manualMealAmount: parseFloat(manualMealAmount) || 0,
      mealDeduction: parseFloat(mealDeduction) || 0,
      mealDeductionType: mealDeductionType || 'none',
      notes: notes || payroll.notes
    };

    // Update payroll document
    payroll.salaryDetails.monthlySalary = updates.monthlySalary;
    
    // Update earnings
    payroll.earnings.overtime.amount = updates.overtime;
    payroll.earnings.overtime.source = updates.overtime > 0 ? 'manual_edit' : 'none';
    payroll.earnings.overtime.description = updates.overtime > 0 ? 'Updated by admin' : '';
    
    payroll.earnings.bonus.amount = updates.bonus;
    payroll.earnings.bonus.type = updates.bonus > 0 ? 'other_edit' : 'none';
    payroll.earnings.bonus.description = updates.bonus > 0 ? 'Updated by admin' : '';
    
    payroll.earnings.allowance.amount = updates.allowance;
    payroll.earnings.allowance.type = updates.allowance > 0 ? 'other_edit' : 'none';
    payroll.earnings.allowance.description = updates.allowance > 0 ? 'Updated by admin' : '';

    // Update meal system data if provided
    if (updates.mealDeduction > 0) {
      payroll.mealSystemData.mealDeduction = {
        type: updates.mealDeductionType,
        amount: updates.mealDeduction,
        calculationNote: `Manual update by admin: ${formatCurrency(updates.mealDeduction)}`,
        details: {
          ...payroll.mealSystemData.mealDeduction?.details,
          manuallyUpdated: true,
          originalAmount: originalData.mealDeduction,
          updatedBy: req.user._id,
          updatedAt: new Date()
        }
      };
      
      payroll.foodCostDetails.fixedDeduction = updates.mealDeduction;
      payroll.foodCostDetails.totalFoodDeduction = updates.mealDeduction;
      payroll.foodCostDetails.calculationNote = `Manually updated to ${formatCurrency(updates.mealDeduction)} by admin`;
    }

    // Update notes
    if (updates.notes) {
      payroll.notes = updates.notes;
    }

    // Update manual inputs
    payroll.manualInputs = {
      ...payroll.manualInputs,
      overtime: updates.overtime,
      bonus: updates.bonus,
      allowance: updates.allowance,
      dailyMealRate: updates.dailyMealRate,
      editedBy: req.user._id,
      editedAt: new Date(),
      editCount: (payroll.manualInputs.editCount || 0) + 1
    };

    // Recalculate if requested
    if (recalculate) {
      await recalculatePayrollTotals(payroll);
    } else {
      // Just update totals manually
      await updatePayrollTotals(payroll);
    }

    // Add audit trail
    payroll.auditTrail = payroll.auditTrail || [];
    payroll.auditTrail.push({
      action: 'update',
      performedBy: req.user._id,
      performedAt: new Date(),
      changes: {
        salary: { from: originalData.salary, to: updates.monthlySalary },
        overtime: { from: originalData.overtime, to: updates.overtime },
        bonus: { from: originalData.bonus, to: updates.bonus },
        allowance: { from: originalData.allowance, to: updates.allowance },
        mealDeduction: { from: originalData.mealDeduction, to: updates.mealDeduction }
      },
      notes: 'Manual update by admin'
    });

    // Update metadata
    payroll.metadata.lastEdited = new Date();
    payroll.metadata.editedBy = req.user._id;
    payroll.metadata.isEdited = true;

    await payroll.save();

    res.status(200).json({
      status: 'success',
      message: 'Payroll updated successfully',
      data: {
        payrollId: payroll._id,
        changes: {
          salary: updates.monthlySalary,
          overtime: updates.overtime,
          bonus: updates.bonus,
          allowance: updates.allowance,
          mealDeduction: updates.mealDeduction
        },
        summary: {
          grossEarnings: payroll.summary.grossEarnings,
          totalDeductions: payroll.deductions.total,
          netPayable: payroll.summary.netPayable
        }
      }
    });

  } catch (error) {
    console.error('Update payroll error:', error);
    res.status(500).json({
      status: 'fail',
      message: error.message
    });
  }
};

// Helper: Recalculate payroll totals
const recalculatePayrollTotals = async (payroll,req) => {
  try {
    const employeeId = payroll.employee;
    const month = payroll.month;
    const year = payroll.year;
    const monthlySalary = payroll.salaryDetails.monthlySalary;
    
    // Get fresh calculation
    const calculation = await calculatePayroll(
      employeeId,
      monthlySalary,
      month,
      year,
      {
        overtime: payroll.earnings.overtime.amount,
        bonus: payroll.earnings.bonus.amount,
        allowance: payroll.earnings.allowance.amount
      }
    );

    // Update attendance
    payroll.attendance = {
      totalWorkingDays: calculation.attendance.totalWorkingDays,
      presentDays: calculation.attendance.presentDays,
      absentDays: calculation.attendance.absentDays,
      leaveDays: calculation.attendance.leaveDays,
      lateDays: calculation.attendance.lateDays,
      halfDays: calculation.attendance.halfDays,
      holidays: calculation.attendance.holidays,
      weeklyOffs: calculation.attendance.weeklyOffs,
      attendancePercentage: Math.round(
        (calculation.attendance.presentDays / calculation.attendance.totalWorkingDays) * 100
      )
    };

    // Update rates
    payroll.salaryDetails.dailyRate = calculation.rates.dailyRate;
    payroll.salaryDetails.hourlyRate = calculation.rates.hourlyRate;
    payroll.salaryDetails.overtimeRate = calculation.rates.overtimeRate;
    payroll.salaryDetails.utilityBillDeduction = calculation.rates.utilityBillDeduction;
    payroll.salaryDetails.adjustedSalary = calculation.rates.adjustedSalary;

    // Update deductions
    payroll.deductions.lateDeduction = calculation.calculations.deductions.late.amount;
    payroll.deductions.absentDeduction = calculation.calculations.deductions.absent.amount;
    payroll.deductions.leaveDeduction = calculation.calculations.deductions.leave.amount;
    payroll.deductions.halfDayDeduction = calculation.calculations.deductions.halfDay.amount;

    // Update totals
    payroll.deductions.calculatedTotal = calculation.calculations.deductions.calculatedTotal;
    payroll.deductions.isCapped = calculation.calculations.deductions.isCapped;
    payroll.deductions.cappedAmount = calculation.calculations.deductions.cappedAmount;

    // Add meal deduction + utility bill (deducted LAST) to total
    const mealDeduction = payroll.mealSystemData?.mealDeduction?.amount || 0;
    const onsiteServiceCharge = payroll.onsiteBenefitsDetails?.serviceCharge || 0;

    payroll.deductions.total = calculation.calculations.deductions.actualTotal +
                               mealDeduction +
                               onsiteServiceCharge +
                               calculation.rates.utilityBillDeduction;

    // Update summary
    const totalEarnings = calculation.calculations.basicPay + 
                         payroll.earnings.overtime.amount + 
                         payroll.earnings.bonus.amount + 
                         payroll.earnings.allowance.amount +
                         (payroll.onsiteBenefitsDetails?.teaAllowance || 0);

    payroll.summary.grossEarnings = totalEarnings;
    payroll.summary.totalDeductions = payroll.deductions.total;
    payroll.summary.netPayable = Math.max(0, totalEarnings - payroll.deductions.total);

    // Update calculation notes
    payroll.calculation.calculatedDate = new Date();
    payroll.calculation.calculatedBy = req.user._id;
    payroll.calculation.calculationNotes = 'Recalculated after admin edit';

  } catch (error) {
    console.error('Recalculate totals error:', error);
    throw error;
  }
};

// Helper: Update totals without full recalculation
const updatePayrollTotals = (payroll) => {
  try {
    const monthlySalary = payroll.salaryDetails.monthlySalary;
    const dailyRate = ceilAmount(monthlySalary / (workDays?.totalWorkingDays || 26));
    
    // Update rates
    payroll.salaryDetails.dailyRate = dailyRate;
    payroll.salaryDetails.hourlyRate = Math.round(dailyRate / 8);
    payroll.salaryDetails.overtimeRate = Math.round(dailyRate / 8 * 1.5);

    // Calculate totals
    const basicPay = monthlySalary;
    const mealDeduction = payroll.mealSystemData?.mealDeduction?.amount || 0;
    const onsiteServiceCharge = payroll.onsiteBenefitsDetails?.serviceCharge || 0;
    const onsiteTeaAllowance = payroll.onsiteBenefitsDetails?.teaAllowance || 0;

    // Total earnings
    const totalEarnings = basicPay + 
                         payroll.earnings.overtime.amount + 
                         payroll.earnings.bonus.amount + 
                         payroll.earnings.allowance.amount +
                         onsiteTeaAllowance;

    // Total deductions
    const totalDeductions = payroll.deductions.lateDeduction +
                           payroll.deductions.absentDeduction +
                           payroll.deductions.leaveDeduction +
                           payroll.deductions.halfDayDeduction +
                           mealDeduction +
                           onsiteServiceCharge;

    // Update totals
    payroll.summary.grossEarnings = totalEarnings;
    payroll.summary.totalDeductions = totalDeductions;
    payroll.summary.netPayable = Math.max(0, totalEarnings - totalDeductions);

    payroll.deductions.total = totalDeductions;

  } catch (error) {
    console.error('Update totals error:', error);
    throw error;
  }
};
 
// ==================== ADMIN EDIT CONTROLLERS ====================

// 1. Get Payroll for Edit (Admin) - FIXED VERSION
exports.getPayrollForEdit = async (req, res) => {
  try {
    const { id } = req.params;
    
    console.log(`🔄 Loading payroll for edit: ${id}`);

    const payroll = await Payroll.findById(id)
      .populate('employee', 'firstName lastName employeeId department designation workLocationType onsiteBenefits')
      .lean();

    if (!payroll || payroll.isDeleted) {
      return res.status(404).json({
        status: 'fail',
        message: 'Payroll not found'
      });
    }

    // Check if payroll can be edited
    const canEdit = payroll.status !== 'Paid' && !payroll.employeeAccepted?.accepted;
    
    // Format response for edit form
    const editData = {
      payrollId: payroll._id,
      employee: {
        id: payroll.employee?._id || payroll.employee,
        name: payroll.employeeName || `${payroll.employee?.firstName || ''} ${payroll.employee?.lastName || ''}`.trim(),
        employeeId: payroll.employeeId || payroll.employee?.employeeId,
        department: payroll.department || payroll.employee?.department,
        designation: payroll.designation || payroll.employee?.designation,
        workLocationType: payroll.employee?.workLocationType || payroll.metadata?.workLocationType
      },
      period: {
        month: payroll.month,
        year: payroll.year,
        monthName: getMonthName(payroll.month),
        startDate: payroll.periodStart,
        endDate: payroll.periodEnd
      },
      currentValues: {
        monthlySalary: payroll.salaryDetails?.monthlySalary || 0,
        overtime: payroll.earnings?.overtime?.amount || 0,
        bonus: payroll.earnings?.bonus?.amount || 0,
        allowance: payroll.earnings?.allowance?.amount || 0,
        dailyMealRate: payroll.manualInputs?.dailyMealRate || 0,
        manualMealAmount: payroll.manualInputs?.manualMealAmount || 0,
        mealDeduction: payroll.mealSystemData?.mealDeduction?.amount || 0,
        mealDeductionType: payroll.mealSystemData?.mealDeduction?.type || 'none',
        notes: payroll.notes || ''
      },
      attendance: {
        presentDays: payroll.attendance?.presentDays || 0,
        totalWorkingDays: payroll.attendance?.totalWorkingDays || 23,
        absentDays: payroll.attendance?.absentDays || 0,
        leaveDays: payroll.attendance?.leaveDays || 0,
        lateDays: payroll.attendance?.lateDays || 0,
        halfDays: payroll.attendance?.halfDays || 0
      },
      calculation: {
        dailyRate: payroll.salaryDetails?.dailyRate || 0,
        hourlyRate: payroll.salaryDetails?.hourlyRate || 0,
        overtimeRate: payroll.salaryDetails?.overtimeRate || 0
      },
      mealSystem: {
        hasMonthlySubscription: payroll.mealSystemData?.subscriptionStatus || false,
        dailyMealDays: payroll.mealSystemData?.dailyMealDays || 0,
        monthlyFoodCost: payroll.mealSystemData?.totalMonthlyFoodCost || 0,
        activeSubscribers: payroll.mealSystemData?.activeSubscribers || 0,
        deductionPerEmployee: payroll.mealSystemData?.mealDeduction?.amount || 0
      },
      onsiteBenefits: {
        included: payroll.onsiteBenefitsDetails ? true : false,
        serviceCharge: payroll.onsiteBenefitsDetails?.serviceCharge || 0,
        teaAllowance: payroll.onsiteBenefitsDetails?.teaAllowance || 0,
        netEffect: payroll.onsiteBenefitsDetails?.netEffect || 0
      },
      summary: {
        grossEarnings: payroll.summary?.grossEarnings || 0,
        totalDeductions: payroll.summary?.totalDeductions || 0,
        netPayable: payroll.summary?.netPayable || 0
      },
      status: {
        current: payroll.status || 'Pending',
        employeeAccepted: payroll.employeeAccepted?.accepted || false,
        canEdit: canEdit,
        editRestriction: canEdit ? null : 'Payroll is paid/accepted and cannot be edited'
      },
      metadata: {
        createdDate: payroll.createdAt,
        lastEdited: payroll.metadata?.lastEdited,
        editedBy: payroll.metadata?.editedBy,
        editCount: payroll.manualInputs?.editCount || 0,
        version: payroll.metadata?.version || '1.0'
      }
    };

    console.log('✅ Payroll edit data loaded successfully');

    res.status(200).json({
      status: 'success',
      message: 'Payroll data loaded for edit',
      data: editData
    });

  } catch (error) {
    console.error('❌ Get payroll for edit error:', error);
    res.status(500).json({
      status: 'fail',
      message: error.message || 'Failed to load payroll for edit'
    });
  }
};

// 2. Update Payroll (Admin Edit) - FIXED VERSION
exports.updatePayroll = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      monthlySalary,
      overtime,
      overtimeHours,
      bonus,
      bonusType = 'other_edit',
      allowance,
      allowanceType = 'other_edit',
      dailyMealRate,
      manualMealAmount,
      mealDeduction,
      mealDeductionType,
      notes,
      recalculate = true,
      // Full-override fields (admin can edit each and everything)
      basicPay: basicPayOverride,
      status: statusOverride,
      netPayable: netOverride,
      attendance: attOverride,   // { totalWorkingDays, presentDays, absentDays, lateDays, leaveDays, halfDays }
      deductions: dedOverride,   // { lateDeduction, absentDeduction, leaveDeduction, halfDayDeduction }
      slipOverrides,            // { companyName, employeeName, ..., labels, customEarnings[], customDeductions[] }
      utilityBill              // fixed utility bill deduction that feeds adjustedSalary / dailyRate
    } = req.body;

    console.log(`🔄 Updating payroll: ${id}`, req.body);

    // Validate ID
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        status: 'fail',
        message: 'Invalid payroll ID'
      });
    }

    const payroll = await Payroll.findById(id);
    
    if (!payroll) {
      return res.status(404).json({
        status: 'fail',
        message: 'Payroll not found'
      });
    }

    if (payroll.isDeleted) {
      return res.status(404).json({
        status: 'fail',
        message: 'Payroll has been deleted'
      });
    }

    // Check if payroll is already approved/paid/accepted — once an admin
    // approves a payroll it is locked and can no longer be edited.
    if (payroll.status === 'Paid') {
      return res.status(400).json({
        status: 'fail',
        message: 'Cannot edit paid payroll'
      });
    }

    if (payroll.status === 'Approved') {
      return res.status(400).json({
        status: 'fail',
        message: 'Cannot edit approved payroll'
      });
    }

    if (payroll.employeeAccepted?.accepted) {
      return res.status(400).json({
        status: 'fail',
        message: 'Cannot edit accepted payroll'
      });
    }

    // Store original values for audit
    const originalData = {
      salary: payroll.salaryDetails?.monthlySalary || 0,
      overtime: payroll.earnings?.overtime?.amount || 0,
      overtimeHours: payroll.earnings?.overtime?.hours || 0,
      bonus: payroll.earnings?.bonus?.amount || 0,
      bonusType: payroll.earnings?.bonus?.type || 'none',
      allowance: payroll.earnings?.allowance?.amount || 0,
      allowanceType: payroll.earnings?.allowance?.type || 'none',
      mealDeduction: payroll.mealDeduction?.totalDeductionAmount || 
                    payroll.foodCostDetails?.totalFoodDeduction || 0
    };

    // Parse input values
    const updates = {
      monthlySalary: monthlySalary !== undefined ? parseInt(monthlySalary) : payroll.salaryDetails?.monthlySalary,
      overtime: overtime !== undefined ? parseInt(overtime) : 0,
      overtimeHours: overtimeHours !== undefined ? parseInt(overtimeHours) : 0,
      bonus: bonus !== undefined ? parseInt(bonus) : 0,
      bonusType: bonusType || 'other_edit',
      allowance: allowance !== undefined ? parseInt(allowance) : 0,
      allowanceType: allowanceType || 'other_edit',
      dailyMealRate: dailyMealRate !== undefined ? parseFloat(dailyMealRate) : 0,
      manualMealAmount: manualMealAmount !== undefined ? parseFloat(manualMealAmount) : 0,
      mealDeduction: mealDeduction !== undefined ? parseFloat(mealDeduction) : 0,
      mealDeductionType: mealDeductionType || 'none',
      notes: notes || payroll.notes
    };

    // Ensure all required objects exist
    if (!payroll.salaryDetails) payroll.salaryDetails = {};
    if (!payroll.earnings) payroll.earnings = {};
    if (!payroll.earnings.overtime) payroll.earnings.overtime = {};
    if (!payroll.earnings.bonus) payroll.earnings.bonus = {};
    if (!payroll.earnings.allowance) payroll.earnings.allowance = {};
    if (!payroll.manualInputs) payroll.manualInputs = {};
    if (!payroll.mealDeduction) payroll.mealDeduction = {};
    if (!payroll.mealSystemData) payroll.mealSystemData = {};
    if (!payroll.foodCostDetails) payroll.foodCostDetails = {};
    if (!payroll.auditTrail) payroll.auditTrail = [];
    if (!payroll.metadata) payroll.metadata = {};

    // Update salary details
    if (updates.monthlySalary !== undefined) {
      payroll.salaryDetails.monthlySalary = updates.monthlySalary;
    }

    // Utility bill (fixed) → also refresh adjustedSalary the slip derives daily rate from
    if (utilityBill !== undefined) {
      const ub = parseFloat(utilityBill) || 0;
      payroll.salaryDetails.utilityBillDeduction = ub;
      payroll.salaryDetails.adjustedSalary = Math.max(
        0,
        (payroll.salaryDetails.monthlySalary || 0) - ub
      );
    }

    // Update overtime
    if (updates.overtime !== undefined || updates.overtimeHours !== undefined) {
      payroll.earnings.overtime.amount = updates.overtime || 0;
      payroll.earnings.overtime.hours = updates.overtimeHours || 0;
      payroll.earnings.overtime.source = updates.overtime > 0 ? 'manual' : 'none';
      payroll.earnings.overtime.description = updates.overtime > 0 ? 'Updated by admin' : '';
      
      // Update manual inputs
      payroll.manualInputs.overtime = updates.overtime || 0;
      payroll.manualInputs.overtimeHours = updates.overtimeHours || 0;
    }

    // Update bonus
    if (updates.bonus !== undefined) {
      payroll.earnings.bonus.amount = updates.bonus || 0;
      payroll.earnings.bonus.type = updates.bonus > 0 ? updates.bonusType : 'none';
      payroll.earnings.bonus.description = updates.bonus > 0 ? 'Updated by admin' : '';
      payroll.manualInputs.bonus = updates.bonus || 0;
    }

    // Update allowance
    if (updates.allowance !== undefined) {
      payroll.earnings.allowance.amount = updates.allowance || 0;
      payroll.earnings.allowance.type = updates.allowance > 0 ? updates.allowanceType : 'none';
      payroll.earnings.allowance.description = updates.allowance > 0 ? 'Updated by admin' : '';
      payroll.manualInputs.allowance = updates.allowance || 0;
    }

    // Update meal details
    if (updates.dailyMealRate !== undefined) {
      payroll.manualInputs.dailyMealRate = updates.dailyMealRate;
    }

    // Update meal deduction
    if (updates.mealDeduction !== undefined || updates.mealDeductionType !== undefined) {
      payroll.mealDeduction.totalDeductionAmount = updates.mealDeduction || 0;

      // Sanitize deductionType to a valid enum so a stray value (e.g. the slip
      // editor's "manual_edit") can never fail schema validation on save.
      const VALID_MEAL_TYPES = ['monthly_subscription', 'daily_meal', 'manual', 'none'];
      const incomingType = updates.mealDeductionType;
      if (VALID_MEAL_TYPES.includes(incomingType)) {
        payroll.mealDeduction.deductionType = incomingType;
      } else if (incomingType === 'manual_edit') {
        payroll.mealDeduction.deductionType = 'manual';
      } else if (!VALID_MEAL_TYPES.includes(payroll.mealDeduction.deductionType)) {
        payroll.mealDeduction.deductionType =
          (updates.mealDeduction || 0) > 0 ? 'manual' : 'none';
      }

      if (payroll.foodCostDetails) {
        payroll.foodCostDetails.fixedDeduction = updates.mealDeduction || 0;
        payroll.foodCostDetails.totalFoodDeduction = updates.mealDeduction || 0;
        payroll.foodCostDetails.calculationNote = updates.mealDeduction > 0 
          ? `Manually updated to ${formatCurrency(updates.mealDeduction)} by admin`
          : 'Manual adjustment removed';
      }
    }

    // Update notes
    if (updates.notes !== undefined) {
      payroll.notes = updates.notes;
    }

    // ===== Attendance & attendance-driven deductions =====
    // Auto-refresh these from the live Attendance/Leave data on every save
    // (so payroll never drifts from what the attendance route shows), but
    // still let an admin manually correct a specific field: a field is only
    // treated as an explicit override when the submitted value differs from
    // what was already stored (the edit form always echoes back the current
    // values, so an unchanged field must not be mistaken for an override).
    if (!payroll.attendance) payroll.attendance = {};
    if (!payroll.deductions) payroll.deductions = {};
    if (!payroll.summary) payroll.summary = {};

    const num = (v, fallback) => (v === undefined || v === null || v === '' ? fallback : Number(v));

    const prevAttendance = { ...(payroll.attendance.toObject?.() ?? payroll.attendance) };
    const prevDeductions = { ...(payroll.deductions.toObject?.() ?? payroll.deductions) };

    let freshCalc = null;
    if (recalculate) {
      try {
        freshCalc = await calculatePayroll(
          payroll.employee,
          payroll.salaryDetails.monthlySalary,
          payroll.month,
          payroll.year,
          {
            overtime: updates.overtime,
            bonus: updates.bonus,
            allowance: updates.allowance
          }
        );
      } catch (err) {
        console.error('Live attendance recalculation failed, keeping stored values:', err);
      }
    }

    // Attendance day counts.
    // A submitted value ALWAYS wins — the edit modal is an explicit manual
    // override and shows the admin the exact resulting net, so every field it
    // sends must persist as-is. (Previously a field was only honoured when it
    // DIFFERED from the stored value; any field left unchanged in the modal was
    // silently reverted to the live-attendance figure, which is exactly the
    // "my edit didn't stick" bug.) freshCalc only fills fields NOT provided.
    const ATT_FIELDS = ['totalWorkingDays', 'presentDays', 'absentDays', 'lateDays', 'leaveDays', 'halfDays'];
    ATT_FIELDS.forEach((field) => {
      const incoming = attOverride ? num(attOverride[field], undefined) : undefined;
      if (incoming !== undefined) {
        payroll.attendance[field] = incoming;      // explicit edit wins
      } else if (freshCalc) {
        payroll.attendance[field] = freshCalc.attendance[field] ?? 0;
      }
    });
    payroll.attendance.attendancePercentage = Math.round(
      ((payroll.attendance.presentDays || 0) / (payroll.attendance.totalWorkingDays || 1)) * 100
    );
    payroll.markModified('attendance');

    // Attendance-driven deduction amounts
    const DED_FIELD_TO_CALC_KEY = {
      lateDeduction: 'late',
      absentDeduction: 'absent',
      leaveDeduction: 'leave',
      halfDayDeduction: 'halfDay'
    };
    Object.entries(DED_FIELD_TO_CALC_KEY).forEach(([field, calcKey]) => {
      const incoming = dedOverride ? num(dedOverride[field], undefined) : undefined;
      if (incoming !== undefined) {
        payroll.deductions[field] = incoming;      // explicit edit wins
      } else if (freshCalc) {
        payroll.deductions[field] = freshCalc.calculations.deductions[calcKey]?.amount ?? 0;
      }
    });

    // Rates + basic pay: refresh from the live calculation unless the admin
    // explicitly typed a different basic pay.
    if (freshCalc) {
      payroll.salaryDetails.dailyRate = freshCalc.rates.dailyRate;
      payroll.salaryDetails.hourlyRate = freshCalc.rates.hourlyRate;
      payroll.salaryDetails.overtimeRate = freshCalc.rates.overtimeRate;
      if (basicPayOverride === undefined) {
        payroll.earnings.basicPay = freshCalc.calculations.basicPay;
      }
    }

    // Basic pay direct override (explicit admin value always wins)
    if (basicPayOverride !== undefined) {
      payroll.earnings.basicPay = num(basicPayOverride, payroll.earnings.basicPay);
    }

    // Status
    if (statusOverride !== undefined) {
      payroll.status = statusOverride;
    }

    // ===== Slip text overrides + custom line items =====
    // Sum of admin-added custom rows (used in the totals recompute below).
    let customEarnTotal = 0;
    let customDedTotal = 0;
    if (slipOverrides) {
      if (!payroll.slipOverrides) payroll.slipOverrides = {};
      const so = payroll.slipOverrides;

      // Nullable text fields — empty string clears the override (falls back to computed value)
      const textKeys = [
        'companyName', 'companyTagline', 'employeeName',
        'employeeId', 'department', 'designation', 'periodLabel'
      ];
      textKeys.forEach((k) => {
        if (slipOverrides[k] !== undefined) {
          const v = slipOverrides[k];
          so[k] = v === '' || v === null ? null : String(v);
        }
      });

      // Built-in row label renames
      if (slipOverrides.labels && typeof slipOverrides.labels === 'object') {
        so.labels = { ...(so.labels || {}), ...slipOverrides.labels };
      }

      // Custom earning / deduction rows (drop blank rows)
      const cleanItems = (arr) =>
        (Array.isArray(arr) ? arr : [])
          .map((it) => ({
            label: (it?.label || '').toString().trim(),
            amount: num(it?.amount, 0)
          }))
          .filter((it) => it.label !== '' || it.amount !== 0);

      if (slipOverrides.customEarnings !== undefined) {
        so.customEarnings = cleanItems(slipOverrides.customEarnings);
      }
      if (slipOverrides.customDeductions !== undefined) {
        so.customDeductions = cleanItems(slipOverrides.customDeductions);
      }

      payroll.markModified('slipOverrides');
    }

    // Totals of whatever custom rows are currently stored
    (payroll.slipOverrides?.customEarnings || []).forEach((it) => {
      customEarnTotal += Number(it.amount) || 0;
    });
    (payroll.slipOverrides?.customDeductions || []).forEach((it) => {
      customDedTotal += Number(it.amount) || 0;
    });

    // Update manual inputs metadata
    payroll.manualInputs.editedBy = req.user._id;
    payroll.manualInputs.editedAt = new Date();
    payroll.manualInputs.editCount = (payroll.manualInputs.editCount || 0) + 1;

    // Recalculate totals from the (now-refreshed) attendance/deductions/earnings.
    const e = payroll.earnings;
    const basicPay = num(e.basicPay, 0);
    const meal = payroll.mealDeduction?.totalDeductionAmount
              || payroll.mealSystemData?.mealDeduction?.amount
              || payroll.foodCostDetails?.totalFoodDeduction || 0;
    const onsiteTea     = payroll.onsiteBenefitsDetails?.teaAllowance || 0;
    const onsiteService = payroll.onsiteBenefitsDetails?.serviceCharge || 0;

    const gross = basicPay
      + (e.overtime?.amount || 0)
      + (e.bonus?.amount || 0)
      + (e.allowance?.amount || 0)
      + onsiteTea
      + customEarnTotal;

    const dedTotal = (payroll.deductions.lateDeduction || 0)
      + (payroll.deductions.absentDeduction || 0)
      + (payroll.deductions.leaveDeduction || 0)
      + (payroll.deductions.halfDayDeduction || 0)
      + (payroll.salaryDetails?.utilityBillDeduction || 0) // deducted LAST
      + meal + onsiteService
      + customDedTotal;

    // Mirror the meal figure into the CANONICAL fields the list/slip read
    // (deductions.mealDeduction / foodCostDeduction and
    // mealSystemData.mealDeduction.amount). The `meal` value above is already
    // baked into dedTotal/netPayable — if these fields don't match it, the
    // frontend treats the meal as "added after save" and subtracts it a second
    // time (double-counting). Keeping them in sync prevents that.
    payroll.deductions.mealDeduction = meal;
    payroll.deductions.foodCostDeduction = meal;
    payroll.deductions.serviceCharge = onsiteService;
    if (!payroll.mealSystemData) payroll.mealSystemData = {};
    payroll.mealSystemData.mealDeduction = {
      ...(payroll.mealSystemData.mealDeduction || {}),
      amount: meal
    };
    payroll.markModified('mealSystemData');
    payroll.markModified('deductions');

    payroll.deductions.total = dedTotal;
    payroll.summary.grossEarnings = gross;
    payroll.summary.totalDeductions = dedTotal;
    if (netOverride !== undefined) {
      payroll.summary.netPayable = Math.max(0, num(netOverride, 0));
      // Tell the pre-save hook to keep this exact value instead of
      // recomputing netPayable from gross - deductions.
      payroll._manualNetOverride = payroll.summary.netPayable;
    } else {
      payroll.summary.netPayable = Math.max(0, gross - dedTotal);
    }

    // Add audit trail entry
    payroll.auditTrail.push({
      action: 'update',
      performedBy: req.user._id,
      performedAt: new Date(),
      changes: {
        salary: { 
          from: originalData.salary, 
          to: payroll.salaryDetails.monthlySalary 
        },
        overtime: { 
          from: originalData.overtime, 
          to: payroll.earnings.overtime.amount 
        },
        bonus: { 
          from: originalData.bonus, 
          to: payroll.earnings.bonus.amount 
        },
        allowance: { 
          from: originalData.allowance, 
          to: payroll.earnings.allowance.amount 
        },
        mealDeduction: { 
          from: originalData.mealDeduction, 
          to: payroll.mealDeduction.totalDeductionAmount 
        }
      },
      notes: 'Manual update by admin',
      recalculated: recalculate
    });

    // Update metadata. isEdited marks this as an intentional MANUAL override so
    // the frontend trusts the stored net as-is (no live-meal re-layering) and
    // the auto-recalc-on-view is skipped. markModified because metadata is a
    // Mixed/nested path Mongoose may not track on a deep assignment.
    payroll.metadata.lastEdited = new Date();
    payroll.metadata.editedBy = req.user._id;
    payroll.metadata.isEdited = true;
    payroll.markModified('metadata');

    await payroll.save();

    console.log('✅ Payroll updated successfully:', payroll._id, '| netPayable =', payroll.summary.netPayable);

    res.status(200).json({
      status: 'success',
      message: 'Payroll updated successfully',
      data: {
        payrollId: payroll._id,
        employee: {
          name: payroll.employeeName,
          id: payroll.employeeId
        },
        period: {
          month: payroll.month,
          year: payroll.year
        },
        changes: {
          salary: payroll.salaryDetails.monthlySalary,
          overtime: payroll.earnings.overtime.amount,
          bonus: payroll.earnings.bonus.amount,
          allowance: payroll.earnings.allowance.amount,
          mealDeduction: payroll.mealDeduction.totalDeductionAmount
        },
        summary: {
          grossEarnings: payroll.summary.grossEarnings,
          totalDeductions: payroll.summary.totalDeductions,
          netPayable: payroll.summary.netPayable,
          payableDays: payroll.summary.payableDays
        }
      }
    });

  } catch (error) {
    console.error('❌ Update payroll error:', error);
    res.status(500).json({
      status: 'fail',
      message: error.message || 'Failed to update payroll'
    });
  }
};

// 3. Admin View All Payrolls - FIXED VERSION
exports.adminViewAllPayrolls = async (req, res) => {
  try {
    const {
      month,
      year,
      status,
      department,
      employeeId,
      page = 1,
      limit = 50,
      view = 'detailed'
    } = req.query;

    const query = { isDeleted: false };
    
    if (month && month !== 'all') {
      query.month = parseInt(month);
    }
    
    if (year && year !== 'all') {
      query.year = parseInt(year);
    }
    
    if (status && status !== 'all') {
      query.status = status;
    }
    
    if (department && department !== 'all') {
      query.department = department;
    }
    
    if (employeeId) {
      query.employeeId = employeeId;
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);
    
    // Get payrolls with all details
    const payrolls = await Payroll.find(query)
      .populate('employee', 'firstName lastName email phone department designation workLocationType onsiteBenefits')
      .populate('createdBy', 'firstName lastName')
      .populate('approvedBy', 'firstName lastName')
      .populate('paidBy', 'firstName lastName')
      .sort({ year: -1, month: -1, department: 1, employeeName: 1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await Payroll.countDocuments(query);

    // Enhanced summary calculations
    const summary = await Payroll.aggregate([
      { $match: query },
      {
        $group: {
          _id: null,
          totalNetPayable: { $sum: '$summary.netPayable' },
          totalDeductions: { $sum: '$deductions.total' },
          totalEarnings: { $sum: '$summary.grossEarnings' },
          totalPayrolls: { $sum: 1 },
          paidAmount: {
            $sum: {
              $cond: [{ $eq: ['$status', 'Paid'] }, '$summary.netPayable', 0]
            }
          },
          pendingAmount: {
            $sum: {
              $cond: [{ $eq: ['$status', 'Pending'] }, '$summary.netPayable', 0]
            }
          },
          approvedAmount: {
            $sum: {
              $cond: [{ $eq: ['$status', 'Approved'] }, '$summary.netPayable', 0]
            }
          }
        }
      }
    ]);

    // Format payrolls for frontend
    const formattedPayrolls = payrolls.map(p => {
      const payrollObj = p.toObject ? p.toObject() : p;
      return {
        ...payrollObj,
        period: `${getMonthName(payrollObj.month)} ${payrollObj.year}`,
        attendancePercentage: payrollObj.attendance?.attendancePercentage || 0,
        canEdit: payrollObj.status !== 'Paid' && !payrollObj.employeeAccepted?.accepted,
        hasMealDeduction: payrollObj.mealSystemData?.mealDeduction?.amount > 0,
        hasOnsiteBenefits: payrollObj.onsiteBenefitsDetails ? true : false,
        netOnsiteEffect: payrollObj.onsiteBenefitsDetails?.netEffect || 0
      };
    });

    res.status(200).json({
      status: 'success',
      message: 'Payroll data loaded successfully',
      data: {
        payrolls: formattedPayrolls,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / parseInt(limit))
        },
        summary: summary[0] || {
          totalNetPayable: 0,
          totalDeductions: 0,
          totalEarnings: 0,
          totalPayrolls: 0,
          paidAmount: 0,
          pendingAmount: 0
        },
        filters: {
          month,
          year,
          status,
          department,
          employeeId,
          view
        }
      }
    });

  } catch (error) {
    console.error('❌ Admin view all payrolls error:', error);
    res.status(500).json({
      status: 'fail',
      message: error.message || 'Failed to load payroll data'
    });
  }
};

// Export internal helper so cron can reuse it without going through Express
exports._calculatePayrollHelper = calculatePayroll;
 