const express = require("express");
const {
  authMiddleware,
  adminMiddleware,
  requireAdminOrModerator,
} = require("../middleware/auth");
const {
  getPromotionalProjects,
  getAdminPromotionalProjects,
  createPromotionalProject,
  reorderPromotionalProjects,
  updatePromotionalProject,
  deletePromotionalProject,
} = require("../controllers/promotionalProjectsController");

const router = express.Router();

router.get("/", getPromotionalProjects);

router.get("/admin/all", authMiddleware, getAdminPromotionalProjects);

router.post(
  "/",
  authMiddleware,
  requireAdminOrModerator,
  createPromotionalProject,
);

router.put(
  "/reorder",
  authMiddleware,
  requireAdminOrModerator,
  reorderPromotionalProjects,
);

router.put(
  "/:id",
  authMiddleware,
  requireAdminOrModerator,
  updatePromotionalProject,
);

router.delete(
  "/:id",
  authMiddleware,
  adminMiddleware,
  deletePromotionalProject,
);

module.exports = router;
