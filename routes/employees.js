const express = require("express");
const router = express.Router();
const {
  authMiddleware,
  adminMiddleware,
  requireAdminOrModerator,
} = require("../middleware/auth");
const {
  getEmployees,
  getAdminEmployees,
  createEmployee,
  updateEmployee,
  deleteEmployee,
} = require("../controllers/employeesController");

router.get("/", getEmployees);

router.get("/admin/all", authMiddleware, adminMiddleware, getAdminEmployees);

router.post("/", authMiddleware, requireAdminOrModerator, createEmployee);

router.put("/:id", authMiddleware, requireAdminOrModerator, updateEmployee);

router.delete("/:id", authMiddleware, adminMiddleware, deleteEmployee);

module.exports = router;
