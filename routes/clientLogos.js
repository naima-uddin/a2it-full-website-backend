const express = require("express");
const {
  authMiddleware,
  adminMiddleware,
  requireAdminOrModerator,
} = require("../middleware/auth");
const {
  getClientLogos,
  getAdminClientLogos,
  createClientLogo,
  updateClientLogo,
  deleteClientLogo,
} = require("../controllers/clientLogosController");

const router = express.Router();

router.get("/", getClientLogos);

router.get("/admin/all", authMiddleware, getAdminClientLogos);

router.post("/", authMiddleware, requireAdminOrModerator, createClientLogo);

router.put("/:id", authMiddleware, requireAdminOrModerator, updateClientLogo);

router.delete("/:id", authMiddleware, adminMiddleware, deleteClientLogo);

module.exports = router;
