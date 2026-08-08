const jwt = require("jsonwebtoken");
const User = require("../models/User");

const protect = async (req, res, next) => {
  let token;

  // รับ token จาก header
  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith("Bearer")
  ) {
    try {
      token = req.headers.authorization.split(" ")[1];

      // verify token
      const decoded = jwt.verify(
        token,
        process.env.JWT_SECRET
      );

      // ใส่ user ลง request
      const user = await User.findById(
        decoded.id
      ).select("name email role permissions");

      req.user = {
        ...decoded,
        name: decoded.name || user?.name,
        email: decoded.email || user?.email,
        role: decoded.role || user?.role,
        permissions: user?.permissions || {},
      };

      next();

    } catch (error) {
      res.status(401).json({
        message: "Token invalid"
      });
    }

  } else {
    res.status(401).json({
      message: "No token provided"
    });
  }
};

// admin only middleware
const adminOnly = (req, res, next) => {
  if (req.user && req.user.role === "admin") {
    next();
  } else {
    res.status(403).json({
      message: "Admin only"
    });
  }
};

const allowPermission = (permission) => (req, res, next) => {
  if (
    req.user?.role === "admin" ||
    req.user?.permissions?.[permission]
  ) {
    return next();
  }

  return res.status(403).json({
    message: "Permission denied",
  });
};

module.exports = {
  protect,
  adminOnly,
  allowPermission
};
