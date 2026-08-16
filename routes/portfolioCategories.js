const express = require("express");
const {
  authMiddleware,
  adminMiddleware,
  requireAdminOrModerator,
} = require("../middleware/auth");
const {
  getPortfolioCategories,
  createPortfolioCategory,
  deletePortfolioCategory,
} = require("../controllers/portfolioCategoriesController");

const router = express.Router();

router.get("/", getPortfolioCategories);
router.post(
  "/",
  authMiddleware,
  requireAdminOrModerator,
  createPortfolioCategory,
);
router.delete(
  "/:name",
  authMiddleware,
  adminMiddleware,
  deletePortfolioCategory,
);

module.exports = router;
