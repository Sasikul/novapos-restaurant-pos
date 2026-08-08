const express = require("express");
const router = express.Router();

const {
  protect,
  allowPermission,
} = require("../middleware/authMiddleware");

const {
  createMenu,
  getMenus,
  updateMenu,
  deleteMenu
} = require("../controllers/menuController");


// ➕ เพิ่มเมนู (Admin only)
router.post("/", protect, allowPermission("canEditMenu"), createMenu);

// 📋 ดูเมนู
router.get("/", getMenus);

// ✏️ แก้เมนู (Admin only)
router.put("/:id", protect, allowPermission("canEditMenu"), updateMenu);

// 🗑️ ลบเมนู (Admin only)
router.delete("/:id", protect, allowPermission("canEditMenu"), deleteMenu);

module.exports = router;
