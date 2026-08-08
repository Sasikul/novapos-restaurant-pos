const User = require("../models/User");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");

const adminPermissions = {
  canDiscount: true,
  canDeleteItem: true,
  canCancelOrder: true,
  canRefund: true,
  canEditMenu: true,
  canViewDashboard: true,
  canManageUsers: true,
  canManageKitchen: true,
  canCloseStore: true,
  canExportReports: true,
};

exports.register = async (req, res) => {
  try {
    const { name, email, password } = req.body;

    let user = await User.findOne({ email });

    if (user) {
      return res.status(400).json({
        message: "User already exists",
      });
    }

    const userCount = await User.countDocuments();
    const role = userCount === 0 ? "admin" : req.body.role || "employee";
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    user = new User({
      name,
      email,
      password: hashedPassword,
      role,
      permissions: role === "admin" ? adminPermissions : {},
    });

    await user.save();

    res.json({
      message:
        role === "admin"
          ? "Admin registered successfully"
          : "User registered successfully",
    });
  } catch (error) {
    res.status(500).json({
      message: error.message,
    });
  }
};

exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email });

    if (!user) {
      return res.status(400).json({
        message: "User not found",
      });
    }

    const isMatch = await bcrypt.compare(password, user.password);

    if (!isMatch) {
      return res.status(400).json({
        message: "Invalid password",
      });
    }

    const hasAdmin = await User.exists({ role: "admin" });
    if (!hasAdmin) {
      user.role = "admin";
      user.permissions = adminPermissions;
      await user.save();
    }

    const token = jwt.sign(
      {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
      process.env.JWT_SECRET,
      { expiresIn: "1d" }
    );

    res.json({
      message: "Login success",
      token,
      user: {
        id: user._id,
        name: user.name,
        role: user.role,
        permissions: user.permissions,
      },
    });
  } catch (error) {
    res.status(500).json({
      message: error.message,
    });
  }
};
