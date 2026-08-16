const express = require("express");
const {
  authMiddleware,
  adminMiddleware,
  requireAdminOrModerator,
} = require("../middleware/auth");
const {
  getPromotionalPackages,
  getAdminPromotionalPackages,
  createPromotionalPackage,
  updatePromotionalPackage,
  deletePromotionalPackage,
} = require("../controllers/promotionalPackagesController");

const router = express.Router();

router.get("/", getPromotionalPackages);

router.get("/admin/all", authMiddleware, getAdminPromotionalPackages);

router.post(
  "/",
  authMiddleware,
  requireAdminOrModerator,
  createPromotionalPackage,
);

router.put(
  "/:id",
  authMiddleware,
  requireAdminOrModerator,
  updatePromotionalPackage,
);

router.delete(
  "/:id",
  authMiddleware,
  adminMiddleware,
  deletePromotionalPackage,
);

module.exports = router;
