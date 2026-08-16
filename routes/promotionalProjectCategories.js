const express = require("express");
const {
  authMiddleware,
  adminMiddleware,
  requireAdminOrModerator,
} = require("../middleware/auth");
const {
  getPromotionalProjectCategories,
  createPromotionalProjectCategory,
  deletePromotionalProjectCategory,
} = require("../controllers/promotionalProjectCategoriesController");

const router = express.Router();

router.get("/", getPromotionalProjectCategories);
router.post(
  "/",
  authMiddleware,
  requireAdminOrModerator,
  createPromotionalProjectCategory,
);
router.delete(
  "/:name",
  authMiddleware,
  adminMiddleware,
  deletePromotionalProjectCategory,
);

module.exports = router;
