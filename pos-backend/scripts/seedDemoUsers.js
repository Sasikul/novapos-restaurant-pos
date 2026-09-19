require("dotenv").config();

const bcrypt = require("bcrypt");
const mongoose = require("mongoose");
const User = require("../models/User");

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

const staffPermissions = {
  canManageKitchen: true,
};

const demoUsers = [
  {
    name: "Demo Admin",
    email: process.env.DEMO_ADMIN_EMAIL || "admin@novapos.demo",
    password: process.env.DEMO_ADMIN_PASSWORD || "Admin1234",
    role: "admin",
    permissions: adminPermissions,
  },
  {
    name: "Demo Staff",
    email: process.env.DEMO_STAFF_EMAIL || "staff@novapos.demo",
    password: process.env.DEMO_STAFF_PASSWORD || "Staff1234",
    role: "employee",
    permissions: staffPermissions,
  },
];

const seedDemoUsers = async () => {
  if (!process.env.MONGO_URI) {
    throw new Error("MONGO_URI is required");
  }

  await mongoose.connect(process.env.MONGO_URI);

  for (const demoUser of demoUsers) {
    const hashedPassword = await bcrypt.hash(demoUser.password, 10);
    await User.findOneAndUpdate(
      { email: demoUser.email },
      {
        name: demoUser.name,
        email: demoUser.email,
        password: hashedPassword,
        role: demoUser.role,
        permissions: demoUser.permissions,
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    console.log(`Demo user ready: ${demoUser.email}`);
  }

  await mongoose.disconnect();
};

seedDemoUsers()
  .then(() => {
    console.log("Demo users seeded successfully");
    process.exit(0);
  })
  .catch((error) => {
    console.error(error.message);
    process.exit(1);
  });
