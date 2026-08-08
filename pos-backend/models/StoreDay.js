const mongoose = require("mongoose");

const storeDaySchema = new mongoose.Schema(
  {
    dateKey: {
      type: String,
      required: true,
      unique: true,
    },

    status: {
      type: String,
      enum: ["open", "closed"],
      default: "open",
    },

    openedAt: {
      type: Date,
      default: Date.now,
    },

    openedBy: {
      type: String,
      default: "Unknown",
    },

    closedAt: {
      type: Date,
    },

    closedBy: {
      type: String,
    },

    summary: {
      totalRevenue: {
        type: Number,
        default: 0,
      },
      paidOrders: {
        type: Number,
        default: 0,
      },
      cancelledOrders: {
        type: Number,
        default: 0,
      },
      totalItemsSold: {
        type: Number,
        default: 0,
      },
      averageOrderValue: {
        type: Number,
        default: 0,
      },
      topMenus: {
        type: Array,
        default: [],
      },
      hourlySales: {
        type: Array,
        default: [],
      },
      pendingTables: {
        type: Array,
        default: [],
      },
      payments: {
        cash: {
          type: Number,
          default: 0,
        },
        transfer: {
          type: Number,
          default: 0,
        },
        qr: {
          type: Number,
          default: 0,
        },
        card: {
          type: Number,
          default: 0,
        },
      },
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model(
  "StoreDay",
  storeDaySchema
);
