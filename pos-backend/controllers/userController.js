const User = require("../models/User");

const getUsers = async (req, res) => {
  try {
    const users = await User.find().select("-password");

    res.json(users);
  } catch (error) {
    console.log(error);

    res.status(500).json({
      message: "Server Error",
    });
  }
};

const updatePermissions = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);

    if (!user) {
      return res.status(404).json({
        message: "User not found",
      });
    }

    if (req.body.role && ["admin", "employee"].includes(req.body.role)) {
      user.role = req.body.role;
    }

    user.permissions = {
      ...(user.permissions?.toObject?.() || user.permissions || {}),
      ...(req.body.permissions || {}),
    };

    await user.save();

    res.json({
      message: "Updated",
      user,
    });
  } catch (error) {
    console.log(error);

    res.status(500).json({
      message: "Server Error",
    });
  }
};

module.exports = {
  getUsers,
  updatePermissions,
};
