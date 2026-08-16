const Payroll = require("../models/PayrollModel");
const OfficeRent = require("../models/officeRentModel");
const UtilityBill = require("../models/utilitybillsModel");
const OfficeSupply = require("../models/officeSupplyModel");
const SoftwareSubscription = require("../models/softwareSubscriptionModel");
const TransportExpense = require("../models/transportModel");
const ExtraExpense = require("../models/miscellaneousModel");
const FoodCost = require("../models/foodCostModel");

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

// Order controls display order in the dashboard's category breakdown.
const CATEGORY_META = [
  { key: "employeeSalaries", category: "Employee Salaries", color: "#8B5CF6", icon: "👨‍💼" },
  { key: "officeRent", category: "House Rent", color: "#A855F7", icon: "🏢" },
  { key: "utilities", category: "Utilities", color: "#D946EF", icon: "💡" },
  { key: "officeSupplies", category: "Office Supplies", color: "#EC4899", icon: "📦" },
  { key: "softwareSubscriptions", category: "Software Subscriptions", color: "#F43F5E", icon: "💻" },
  { key: "transportExpenses", category: "Transport Expenses", color: "#8B5CF6", icon: "🚗" },
  { key: "extraExpenses", category: "Extra Expenses", color: "#A855F7", icon: "📝" },
  { key: "foodCosts", category: "Food Costs", color: "#D946EF", icon: "🍽️" },
];

function monthRange(year, month) {
  const start = new Date(year, month - 1, 1, 0, 0, 0, 0);
  const end = new Date(year, month, 0, 23, 59, 59, 999);
  return { start, end };
}

// Sums a date-ranged numeric field for models whose only reliable period
// marker is their `date` field (office rent, supplies, subscriptions,
// transport, misc expenses, food costs).
async function sumByDateRange(Model, dateField, valueField, start, end) {
  const result = await Model.aggregate([
    { $match: { [dateField]: { $gte: start, $lte: end } } },
    { $group: { _id: null, total: { $sum: `$${valueField}` } } },
  ]);
  return result[0]?.total || 0;
}

// Groups a date-ranged numeric field by calendar month (1-12) for the yearly view.
async function sumByMonth(Model, dateField, valueField, start, end) {
  const rows = await Model.aggregate([
    { $match: { [dateField]: { $gte: start, $lte: end } } },
    { $group: { _id: { $month: `$${dateField}` }, total: { $sum: `$${valueField}` } } },
  ]);
  return rows;
}

function buildEmptyMonthlyBreakdown() {
  return Array.from({ length: 12 }, (_, i) => ({
    month: i + 1,
    monthName: MONTH_NAMES[i].slice(0, 3),
    total: 0,
    employeeSalaries: 0,
    officeRent: 0,
    utilities: 0,
    officeSupplies: 0,
    softwareSubscriptions: 0,
    transportExpenses: 0,
    extraExpenses: 0,
    foodCosts: 0,
  }));
}

function applyMonthlyRows(monthlyBreakdown, rows, key) {
  rows.forEach(({ _id, total }) => {
    const idx = _id - 1;
    if (idx >= 0 && idx < 12) {
      monthlyBreakdown[idx][key] += total;
      monthlyBreakdown[idx].total += total;
    }
  });
}

// GET /dashboard/monthly-summary?year=&month=
// Aggregates every expense source directly in MongoDB for the requested
// month, rather than pulling every record to the client and filtering
// there. Payroll is matched on its own `month`/`year` fields (the
// authoritative pay-period identifiers), never on createdAt/updatedAt,
// so a payroll generated or recalculated late never lands in the wrong month.
// Employee Salaries only counts status: "Paid" payrolls, since Draft/Pending/
// Approved/Rejected/Processing records aren't money that's actually gone out yet.
exports.getMonthlySummary = async (req, res) => {
  try {
    const now = new Date();
    const year = parseInt(req.query.year) || now.getFullYear();
    const month = parseInt(req.query.month) || now.getMonth() + 1;
    const { start, end } = monthRange(year, month);

    const [
      payrollAgg,
      officeRent,
      utilities,
      officeSupplies,
      softwareSubscriptions,
      transportExpenses,
      extraExpenses,
      foodCosts,
    ] = await Promise.all([
      Payroll.aggregate([
        { $match: { isDeleted: false, month, year, status: "Paid" } },
        { $group: { _id: null, total: { $sum: "$summary.netPayable" } } },
      ]),
      sumByDateRange(OfficeRent, "date", "rent", start, end),
      UtilityBill.aggregate([
        { $match: { month, year } },
        { $group: { _id: null, total: { $sum: "$amount" } } },
      ]).then((rows) => rows[0]?.total || 0),
      sumByDateRange(OfficeSupply, "date", "price", start, end),
      sumByDateRange(SoftwareSubscription, "date", "amount", start, end),
      sumByDateRange(TransportExpense, "date", "cost", start, end),
      sumByDateRange(ExtraExpense, "date", "amount", start, end),
      sumByDateRange(FoodCost, "date", "cost", start, end),
    ]);

    const amounts = {
      employeeSalaries: payrollAgg[0]?.total || 0,
      officeRent,
      utilities,
      officeSupplies,
      softwareSubscriptions,
      transportExpenses,
      extraExpenses,
      foodCosts,
    };

    const total = Object.values(amounts).reduce((sum, value) => sum + value, 0);

    const categoryBreakdown = CATEGORY_META
      .map((meta) => ({ ...meta, amount: amounts[meta.key] }))
      .filter((item) => item.amount > 0);

    res.json({
      success: true,
      data: { year, month, total, ...amounts, categoryBreakdown },
    });
  } catch (error) {
    console.error("Error building monthly dashboard summary:", error);
    res.status(500).json({ success: false, error: error.message });
  }
};

// GET /dashboard/yearly-summary?year=
exports.getYearlySummary = async (req, res) => {
  try {
    const year = parseInt(req.query.year) || new Date().getFullYear();
    const yearStart = new Date(year, 0, 1, 0, 0, 0, 0);
    const yearEnd = new Date(year, 11, 31, 23, 59, 59, 999);

    const [
      payrollRows,
      rentRows,
      utilityRows,
      supplyRows,
      softwareRows,
      transportRows,
      extraRows,
      foodRows,
    ] = await Promise.all([
      Payroll.aggregate([
        { $match: { isDeleted: false, year, status: "Paid" } },
        { $group: { _id: "$month", total: { $sum: "$summary.netPayable" } } },
      ]),
      sumByMonth(OfficeRent, "date", "rent", yearStart, yearEnd),
      UtilityBill.aggregate([
        { $match: { year } },
        { $group: { _id: "$month", total: { $sum: "$amount" } } },
      ]),
      sumByMonth(OfficeSupply, "date", "price", yearStart, yearEnd),
      sumByMonth(SoftwareSubscription, "date", "amount", yearStart, yearEnd),
      sumByMonth(TransportExpense, "date", "cost", yearStart, yearEnd),
      sumByMonth(ExtraExpense, "date", "amount", yearStart, yearEnd),
      sumByMonth(FoodCost, "date", "cost", yearStart, yearEnd),
    ]);

    const monthlyBreakdown = buildEmptyMonthlyBreakdown();
    applyMonthlyRows(monthlyBreakdown, payrollRows, "employeeSalaries");
    applyMonthlyRows(monthlyBreakdown, rentRows, "officeRent");
    applyMonthlyRows(monthlyBreakdown, utilityRows, "utilities");
    applyMonthlyRows(monthlyBreakdown, supplyRows, "officeSupplies");
    applyMonthlyRows(monthlyBreakdown, softwareRows, "softwareSubscriptions");
    applyMonthlyRows(monthlyBreakdown, transportRows, "transportExpenses");
    applyMonthlyRows(monthlyBreakdown, extraRows, "extraExpenses");
    applyMonthlyRows(monthlyBreakdown, foodRows, "foodCosts");

    const categoryTotals = CATEGORY_META
      .map((meta) => ({
        ...meta,
        amount: monthlyBreakdown.reduce((sum, m) => sum + m[meta.key], 0),
      }))
      .filter((item) => item.amount > 0);

    const total = categoryTotals.reduce((sum, item) => sum + item.amount, 0);
    const filteredMonthlyBreakdown = monthlyBreakdown.filter((m) => m.total > 0);

    res.json({
      success: true,
      data: { year, total, monthlyBreakdown: filteredMonthlyBreakdown, categoryTotals },
    });
  } catch (error) {
    console.error("Error building yearly dashboard summary:", error);
    res.status(500).json({ success: false, error: error.message });
  }
};

// GET /dashboard/recent-expenses?limit=
// Recency here is a display concern only (not used for month bucketing
// anywhere), so payroll may use its real periodEnd/periodStart dates safely.
exports.getRecentExpenses = async (req, res) => {
  try {
    const limit = Math.min(parseInt(req.query.limit) || 10, 50);
    const now = new Date();
    const oneMonthAgo = new Date(now.getFullYear(), now.getMonth() - 1, now.getDate());
    const fetchCap = 50;

    const [payrolls, rents, bills, supplies, software, transport, extras, foods] =
      await Promise.all([
        Payroll.find({ isDeleted: false, periodEnd: { $gte: oneMonthAgo } })
          .select("employeeName employeeId employee status summary periodEnd periodStart")
          .populate("employee", "firstName lastName")
          .sort({ periodEnd: -1 })
          .limit(fetchCap),
        OfficeRent.find({ date: { $gte: oneMonthAgo } }).sort({ date: -1 }).limit(fetchCap),
        UtilityBill.find({ date: { $gte: oneMonthAgo } }).sort({ date: -1 }).limit(fetchCap),
        OfficeSupply.find({ date: { $gte: oneMonthAgo } }).sort({ date: -1 }).limit(fetchCap),
        SoftwareSubscription.find({ date: { $gte: oneMonthAgo } }).sort({ date: -1 }).limit(fetchCap),
        TransportExpense.find({ date: { $gte: oneMonthAgo } }).sort({ date: -1 }).limit(fetchCap),
        ExtraExpense.find({ date: { $gte: oneMonthAgo } }).sort({ date: -1 }).limit(fetchCap),
        FoodCost.find({ date: { $gte: oneMonthAgo } }).sort({ date: -1 }).limit(fetchCap),
      ]);

    const items = [];

    payrolls.forEach((p) => {
      const employeeName =
        p.employeeName ||
        [p.employee?.firstName, p.employee?.lastName].filter(Boolean).join(" ") ||
        p.employeeId ||
        "Employee Salary";
      items.push({
        id: p._id,
        category: "Employee Salary",
        name: employeeName,
        amount: p.summary?.netPayable || 0,
        date: p.periodEnd || p.periodStart,
        payment: p.status || "Payroll",
      });
    });

    rents.forEach((r) => {
      items.push({
        id: r._id,
        category: "House Rent",
        name: r.note || "Office Rent",
        amount: r.rent,
        date: r.date,
        payment: r.paymentMethod || "Cash",
      });
    });

    bills.forEach((b) => {
      items.push({
        id: b._id,
        category: "Utility Bill",
        name: b.name,
        amount: b.amount,
        date: b.date,
        payment: b.paymentMethod || "Cash",
      });
    });

    supplies.forEach((s) => {
      items.push({
        id: s._id,
        category: "Office Supply",
        name: s.name,
        amount: s.price,
        date: s.date,
        payment: s.paymentMethod || "Cash",
      });
    });

    software.forEach((s) => {
      items.push({
        id: s._id,
        category: "Software Subscription",
        name: s.softwareName,
        amount: s.amount,
        date: s.date,
        payment: s.paymentMethod || "Cash",
      });
    });

    transport.forEach((t) => {
      items.push({
        id: t._id,
        category: "Transport Expense",
        name: t.transportName,
        amount: t.cost,
        date: t.date,
        payment: t.paymentMethod || "Cash",
      });
    });

    extras.forEach((e) => {
      items.push({
        id: e._id,
        category: "Extra Expense",
        name: e.expenseName,
        amount: e.amount,
        date: e.date,
        payment: e.paymentMethod || "Cash",
      });
    });

    foods.forEach((f) => {
      items.push({
        id: f._id,
        category: "Food Cost",
        name: f.note || "Food Cost",
        amount: f.cost,
        date: f.date,
        payment: "Cash",
      });
    });

    items.sort((a, b) => new Date(b.date) - new Date(a.date));

    res.json({ success: true, data: items.slice(0, limit) });
  } catch (error) {
    console.error("Error building recent expenses feed:", error);
    res.status(500).json({ success: false, error: error.message });
  }
};
