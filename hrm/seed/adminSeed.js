const path = require("path");
require("dotenv").config({ path: path.resolve(__dirname, "../../.env") });

const mongoose = require("mongoose");
const User = require("../models/UsersModel");

// ── Default admin credentials ──────────────────────────────────────────────
const ADMIN_DATA = {
  firstName: process.env.ADMIN_SEED_FIRSTNAME || "Super",
  lastName: process.env.ADMIN_SEED_LASTNAME || "Admin",
  email:
    process.env.ADMIN_SEED_EMAIL ||
    process.env.ADMIN_EMAIL ||
    "admin@a2itltd.com",
  password: process.env.ADMIN_SEED_PASSWORD || "Admin@123",
  role: "admin",

  isActive: true,
  status: "active",

  department: "Administration",
  designation: "System Administrator",
  phone: "01700000000",
  address: "Dhaka, Bangladesh",

  salaryType: "monthly",
  salary: 0,
  basicSalary: 0,
  rate: 0,
  joiningDate: new Date(),

  adminLevel: "super",
  companyName: "A2IT Ltd.",
  isSuperAdmin: true,
  canManageUsers: true,
  canManagePayroll: true,

  permissions: [
    "user:read",
    "user:create",
    "user:update",
    "user:delete",
    "payroll:manage",
    "settings:manage",
    "reports:view",
  ],
};
// ──────────────────────────────────────────────────────────────────────────

const seedAdmin = async () => {
  if (!process.env.MONGO_URI) {
    console.error("❌ MONGO_URI not found in .env");
    process.exit(1);
  }

  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log("✅ MongoDB connected");

    const existing = await User.findOne({ email: ADMIN_DATA.email });

    if (existing) {
      console.log("⚠️  Admin already exists — skipping creation.");
      console.log("   Email :", existing.email);
      console.log("   Role  :", existing.role);
    } else {
      // Password is hashed automatically by UsersModel pre-save hook
      const admin = await User.create(ADMIN_DATA);
      console.log("✅ Default admin created successfully!");
      console.log("   Name  :", admin.firstName, admin.lastName);
      console.log("   Email :", admin.email);
      console.log("   Role  :", admin.role);
      console.log(
        "   Pass  : Admin@123  ← login করার পরে password change করুন",
      );
    }

    process.exit(0);
  } catch (err) {
    console.error("❌ Seed failed:", err.message);
    process.exit(1);
  }
};

seedAdmin();
