const express = require("express");

const router = express.Router();

const { protect, allowPermission } =
  require("../middleware/authMiddleware");

const {
  getUsers,
  updatePermissions,
} = require("../controllers/userController");

router.get("/test", protect, allowPermission("canManageUsers"), (req, res) => {
  res.send("USER ROUTE WORK");
});

router.get("/", protect, allowPermission("canManageUsers"), getUsers);

router.put("/:id", protect, allowPermission("canManageUsers"), updatePermissions);

module.exports = router;
