const express = require("express");
const {
  authMiddleware,
  requireAdminOrModerator,
} = require("../middleware/auth");
const {
  getContent,
  listContent,
  upsertContent,
} = require("../controllers/servicePageContentController");

const router = express.Router();

router.get("/", listContent);

router.get("/:key", getContent);

router.put("/:key", authMiddleware, requireAdminOrModerator, upsertContent);

module.exports = router;
