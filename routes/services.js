const express = require("express");
const {
  authMiddleware,
  adminMiddleware,
  requireAdminOrModerator,
} = require("../middleware/auth");
const {
  getServices,
  getAdminServices,
  createService,
  updateService,
  deleteService,
} = require("../controllers/servicesController");

const router = express.Router();

router.get("/", getServices);

router.get("/admin/all", authMiddleware, getAdminServices);

router.post("/", authMiddleware, requireAdminOrModerator, createService);

router.put("/:id", authMiddleware, requireAdminOrModerator, updateService);

router.delete("/:id", authMiddleware, adminMiddleware, deleteService);

module.exports = router;
