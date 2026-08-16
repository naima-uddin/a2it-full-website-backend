const jwt = require("jsonwebtoken");

const authMiddleware = (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(" ")[1];

    if (!token) {
      return res.status(401).json({
        success: false,
        message: "No token provided, authorization denied",
      });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.userId = decoded.userId;
    req.role = decoded.role;
    next();
  } catch (error) {
    res.status(401).json({
      success: false,
      message: "Token is not valid",
      error: error.message,
    });
  }
};

const adminMiddleware = (req, res, next) => {
  if (req.role !== "admin") {
    return res.status(403).json({
      success: false,
      message: "Access denied. Admin privileges required.",
    });
  }
  next();
};

const requireAdminOrModerator = (req, res, next) => {
  if (req.role === "admin" || req.role === "moderator") {
    return next();
  }
  return res.status(403).json({
    success: false,
    message: "Access denied. Admin or Moderator privileges required.",
  });
};

module.exports = { authMiddleware, adminMiddleware, requireAdminOrModerator };
