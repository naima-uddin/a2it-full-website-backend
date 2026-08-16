const express = require("express");
const {
  authMiddleware,
  adminMiddleware,
  requireAdminOrModerator,
} = require("../middleware/auth");
const {
  getServiceCategories,
  createServiceCategory,
  deleteServiceCategory,
} = require("../controllers/serviceCategoriesController");

const router = express.Router();

router.get("/", getServiceCategories);
router.post(
  "/",
  authMiddleware,
  requireAdminOrModerator,
  createServiceCategory,
);
router.delete("/:name", authMiddleware, adminMiddleware, deleteServiceCategory);

module.exports = router;
