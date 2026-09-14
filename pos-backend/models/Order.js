const mongoose = require("mongoose");

const orderItemSchema = new mongoose.Schema(
  {
    menu: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Menu",
      required: true,
    },
    quantity: {
      type: Number,
      default: 1,
      min: 1,
    },
    note: {
      type: String,
      default: "",
      trim: true,
    },
    customPrice: {
      type: Number,
      min: 0,
    },
  },
  { _id: false }
);

const historySchema = new mongoose.Schema(
  {
    action: String,
    user: String,
    detail: String,
    menuName: String,
    quantity: Number,
    beforeQuantity: Number,
    afterQuantity: Number,
    beforePrice: Number,
    afterPrice: Number,
    table: Number,
    fromTable: Number,
    toTable: Number,
    reason: String,
    time: String,
    createdAt: {
      type: Date,
      default: Date.now,
    },
  },
  { _id: false }
);

const orderSchema = new mongoose.Schema(
  {
    table: {
      type: Number,
      required: true,
    },
    items: [orderItemSchema],
    paid: {
      type: Boolean,
      default: false,
    },
    totalPrice: {
      type: Number,
      default: 0,
    },
    subtotal: {
      type: Number,
      default: 0,
    },
    discountPercent: {
      type: Number,
      default: 0,
    },
    discountAmount: {
      type: Number,
      default: 0,
    },
    cashReceived: {
      type: Number,
      default: 0,
    },
    changeAmount: {
      type: Number,
      default: 0,
    },
    paymentMethod: {
      type: String,
      enum: ["cash", "transfer", "qr", "card"],
      default: "cash",
    },
    status: {
      type: String,
      enum: [
        "pending",
        "preparing",
        "ready",
        "served",
        "paid",
        "cancelled",
      ],
      default: "pending",
    },
    paidAt: {
      type: Date,
    },
    history: [historySchema],
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("Order", orderSchema);
