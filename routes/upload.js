const express = require("express");
const { authMiddleware } = require("../middleware/auth");
const {
  upload,
  uploadImageByType,
  uploadEmployeeImage,
  uploadBlogImage,
  uploadPortfolioImage,
  uploadServiceImage,
  uploadClientLogoImage,
  listPortfolioResources,
  listMediaResources,
  deletePortfolioResource,
} = require("../controllers/uploadController");

const router = express.Router();

router.post(
  "/image/:type",
  authMiddleware,
  upload.single("image"),
  uploadImageByType,
);
router.post(
  "/employees",
  authMiddleware,
  upload.single("image"),
  uploadEmployeeImage,
);
router.post("/blogs", authMiddleware, upload.single("image"), uploadBlogImage);
router.post(
  "/portfolio",
  authMiddleware,
  upload.single("image"),
  uploadPortfolioImage,
);
router.post(
  "/services",
  authMiddleware,
  upload.single("image"),
  uploadServiceImage,
);
router.post(
  "/clients",
  authMiddleware,
  upload.single("image"),
  uploadClientLogoImage,
);
router.get("/portfolio/list", authMiddleware, listPortfolioResources);
router.get("/media/list", authMiddleware, listMediaResources);
router.delete("/portfolio", authMiddleware, deletePortfolioResource);

module.exports = router;
