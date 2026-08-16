const cloudinary = require("cloudinary").v2;
const multer = require("multer");

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith("image/")) {
      cb(null, true);
    } else {
      cb(new Error("Only image files are allowed"));
    }
  },
});

const CLOUDINARY_FOLDERS = {
  employees: "a2it/employees",
  blogs: "a2it/blog/images",
  portfolio: "a2it/portfolio",
  services: "a2it/services",
  users: "a2it/users",
  clients: "a2it/clients",
  general: "a2it/general",
};

const uploadToCloudinary = (fileBuffer, folder) => {
  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder,
        resource_type: "auto",
        quality: "auto",
        fetch_format: "auto",
      },
      (error, result) => {
        if (error) {
          reject(error);
          return;
        }
        resolve(result);
      },
    );

    uploadStream.end(fileBuffer);
  });
};

const ensureFile = (req, res) => {
  if (!req.file) {
    res.status(400).json({ success: false, error: "No image provided" });
    return false;
  }
  return true;
};

const uploadImageByType = async (req, res) => {
  try {
    if (!ensureFile(req, res)) return;

    const uploadType = req.params.type?.toLowerCase() || "general";
    const folder = CLOUDINARY_FOLDERS[uploadType] || CLOUDINARY_FOLDERS.general;
    const result = await uploadToCloudinary(req.file.buffer, folder);

    return res.json({
      success: true,
      url: result.secure_url,
      publicId: result.public_id,
      folder,
    });
  } catch (error) {
    console.error("Cloudinary upload error:", error);
    return res.status(500).json({ success: false, error: "Upload failed" });
  }
};

const uploadToFixedFolder = (folderKey, errorLabel) => {
  return async (req, res) => {
    try {
      if (!ensureFile(req, res)) return;

      const result = await uploadToCloudinary(
        req.file.buffer,
        CLOUDINARY_FOLDERS[folderKey],
      );

      return res.json({
        success: true,
        url: result.secure_url,
        publicId: result.public_id,
        folder: CLOUDINARY_FOLDERS[folderKey],
      });
    } catch (error) {
      console.error(`Error uploading ${errorLabel} image:`, error);
      return res.status(500).json({ success: false, error: "Server error" });
    }
  };
};

const uploadEmployeeImage = uploadToFixedFolder("employees", "employee");
const uploadBlogImage = uploadToFixedFolder("blogs", "blog");
const uploadPortfolioImage = uploadToFixedFolder("portfolio", "portfolio");
const uploadServiceImage = uploadToFixedFolder("services", "service");
const uploadClientLogoImage = uploadToFixedFolder("clients", "client logo");

const listPortfolioResources = async (req, res) => {
  try {
    const prefix = CLOUDINARY_FOLDERS.portfolio;
    const resources = await cloudinary.api.resources({
      type: "upload",
      prefix,
      max_results: 200,
    });

    return res.json({ success: true, resources: resources.resources });
  } catch (error) {
    console.error("Error listing Cloudinary resources:", error);
    return res
      .status(500)
      .json({ success: false, error: "Failed to list resources" });
  }
};

const listMediaResources = async (req, res) => {
  try {
    const folder = String(req.query.folder || "").trim();
    const prefix = folder || "a2it/";

    const fetchResources = async (resourceType) => {
      const result = await cloudinary.api.resources({
        type: "upload",
        resource_type: resourceType,
        prefix,
        max_results: 500,
      });

      return result.resources || [];
    };

    let resources = [];

    if (prefix.startsWith("a2it/blog")) {
      const [images, videos] = await Promise.all([
        fetchResources("image"),
        fetchResources("video"),
      ]);

      resources = [...images, ...videos].sort((a, b) => {
        const aTime = new Date(a.created_at || 0).getTime();
        const bTime = new Date(b.created_at || 0).getTime();
        return bTime - aTime;
      });
    } else {
      resources = await fetchResources("image");
    }

    return res.json({
      success: true,
      resources,
      items: resources,
      next_cursor: null,
    });
  } catch (error) {
    console.error("Error listing media resources:", error);
    return res
      .status(500)
      .json({ success: false, error: "Failed to list media resources" });
  }
};

const deletePortfolioResource = async (req, res) => {
  try {
    const publicId = String(req.query.publicId || "").trim();

    if (!publicId) {
      return res.status(400).json({
        success: false,
        error: "publicId is required",
      });
    }

    const result = await cloudinary.uploader.destroy(publicId, {
      resource_type: "image",
    });

    return res.json({
      success: true,
      result,
    });
  } catch (error) {
    console.error("Error deleting Cloudinary resource:", error);
    return res.status(500).json({
      success: false,
      error: "Failed to delete resource",
    });
  }
};

module.exports = {
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
};
