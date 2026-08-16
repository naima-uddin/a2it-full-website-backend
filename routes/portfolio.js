const express = require("express");
const {
  authMiddleware,
  adminMiddleware,
  requireAdminOrModerator,
} = require("../middleware/auth");
const {
  getPortfolios,
  getAdminPortfolios,
  createPortfolio,
  updatePortfolio,
  reorderPortfolios,
  deletePortfolio,
} = require("../controllers/portfolioController");

const router = express.Router();

router.get("/", getPortfolios);

router.get("/admin/all", authMiddleware, getAdminPortfolios);

router.post("/", authMiddleware, requireAdminOrModerator, createPortfolio);

// Must be declared before "/:id" so it isn't matched as an id param
router.put(
  "/reorder",
  authMiddleware,
  requireAdminOrModerator,
  reorderPortfolios,
);

router.put("/:id", authMiddleware, requireAdminOrModerator, updatePortfolio);

router.delete("/:id", authMiddleware, adminMiddleware, deletePortfolio);

module.exports = router;
