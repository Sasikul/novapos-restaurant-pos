const Order = require("../models/Order");
const Menu = require("../models/Menu");

// 🧾 CREATE / UPDATE / DELETE ORDER
const createOrder = async (req, res) => {

  try {

    const { items, table } = req.body;

    // ❌ ไม่มีสินค้า = ลบ order
    if (items.length === 0) {

      await Order.findOneAndDelete({
        table,
        status: "pending",
      });

      return res.json({
        message: "Order deleted",
      });

    }

    // 🔥 คำนวณ totalPrice
    let totalPrice = 0;

    for (const item of items) {

      const menu = await Menu.findById(
        item.menu
      );

      if (menu) {

        totalPrice +=
          menu.price * item.quantity;

      }

    }

    // หา order เดิม
    let order = await Order.findOne({
      table,
      status: "pending",
    });

    // UPDATE
    if (order) {

      order.items = items;
      order.totalPrice = totalPrice;

      await order.save();

      return res.json(order);

    }

    // CREATE
    order = await Order.create({
      table,
      items,
      totalPrice,
      status: "pending",
    });

    res.json(order);

  } catch (error) {

    console.log(error);

    res.status(500).json({
      message: "Server Error",
    });

  }

};
// 📋 GET ALL ORDERS
const getOrders = async (req, res) => {

  try {

    const orders = await Order.find()
      .populate("items.menu");

    res.json(orders);

  } catch (error) {

    res.status(500).json({
      message: error.message,
    });

  }

};

// 🔍 GET ORDER BY TABLE
const getOrderByTable = async (req, res) => {

  try {

    const table = Number(req.params.table);

    const order = await Order.findOne({
      table,
      status: "pending",
    }).populate("items.menu");

    res.json(order || null);

  } catch (error) {

    res.status(500).json({
      message: error.message,
    });

  }

};

// 💰 PAY ORDER
const payOrder = async (req, res) => {

  try {

    const order = await Order.findById(
      req.params.id
    );

    if (!order) {

      return res.status(404).json({
        message: "Order not found",
      });

    }

    order.status = "paid";

    await order.save();

    res.json({
      message: "Order paid successfully",
      order,
    });

  } catch (error) {

    res.status(500).json({
      message: error.message,
    });

  }

};

// ❌ CANCEL ORDER
const cancelOrder = async (req, res) => {

  try {

    const order = await Order.findById(
      req.params.id
    );

    if (!order) {

      return res.status(404).json({
        message: "Order not found",
      });

    }

    await order.deleteOne();

    res.json({
      message: "Order cancelled successfully",
    });

  } catch (error) {

    res.status(500).json({
      message: error.message,
    });

  }

};

// 📊 DASHBOARD STATS
const getOrderStats = async (req, res) => {

  try {

    const totalOrders =
      await Order.countDocuments();

    const paidOrders =
      await Order.countDocuments({
        status: "paid",
      });

    const totalRevenue =
      await Order.aggregate([
        {
          $match: {
            status: "paid",
          },
        },
        {
          $group: {
            _id: null,
            total: {
              $sum: "$totalPrice",
            },
          },
        },
      ]);

    res.json({
      totalOrders,
      paidOrders,
      totalRevenue:
        totalRevenue.length > 0
          ? totalRevenue[0].total
          : 0,
    });

  } catch (error) {

    res.status(500).json({
      message: error.message,
    });

  }

};

// 🔥 TOP SELLING MENU
const getTopSellingMenu = async (
  req,
  res
) => {

  try {

    const topMenus =
      await Order.aggregate([
        {
          $match: {
            status: "paid",
          },
        },
        {
          $unwind: "$items",
        },
        {
          $group: {
            _id: "$items.menu",
            totalSold: {
              $sum: "$items.quantity",
            },
          },
        },
        {
          $sort: {
            totalSold: -1,
          },
        },
        {
          $limit: 5,
        },
        {
          $lookup: {
            from: "menus",
            localField: "_id",
            foreignField: "_id",
            as: "menuInfo",
          },
        },
        {
          $unwind: "$menuInfo",
        },
        {
          $project: {
            _id: 0,
            name: "$menuInfo.name",
            totalSold: 1,
          },
        },
      ]);

    res.json(topMenus);

  } catch (error) {

    res.status(500).json({
      message: error.message,
    });

  }

};

// 📅 DAILY REPORT
const getDailyReport = async (
  req,
  res
) => {

  try {

    const report =
      await Order.aggregate([
        {
          $match: {
            status: "paid",
          },
        },
        {
          $group: {
            _id: {
              $dateToString: {
                format: "%Y-%m-%d",
                date: "$createdAt",
              },
            },
            totalOrders: {
              $sum: 1,
            },
            totalRevenue: {
              $sum: "$totalPrice",
            },
          },
        },
        {
          $sort: {
            _id: -1,
          },
        },
      ]);

    res.json(report);

  } catch (error) {

    res.status(500).json({
      message: error.message,
    });

  }

};

module.exports = {
  createOrder,
  getOrders,
  getOrderByTable,
  payOrder,
  cancelOrder,
  getOrderStats,
  getTopSellingMenu,
  getDailyReport,
};