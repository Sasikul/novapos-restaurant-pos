const express = require("express");

const router = express.Router();

const {
  protect,
  adminOnly,
  allowPermission,
} = require("../middleware/authMiddleware");
const Order = require("../models/Order");
const Menu = require("../models/Menu");
const StoreDay = require("../models/StoreDay");

const ACTIVE_STATUSES = ["pending", "preparing", "ready", "served"];

const statusLabels = {
  pending: "รอส่งครัว",
  preparing: "กำลังทำ",
  ready: "พร้อมเสิร์ฟ",
  served: "เสิร์ฟแล้ว",
  paid: "ชำระเงินแล้ว",
  cancelled: "ยกเลิก",
};

const paymentLabels = {
  cash: "เงินสด",
  transfer: "โอน",
  qr: "QR",
  card: "บัตร",
};

const getActor = (req) =>
  req.user?.name ||
  req.user?.email ||
  req.user?.id ||
  "Unknown";

const getTimeText = () =>
  new Date().toLocaleString("th-TH", {
    timeZone: "Asia/Bangkok",
  });

const createHistory = ({
  action,
  user,
  detail,
  table,
  menuName,
  quantity,
  beforeQuantity,
  afterQuantity,
  fromTable,
  toTable,
  reason,
}) => ({
  action,
  user,
  detail,
  table,
  menuName,
  quantity,
  beforeQuantity,
  afterQuantity,
  fromTable,
  toTable,
  reason,
  time: getTimeText(),
  createdAt: new Date(),
});

const getMenuId = (item) => String(item.menu?._id || item.menu);

const normalizeItems = (items = []) =>
  items
    .filter((item) => item.menu)
    .map((item) => ({
      menu: item.menu,
      quantity: Number(item.quantity) || 0,
      note: String(item.note || "").trim(),
    }))
    .filter((item) => item.quantity > 0);

const loadMenuMap = async (items) => {
  const ids = [...new Set(items.map((item) => getMenuId(item)))];
  const menus = await Menu.find({
    _id: {
      $in: ids,
    },
  });

  return new Map(menus.map((menu) => [String(menu._id), menu]));
};

const getMenuName = (item, menuMap) =>
  item.menu?.name ||
  menuMap.get(getMenuId(item))?.name ||
  "ไม่พบเมนู";

const getMenuPrice = (item, menuMap) =>
  item.menu?.price ||
  menuMap.get(getMenuId(item))?.price ||
  0;

const calculateTotalPrice = (items, menuMap) =>
  items.reduce(
    (sum, item) => sum + getMenuPrice(item, menuMap) * item.quantity,
    0
  );

const getDateKey = (date = new Date()) => {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Bangkok",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  })
    .formatToParts(date)
    .reduce((result, part) => {
      result[part.type] = part.value;
      return result;
    }, {});

  return `${parts.year}-${parts.month}-${parts.day}`;
};

const getBangkokDayRange = (date = new Date()) => {
  const dateKey = getDateKey(date);
  const start = new Date(`${dateKey}T00:00:00.000+07:00`);
  const end = new Date(start);
  end.setDate(end.getDate() + 1);

  return { dateKey, start, end };
};

const getReportDayRange = (dateText) => {
  if (!dateText) return getBangkokDayRange();

  const selectedDate = new Date(`${dateText}T12:00:00.000+07:00`);
  if (Number.isNaN(selectedDate.getTime())) return getBangkokDayRange();

  return getBangkokDayRange(selectedDate);
};

const getActiveOrderForTable = (table) =>
  Order.findOne({
    table,
    status: {
      $in: ACTIVE_STATUSES,
    },
    items: {
      $exists: true,
      $ne: [],
    },
  }).populate("items.menu");

const buildItemChangeHistory = ({
  oldItems,
  newItems,
  menuMap,
  table,
  user,
  deletedItemId,
  deleteReason,
}) => {
  const history = [];
  const oldMap = new Map(oldItems.map((item) => [getMenuId(item), item]));
  const newMap = new Map(newItems.map((item) => [getMenuId(item), item]));

  newItems.forEach((item) => {
    const menuId = getMenuId(item);
    const oldItem = oldMap.get(menuId);
    const oldQty = oldItem?.quantity || 0;
    const newQty = item.quantity;
    const diff = newQty - oldQty;
    const oldNote = oldItem?.note || "";
    const newNote = item.note || "";
    const menuName = getMenuName(item, menuMap);

    if (diff > 0) {
      history.push(
        createHistory({
          action: "ADD_ITEM",
          user,
          table,
          menuName,
          quantity: diff,
          beforeQuantity: oldQty,
          afterQuantity: newQty,
          detail: `เพิ่ม ${menuName} จำนวน ${diff} รายการ`,
        })
      );
    }

    if (diff < 0) {
      history.push(
        createHistory({
          action: "REDUCE_ITEM",
          user,
          table,
          menuName,
          quantity: Math.abs(diff),
          beforeQuantity: oldQty,
          afterQuantity: newQty,
          detail: `ลด ${menuName} จำนวน ${Math.abs(diff)} รายการ`,
        })
      );
    }

    if (oldItem && oldNote !== newNote) {
      history.push(
        createHistory({
          action: "UPDATE_NOTE",
          user,
          table,
          menuName,
          detail: `แก้ไขหมายเหตุ ${menuName}: ${newNote || "-"}`,
        })
      );
    }
  });

  oldItems.forEach((item) => {
    const menuId = getMenuId(item);
    if (newMap.has(menuId)) return;

    const menuName = getMenuName(item, menuMap);
    const quantity = item.quantity || 0;

    history.push(
      createHistory({
        action: "DELETE_ITEM",
        user,
        table,
        menuName,
        quantity,
        beforeQuantity: quantity,
        afterQuantity: 0,
        reason: String(menuId) === String(deletedItemId) ? deleteReason : "",
        detail: `ลบ ${menuName} ออกจากออเดอร์ จำนวน ${quantity} รายการ`,
      })
    );
  });

  return history;
};

const summarizeOrders = async ({ start, end }) => {
  const paidOrders = await Order.find({
    status: "paid",
    paidAt: {
      $gte: start,
      $lt: end,
    },
  }).populate("items.menu");

  const cancelledOrders = await Order.countDocuments({
    status: "cancelled",
    updatedAt: {
      $gte: start,
      $lt: end,
    },
  });

  const pendingOrders = await Order.find({
    status: {
      $in: ACTIVE_STATUSES,
    },
  }).select("table totalPrice items status createdAt");

  const menuMap = new Map();
  const hourlyMap = new Map();
  const paymentMap = {
    cash: 0,
    transfer: 0,
    qr: 0,
    card: 0,
  };

  paidOrders.forEach((order) => {
    const paidAt = order.paidAt || order.updatedAt;
    const hour = new Intl.DateTimeFormat("en-US", {
      timeZone: "Asia/Bangkok",
      hour: "2-digit",
      hour12: false,
    }).format(paidAt);

    const hourly = hourlyMap.get(hour) || {
      hour,
      revenue: 0,
      orders: 0,
    };
    hourly.revenue += order.totalPrice || 0;
    hourly.orders += 1;
    hourlyMap.set(hour, hourly);

    paymentMap[order.paymentMethod || "cash"] += order.totalPrice || 0;

    order.items.forEach((item) => {
      const menuId = String(item.menu?._id || item.menu);
      const current = menuMap.get(menuId) || {
        id: menuId,
        name: item.menu?.name || "ไม่พบเมนู",
        quantity: 0,
        revenue: 0,
      };
      const quantity = item.quantity || 0;
      const price = item.menu?.price || 0;

      current.quantity += quantity;
      current.revenue += quantity * price;
      menuMap.set(menuId, current);
    });
  });

  const totalRevenue = paidOrders.reduce(
    (sum, order) => sum + (order.totalPrice || 0),
    0
  );
  const totalItemsSold = [...menuMap.values()].reduce(
    (sum, item) => sum + item.quantity,
    0
  );

  return {
    totalRevenue,
    paidOrders: paidOrders.length,
    cancelledOrders,
    totalItemsSold,
    averageOrderValue:
      paidOrders.length > 0
        ? Math.round(totalRevenue / paidOrders.length)
        : 0,
    payments: paymentMap,
    topMenus: [...menuMap.values()]
      .sort((a, b) => b.quantity - a.quantity)
      .slice(0, 10),
    hourlySales: [...hourlyMap.values()].sort(
      (a, b) => Number(a.hour) - Number(b.hour)
    ),
    pendingTables: pendingOrders.map((order) => ({
      table: order.table,
      status: order.status,
      totalPrice: order.totalPrice || 0,
      itemCount: order.items.length,
      openedAt: order.createdAt,
    })),
    recentPaidOrders: paidOrders
      .sort(
        (a, b) =>
          new Date(b.paidAt || b.updatedAt) -
          new Date(a.paidAt || a.updatedAt)
      )
      .slice(0, 8)
      .map((order) => ({
        id: order._id,
        table: order.table,
        totalPrice: order.totalPrice || 0,
        paidAt: order.paidAt,
        paymentMethod: order.paymentMethod,
      })),
  };
};

const csvEscape = (value) =>
  `"${String(value ?? "").replace(/"/g, '""')}"`;

router.get(
  "/dashboard",
  protect,
  allowPermission("canViewDashboard"),
  async (req, res) => {
    try {
      const { dateKey, start, end } = getReportDayRange(req.query.date);
      const storeDay = await StoreDay.findOne({ dateKey });
      const summary = await summarizeOrders({ start, end });
      const allPaidOrders = await Order.countDocuments({ status: "paid" });
      const allRevenue = await Order.aggregate([
        { $match: { status: "paid" } },
        { $group: { _id: null, total: { $sum: "$totalPrice" } } },
      ]);

      res.json({
        dateKey,
        storeDay,
        today: summary,
        lifetime: {
          paidOrders: allPaidOrders,
          totalRevenue: allRevenue[0]?.total || 0,
        },
      });
    } catch (error) {
      console.log(error);
      res.status(500).json({ message: "Server Error" });
    }
  }
);

router.get(
  "/export",
  protect,
  allowPermission("canExportReports"),
  async (req, res) => {
    try {
      const { dateKey, start, end } = getReportDayRange(req.query.date);
      const orders = await Order.find({
        status: "paid",
        paidAt: {
          $gte: start,
          $lt: end,
        },
      }).populate("items.menu");

      const lines = [
        [
          "date",
          "table",
          "paidAt",
          "paymentMethod",
          "subtotal",
          "discount",
          "total",
          "items",
        ].join(","),
        ...orders.map((order) =>
          [
            dateKey,
            order.table,
            order.paidAt?.toISOString() || "",
            paymentLabels[order.paymentMethod] || order.paymentMethod,
            order.subtotal,
            order.discountAmount,
            order.totalPrice,
            order.items
              .map(
                (item) =>
                  `${item.menu?.name || "Unknown"} x${item.quantity}${
                    item.note ? ` (${item.note})` : ""
                  }`
              )
              .join("; "),
          ]
            .map(csvEscape)
            .join(",")
        ),
      ];

      res.setHeader("Content-Type", "text/csv; charset=utf-8");
      res.setHeader(
        "Content-Disposition",
        `attachment; filename=pos-report-${dateKey}.csv`
      );
      res.send(`\uFEFF${lines.join("\n")}`);
    } catch (error) {
      console.log(error);
      res.status(500).json({ message: "Server Error" });
    }
  }
);

router.post(
  "/store-day/open",
  protect,
  allowPermission("canCloseStore"),
  async (req, res) => {
    try {
      const { dateKey } = getBangkokDayRange();
      let storeDay = await StoreDay.findOne({ dateKey });

      if (!storeDay) {
        storeDay = await StoreDay.create({
          dateKey,
          status: "open",
          openedAt: new Date(),
          openedBy: getActor(req),
        });
      } else {
        storeDay.status = "open";
        storeDay.openedAt = storeDay.openedAt || new Date();
        storeDay.openedBy = storeDay.openedBy || getActor(req);
        storeDay.closedAt = undefined;
        storeDay.closedBy = undefined;
        await storeDay.save();
      }

      res.json(storeDay);
    } catch (error) {
      console.log(error);
      res.status(500).json({ message: "Server Error" });
    }
  }
);

router.post(
  "/store-day/close",
  protect,
  allowPermission("canCloseStore"),
  async (req, res) => {
    try {
      const { dateKey, start, end } = getBangkokDayRange();
      const summary = await summarizeOrders({ start, end });

      if (summary.pendingTables.length > 0) {
        return res.status(400).json({
          message: "ยังปิดรอบขายไม่ได้ เพราะมีโต๊ะค้างชำระ",
          pendingTables: summary.pendingTables,
        });
      }

      let storeDay = await StoreDay.findOne({ dateKey });
      if (!storeDay) {
        storeDay = new StoreDay({
          dateKey,
          openedAt: start,
          openedBy: "System",
        });
      }

      storeDay.status = "closed";
      storeDay.closedAt = new Date();
      storeDay.closedBy = getActor(req);
      storeDay.summary = summary;

      await storeDay.save();

      res.json({ storeDay, summary });
    } catch (error) {
      console.log(error);
      res.status(500).json({ message: "Server Error" });
    }
  }
);

router.get(
  "/kitchen",
  protect,
  allowPermission("canManageKitchen"),
  async (req, res) => {
    try {
      const station = String(req.query.station || "").trim();
      const orders = await Order.find({
        status: {
          $in: ["pending", "preparing", "ready"],
        },
      })
        .populate("items.menu")
        .sort({ createdAt: 1 });

      if (!station || station === "ทั้งหมด") {
        return res.json(orders);
      }

      const stationOrders = orders
        .map((order) => {
          const data = order.toObject();
          data.items = data.items.filter(
            (item) => item.menu?.station === station
          );
          return data;
        })
        .filter((order) => order.items.length > 0);

      res.json(stationOrders);
    } catch (error) {
      console.log(error);
      res.status(500).json({ message: "Server Error" });
    }
  }
);

router.get("/", protect, async (req, res) => {
  try {
    const orders = await Order.find().populate("items.menu");
    res.json(orders);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.post("/", protect, async (req, res) => {
  try {
    const table = Number(req.body.table);
    const user = getActor(req);
    const items = normalizeItems(req.body.items);
    const deletedItemId = req.body.deletedItemId;
    const deleteReason = req.body.reason;

    let order = await getActiveOrderForTable(table);

    if (items.length === 0) {
      if (!order) {
        return res.json({ message: "Order already empty" });
      }

      order.history.push(
        createHistory({
          action: "DELETE_ORDER",
          user,
          table,
          detail: `ลบออเดอร์ของโต๊ะ ${table}`,
        })
      );
      order.items = [];
      order.totalPrice = 0;
      order.subtotal = 0;
      order.status = "cancelled";
      await order.save();

      return res.json({ message: "Order deleted", order });
    }

    const menuMap = await loadMenuMap(items);
    const totalPrice = calculateTotalPrice(items, menuMap);

    if (order) {
      const changes = buildItemChangeHistory({
        oldItems: order.items,
        newItems: items,
        menuMap,
        table,
        user,
        deletedItemId,
        deleteReason,
      });

      if (changes.length === 0) {
        changes.push(
          createHistory({
            action: "UPDATE_ORDER",
            user,
            table,
            detail: `บันทึกออเดอร์โต๊ะ ${table}`,
          })
        );
      }

      order.items = items;
      order.totalPrice = totalPrice;
      order.subtotal = totalPrice;
      if (order.status === "served") order.status = "pending";
      order.history.push(...changes);

      await order.save();
      await order.populate("items.menu");
      return res.json(order);
    }

    const itemHistory = items.map((item) => {
      const menuName = getMenuName(item, menuMap);
      return createHistory({
        action: "ADD_ITEM",
        user,
        table,
        menuName,
        quantity: item.quantity,
        beforeQuantity: 0,
        afterQuantity: item.quantity,
        detail: `เพิ่ม ${menuName} จำนวน ${item.quantity} รายการ${
          item.note ? ` (${item.note})` : ""
        }`,
      });
    });

    order = await Order.create({
      table,
      items,
      totalPrice,
      subtotal: totalPrice,
      status: "pending",
      history: [
        createHistory({
          action: "CREATE_ORDER",
          user,
          table,
          detail: `เปิดออเดอร์โต๊ะ ${table}`,
        }),
        ...itemHistory,
      ],
    });

    await order.populate("items.menu");
    res.json(order);
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: error.message });
  }
});

router.get("/table/:table", protect, async (req, res) => {
  try {
    const order = await getActiveOrderForTable(Number(req.params.table));
    res.json(order || null);
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: "Server Error" });
  }
});

router.get("/table/:table/history", protect, async (req, res) => {
  try {
    const table = Number(req.params.table);
    const orders = await Order.find({
      $or: [
        { table },
        { "history.table": table },
        { "history.fromTable": table },
        { "history.toTable": table },
      ],
    });

    const history = orders
      .flatMap((order) =>
        (order.history || []).map((item) => ({
          ...item.toObject(),
          orderId: order._id,
        }))
      )
      .filter(
        (item) =>
          item.table === table ||
          item.fromTable === table ||
          item.toTable === table
      )
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    res.json(history);
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: "Server Error" });
  }
});

router.put("/:id/status", protect, async (req, res) => {
  try {
    const nextStatus = req.body.status;
    if (!ACTIVE_STATUSES.includes(nextStatus)) {
      return res.status(400).json({ message: "Invalid status" });
    }

    const order = await Order.findById(req.params.id).populate("items.menu");
    if (!order) {
      return res.status(404).json({ message: "Order not found" });
    }

    order.status = nextStatus;
    order.history.push(
      createHistory({
        action: "UPDATE_STATUS",
        user: getActor(req),
        table: order.table,
        detail: `เปลี่ยนสถานะเป็น ${statusLabels[nextStatus]}`,
      })
    );

    await order.save();
    res.json(order);
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: "Server Error" });
  }
});

router.put("/:id/move", protect, async (req, res) => {
  try {
    const targetTable = Number(req.body.targetTable);
    if (!targetTable) {
      return res.status(400).json({ message: "กรุณาระบุโต๊ะปลายทาง" });
    }

    const targetOrder = await getActiveOrderForTable(targetTable);
    if (targetOrder) {
      return res.status(400).json({
        message: "โต๊ะปลายทางมีออเดอร์อยู่แล้ว กรุณาเลือกโต๊ะว่าง",
      });
    }

    const order = await Order.findById(req.params.id).populate("items.menu");
    if (!order) {
      return res.status(404).json({ message: "Order not found" });
    }

    const oldTable = order.table;
    order.table = targetTable;
    order.history.push(
      createHistory({
        action: "MOVE_TABLE",
        user: getActor(req),
        table: targetTable,
        fromTable: oldTable,
        toTable: targetTable,
        detail: `ย้ายโต๊ะ ${oldTable} ไปโต๊ะ ${targetTable}`,
      })
    );

    await order.save();
    await order.populate("items.menu");
    res.json(order);
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: "Server Error" });
  }
});

router.put("/:id/delete-item", protect, async (req, res) => {
  try {
    const { itemId, reason } = req.body;
    const order = await Order.findById(req.params.id).populate("items.menu");
    if (!order) {
      return res.status(404).json({ message: "Order not found" });
    }

    const deletedItem = order.items.find(
      (item) => String(item.menu?._id) === String(itemId)
    );
    if (!deletedItem) {
      return res.status(404).json({ message: "Item not found" });
    }

    const menuName = deletedItem.menu?.name || "ไม่พบเมนู";
    const quantity = deletedItem.quantity || 0;
    order.items = order.items.filter(
      (item) => String(item.menu?._id) !== String(itemId)
    );
    order.history.push(
      createHistory({
        action: "DELETE_ITEM",
        user: getActor(req),
        table: order.table,
        menuName,
        quantity,
        beforeQuantity: quantity,
        afterQuantity: 0,
        reason,
        detail: `ลบ ${menuName} ออกจากออเดอร์ จำนวน ${quantity} รายการ`,
      })
    );

    if (order.items.length === 0) {
      order.status = "cancelled";
      order.totalPrice = 0;
      order.subtotal = 0;
      order.history.push(
        createHistory({
          action: "DELETE_ORDER",
          user: getActor(req),
          table: order.table,
          detail: `ลบออเดอร์ของโต๊ะ ${order.table}`,
        })
      );
      await order.save();
      return res.json({ success: true, empty: true, order });
    }

    const menuMap = await loadMenuMap(order.items);
    order.totalPrice = calculateTotalPrice(order.items, menuMap);
    order.subtotal = order.totalPrice;

    await order.save();
    await order.populate("items.menu");
    res.json(order);
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: "Server Error" });
  }
});

router.put("/:id/pay", protect, async (req, res) => {
  try {
    const discountPercent = Math.max(
      0,
      Math.min(100, Number(req.body.discountPercent) || 0)
    );
    const cashReceived = Number(req.body.cashReceived) || 0;
    const paymentMethod = ["cash", "transfer", "qr", "card"].includes(
      req.body.paymentMethod
    )
      ? req.body.paymentMethod
      : "cash";
    const order = await Order.findById(req.params.id).populate("items.menu");

    if (!order) {
      return res.status(404).json({ message: "Order not found" });
    }

    if (order.status === "paid" || order.paid) {
      return res.status(400).json({
        message: "บิลนี้ชำระเงินแล้ว",
      });
    }

    if (order.status === "cancelled") {
      return res.status(400).json({
        message: "บิลนี้ถูกยกเลิกแล้ว",
      });
    }

    const menuMap = await loadMenuMap(order.items);
    const subtotal = calculateTotalPrice(order.items, menuMap);
    const discountAmount = Math.round((subtotal * discountPercent) / 100);
    const netTotal = subtotal - discountAmount;

    if (paymentMethod === "cash" && cashReceived < netTotal) {
      return res.status(400).json({
        message: "เงินรับไม่พอสำหรับชำระบิล",
      });
    }

    order.status = "paid";
    order.paid = true;
    order.paidAt = new Date();
    order.subtotal = subtotal;
    order.discountPercent = discountPercent;
    order.discountAmount = discountAmount;
    order.totalPrice = netTotal;
    order.cashReceived = paymentMethod === "cash" ? cashReceived : netTotal;
    order.changeAmount =
      paymentMethod === "cash" ? cashReceived - netTotal : 0;
    order.paymentMethod = paymentMethod;
    order.history.push(
      createHistory({
        action: "PAY_ORDER",
        user: getActor(req),
        table: order.table,
        detail: `ชำระเงินโต๊ะ ${order.table} ด้วย ${
          paymentLabels[paymentMethod]
        } ยอดสุทธิ ${netTotal} บาท`,
      })
    );

    await order.save();
    await order.populate("items.menu");

    res.json({ message: "ชำระเงินสำเร็จ", order });
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: "Server Error" });
  }
});

router.delete(
  "/:id",
  protect,
  allowPermission("canCancelOrder"),
  async (req, res) => {
    try {
      const order = await Order.findById(req.params.id);
      if (!order) {
        return res.status(404).json({ message: "Order not found" });
      }

      if (order.status === "paid" || order.paid) {
        return res.status(400).json({
          message: "ยกเลิกบิลที่ชำระเงินแล้วไม่ได้",
        });
      }

      if (order.status === "cancelled") {
        return res.status(400).json({
          message: "บิลนี้ถูกยกเลิกแล้ว",
        });
      }

      order.status = "cancelled";
      order.history.push(
        createHistory({
          action: "CANCEL_ORDER",
          user: getActor(req),
          table: order.table,
          reason: req.body?.reason || "",
          detail: `ยกเลิกออเดอร์โต๊ะ ${order.table}`,
        })
      );
      await order.save();

      res.json({ message: "Order cancelled successfully", order });
    } catch (error) {
      console.log(error);
      res.status(500).json({ message: "Server Error" });
    }
  }
);

router.get("/stats", protect, adminOnly, async (req, res) => {
  try {
    const totalOrders = await Order.countDocuments();
    const paidOrders = await Order.countDocuments({ status: "paid" });
    const totalRevenue = await Order.aggregate([
      { $match: { status: "paid" } },
      { $group: { _id: null, total: { $sum: "$totalPrice" } } },
    ]);

    res.json({
      totalOrders,
      paidOrders,
      totalRevenue: totalRevenue[0]?.total || 0,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
