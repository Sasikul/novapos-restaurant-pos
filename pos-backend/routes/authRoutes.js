const express = require("express");
const router = express.Router();

// ✅ ต้องใช้ { } แบบนี้
const { protect, adminOnly } = require("../middleware/authMiddleware");

const {
  register,
  login,
} = require("../controllers/authController");

// register
router.post("/register", register);

// login
router.post("/login", login);

// protected
router.get("/profile", protect, (req, res) => {
  res.json({
    message: "Protected route working",
    user: req.user
  });
});

// admin only
router.get("/admin", protect, adminOnly, (req, res) => {
  res.json({
    message: "Welcome Admin 🔥"
  });
});

module.exports = router;