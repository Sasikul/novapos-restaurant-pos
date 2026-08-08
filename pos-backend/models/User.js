const mongoose = require("mongoose");

const userSchema =
  new mongoose.Schema(
    {

      name: {
        type: String,
        required: true,
      },

      email: {
        type: String,
        required: true,
        unique: true,
      },

      password: {
        type: String,
        required: true,
      },

      role: {
        type: String,
        enum: [
          "admin",
          "employee",
        ],
        default: "employee",
      },

      permissions: {

        canDeleteOrder: {
          type: Boolean,
          default: false,
        },

        canDeleteItem: {
          type: Boolean,
          default: false,
        },

        canDiscount: {
          type: Boolean,
          default: false,
        },

        canCancelOrder: {
          type: Boolean,
          default: false,
        },

        canEditMenu: {
          type: Boolean,
          default: false,
        },

        canViewDashboard: {
          type: Boolean,
          default: false,
        },

        canManageUsers: {
          type: Boolean,
          default: false,
        },

        canManageKitchen: {
          type: Boolean,
          default: false,
        },

        canCloseStore: {
          type: Boolean,
          default: false,
        },

        canExportReports: {
          type: Boolean,
          default: false,
        },

        canRefund: {
          type: Boolean,
          default: false,
        },

      },

    },
    {
      timestamps: true,
    }
  );

module.exports =
  mongoose.model(
    "User",
    userSchema
  );
