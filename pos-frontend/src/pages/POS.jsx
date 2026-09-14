import { useCallback, useEffect, useMemo, useState } from "react";
import axios from "axios";
import MenuCard from "../components/MenuCard";
import API_BASE_URL from "../config/api";

const statusText = {
  pending: "รอส่งครัว",
  preparing: "กำลังทำ",
  ready: "พร้อมเสิร์ฟ",
  served: "เสิร์ฟแล้ว",
};

const paymentOptions = [
  ["cash", "เงินสด"],
  ["transfer", "โอน"],
  ["qr", "QR"],
  ["card", "บัตร"],
];

const money = (value) => Number(value || 0).toLocaleString();

const escapeHtml = (value) =>
  String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");

export default function POS({ token, table, goBack }) {
  const role = localStorage.getItem("role");
  const permissions = JSON.parse(localStorage.getItem("permissions") || "{}");
  const user = localStorage.getItem("name") || "Unknown";

  const [menu, setMenu] = useState([]);
  const [cart, setCart] = useState([]);
  const [order, setOrder] = useState(null);
  const [cash, setCash] = useState(0);
  const [discount, setDiscount] = useState(0);
  const [paymentMethod, setPaymentMethod] = useState("cash");
  const [targetTable, setTargetTable] = useState("");
  const [history, setHistory] = useState([]);
  const [showHistory, setShowHistory] = useState(false);
  const [receipt, setReceipt] = useState(null);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("ทั้งหมด");

  const getToken = useCallback(
    () => token || localStorage.getItem("token"),
    [token]
  );

  const authHeaders = useCallback(
    () => ({
      headers: {
        Authorization: `Bearer ${getToken()}`,
      },
    }),
    [getToken]
  );

  const handleAuthExpired = useCallback((error) => {
    if (error.response?.status !== 401) return false;

    localStorage.removeItem("token");
    localStorage.removeItem("role");
    localStorage.removeItem("name");
    localStorage.removeItem("permissions");
    window.location.assign(window.location.origin);
    return true;
  }, []);

  const subtotal = cart.reduce(
    (sum, item) => sum + Number(item.price || 0) * item.qty,
    0
  );
  const discountAmount = Math.round((subtotal * discount) / 100);
  const total = subtotal - discountAmount;
  const change = paymentMethod === "cash" ? Number(cash || 0) - total : 0;
  const orderId = order?._id;

  const categories = useMemo(
    () => [
      "ทั้งหมด",
      ...new Set(menu.map((item) => item.category).filter(Boolean)),
    ],
    [menu]
  );

  const filteredMenu = useMemo(() => {
    const keyword = search.trim().toLowerCase();

    return menu.filter((item) => {
      const matchCategory = category === "ทั้งหมด" || item.category === category;
      const matchKeyword =
        !keyword ||
        item.name?.toLowerCase().includes(keyword) ||
        item.category?.toLowerCase().includes(keyword);

      return matchCategory && matchKeyword;
    });
  }, [menu, search, category]);

  const loadMenu = useCallback(async () => {
    const res = await axios.get(`${API_BASE_URL}/api/menu`);
    setMenu(res.data);
  }, []);

  const loadTableHistory = useCallback(async () => {
    if (!table) return;

    try {
      const res = await axios.get(
        `${API_BASE_URL}/api/orders/table/${table}/history`,
        authHeaders()
      );
      setHistory(res.data || []);
    } catch (error) {
      if (!handleAuthExpired(error)) console.log(error);
    }
  }, [table, authHeaders, handleAuthExpired]);

  const loadOrder = useCallback(async () => {
    if (!table) return;

    try {
      const res = await axios.get(
        `${API_BASE_URL}/api/orders/table/${table}`,
        authHeaders()
      );

      if (res.data) {
        setOrder(res.data);
        setCart(
          res.data.items.map((item) => ({
            _id: item.menu?._id,
            name: item.menu?.name,
            price: item.menu?.price,
            category: item.menu?.category,
            qty: item.quantity,
            note: item.note || "",
          }))
        );
        setHistory(res.data.history || []);
      } else {
        setOrder(null);
        setCart([]);
        setHistory([]);
      }
    } catch (error) {
      if (!handleAuthExpired(error)) console.log(error);
    }
  }, [table, authHeaders, handleAuthExpired]);

  useEffect(() => {
    loadMenu();
  }, [loadMenu]);

  useEffect(() => {
    loadOrder();
    loadTableHistory();
  }, [loadOrder, loadTableHistory]);

  const addItem = (item) => {
    if (item.available === false) return;

    setCart((current) => {
      const found = current.find((cartItem) => cartItem._id === item._id);
      if (found) {
        return current.map((cartItem) =>
          cartItem._id === item._id
            ? { ...cartItem, qty: cartItem.qty + 1 }
            : cartItem
        );
      }

      return [...current, { ...item, qty: 1, note: "" }];
    });
  };

  const removeItem = (item) => {
    setCart((current) =>
      current
        .map((cartItem) =>
          cartItem._id === item._id
            ? { ...cartItem, qty: cartItem.qty - 1 }
            : cartItem
        )
        .filter((cartItem) => cartItem.qty > 0)
    );
  };

  const updateItemNote = (id) => {
    const item = cart.find((cartItem) => cartItem._id === id);
    if (!item) return;

    const note = window.prompt(
      "หมายเหตุ เช่น เผ็ดน้อย ไม่ใส่ผัก แยกน้ำจิ้ม",
      item.note || ""
    );
    if (note === null) return;

    setCart((current) =>
      current.map((cartItem) =>
        cartItem._id === id ? { ...cartItem, note: note.trim() } : cartItem
      )
    );
  };

  const buildItemsPayload = (items = cart) =>
    items.map((item) => ({
      menu: item._id,
      quantity: item.qty,
      note: item.note || "",
    }));

  const saveOrder = async (items = cart, options = {}) => {
    try {
      const res = await axios.post(
      `${API_BASE_URL}/api/orders`,
      {
        items: buildItemsPayload(items),
        table,
        deletedItemId: options.deletedItemId,
        reason: options.reason,
      },
        authHeaders()
      );

    if (!options.silent) alert("บันทึกออเดอร์แล้ว");
    setOrder(res.data);
    setHistory(res.data.history || []);
    loadTableHistory();
      return res.data;
    } catch (error) {
      if (!handleAuthExpired(error)) {
        alert(error.response?.data?.message || "บันทึกออเดอร์ไม่สำเร็จ");
      }
      return null;
    }
  };

  const deleteItem = async (id) => {
    const reason = window.prompt("ระบุเหตุผลที่ลบรายการนี้");
    if (reason === null) return;

    const updatedCart = cart.filter((item) => item._id !== id);
    setCart(updatedCart);

    if (!orderId) return;

    try {
      if (updatedCart.length === 0) {
        const res = await axios.put(
          `${API_BASE_URL}/api/orders/${orderId}/delete-item`,
          { itemId: id, reason },
          authHeaders()
        );
        setOrder(res.data.order || null);
        setHistory(res.data.order?.history || []);
        return;
      }

      const res = await saveOrder(updatedCart, {
        deletedItemId: id,
        reason,
        silent: true,
      });
      setOrder(res);
    } catch (error) {
      alert(error.response?.data?.message || "ลบรายการไม่สำเร็จ");
      loadOrder();
    }
  };

  const getCartSnapshot = (items = cart) =>
    JSON.stringify(
      items
        .map((item) => ({
          id: item._id,
          qty: item.qty,
          note: item.note || "",
        }))
        .sort((a, b) => String(a.id).localeCompare(String(b.id)))
    );

  const getOrderSnapshot = () =>
    JSON.stringify(
      (order?.items || [])
        .map((item) => ({
          id: String(item.menu?._id || item.menu),
          qty: item.quantity,
          note: item.note || "",
        }))
        .sort((a, b) => String(a.id).localeCompare(String(b.id)))
    );

  const hasUnsavedChanges =
    cart.length > 0 && getCartSnapshot() !== getOrderSnapshot();

  const handleBack = () => {
    if (
      hasUnsavedChanges &&
      !window.confirm("มีรายการที่ยังไม่ได้บันทึก ต้องการออกจากหน้านี้ใช่ไหม?")
    ) {
      return;
    }

    goBack();
  };

  const updateStatus = async (status) => {
    if (!orderId) {
      alert("ยังไม่มีออเดอร์");
      return;
    }

    try {
      const res = await axios.put(
        `${API_BASE_URL}/api/orders/${orderId}/status`,
        { status },
        authHeaders()
      );
      setOrder(res.data);
      setHistory(res.data.history || []);
    } catch (error) {
      if (!handleAuthExpired(error)) {
        alert(error.response?.data?.message || "อัปเดตสถานะไม่สำเร็จ");
      }
    }
  };

  const moveTable = async () => {
    if (!orderId) {
      alert("ยังไม่มีออเดอร์ให้ย้าย");
      return;
    }
    if (!targetTable) {
      alert("กรุณาระบุโต๊ะปลายทาง");
      return;
    }

    try {
      await axios.put(
      `${API_BASE_URL}/api/orders/${orderId}/move`,
      { targetTable },
        authHeaders()
      );
    alert(`ย้ายไปโต๊ะ ${targetTable} แล้ว`);
      goBack();
    } catch (error) {
      if (!handleAuthExpired(error)) {
        alert(error.response?.data?.message || "ย้ายโต๊ะไม่สำเร็จ");
      }
    }
  };

  const cancelOrder = async () => {
    if (!orderId) {
      alert("ยังไม่มีบิลให้ยกเลิก");
      return;
    }

    const reason = window.prompt("ระบุเหตุผลในการยกเลิกบิล");
    if (reason === null) return;

    if (!window.confirm("ยืนยันยกเลิกบิลนี้ใช่ไหม?")) return;

    try {
      await axios.delete(`${API_BASE_URL}/api/orders/${orderId}`, {
        ...authHeaders(),
        data: { reason },
      });

    alert("ยกเลิกบิลแล้ว");
      goBack();
    } catch (error) {
      if (!handleAuthExpired(error)) {
        alert(error.response?.data?.message || "ยกเลิกบิลไม่สำเร็จ");
      }
    }
  };

  const printKitchenTicket = () => {
    const rows = cart
      .map(
        (item) => `
          <tr>
            <td>${escapeHtml(item.name)}</td>
            <td class="right">${item.qty}</td>
          </tr>
          ${
            item.note
              ? `<tr><td colspan="2" class="note">หมายเหตุ: ${escapeHtml(
                  item.note
                )}</td></tr>`
              : ""
          }
        `
      )
      .join("");

    const win = window.open("", "kitchen-ticket", "width=420,height=640");
    if (!win) return;

    win.document.write(`
      <html>
        <head>
          <title>ใบส่งครัว</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 16px; color: #111; }
            h1 { margin: 0; text-align: center; font-size: 24px; }
            .center { text-align: center; }
            .muted { color: #555; font-size: 12px; }
            table { width: 100%; margin-top: 16px; border-collapse: collapse; }
            td { border-bottom: 1px solid #ddd; padding: 8px 0; font-size: 16px; }
            .right { text-align: right; font-weight: 700; }
            .note { color: #92400e; font-size: 13px; padding-top: 2px; }
            @media print { button { display: none; } }
          </style>
        </head>
        <body>
          <h1>ใบส่งครัว</h1>
          <p class="center">โต๊ะ ${table}</p>
          <p class="center muted">${new Date().toLocaleString("th-TH")}</p>
          <p class="center muted">พนักงาน: ${escapeHtml(user)}</p>
          <table>${rows}</table>
          <button onclick="window.print()">พิมพ์</button>
        </body>
      </html>
    `);
    win.document.close();
    win.focus();
    win.print();
  };

  const printReceipt = (receiptData = receipt) => {
    if (!receiptData) return;

    const rows = receiptData.items
      .map(
        (item) => `
          <tr>
            <td>
              ${escapeHtml(item.name)}
              ${
                item.note
                  ? `<div class="muted">หมายเหตุ: ${escapeHtml(item.note)}</div>`
                  : ""
              }
            </td>
            <td class="right">${item.qty}</td>
            <td class="right">${money(item.price)}</td>
            <td class="right">${money(item.price * item.qty)}</td>
          </tr>
        `
      )
      .join("");

    const win = window.open("", "receipt", "width=420,height=700");
    if (!win) return;

    win.document.write(`
      <html>
        <head>
          <title>ใบเสร็จ</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 16px; color: #111; }
            h1 { font-size: 22px; margin: 0 0 4px; text-align: center; }
            .center { text-align: center; }
            .muted { color: #555; font-size: 12px; }
            table { width: 100%; border-collapse: collapse; margin-top: 14px; }
            th, td { border-bottom: 1px solid #ddd; padding: 7px 0; font-size: 13px; }
            th { text-align: left; }
            .right { text-align: right; }
            .summary { margin-top: 12px; }
            .summary div { display: flex; justify-content: space-between; padding: 4px 0; }
            .total { font-size: 18px; font-weight: 700; }
            @media print { button { display: none; } }
          </style>
        </head>
        <body>
          <h1>ใบเสร็จรับเงิน</h1>
          <p class="center muted">โต๊ะ ${receiptData.table}</p>
          <p class="center muted">${receiptData.time}</p>
          <p class="center muted">พนักงาน: ${escapeHtml(receiptData.user)}</p>
          <table>
            <thead>
              <tr>
                <th>รายการ</th>
                <th class="right">จำนวน</th>
                <th class="right">ราคา</th>
                <th class="right">รวม</th>
              </tr>
            </thead>
            <tbody>${rows}</tbody>
          </table>
          <div class="summary">
            <div><span>รวมก่อนลด</span><strong>${money(
              receiptData.subtotal
            )} บาท</strong></div>
            <div><span>ส่วนลด</span><strong>${receiptData.discount}%</strong></div>
            <div class="total"><span>รวมสุทธิ</span><span>${money(
              receiptData.total
            )} บาท</span></div>
            <div><span>ช่องทางชำระ</span><strong>${
              receiptData.paymentLabel
            }</strong></div>
            <div><span>รับเงิน</span><strong>${money(
              receiptData.cash
            )} บาท</strong></div>
            <div><span>เงินทอน</span><strong>${money(
              receiptData.change
            )} บาท</strong></div>
          </div>
          <p class="center muted">ขอบคุณที่ใช้บริการ</p>
          <button onclick="window.print()">พิมพ์ใบเสร็จ</button>
        </body>
      </html>
    `);
    win.document.close();
    win.focus();
    win.print();
  };

  const payOrder = async () => {
    if (!orderId) {
      alert("กรุณาบันทึกออเดอร์ก่อนชำระเงิน");
      return;
    }

    let res;

    try {
      res = await axios.put(
        `${API_BASE_URL}/api/orders/${orderId}/pay`,
        {
          discountPercent: discount,
          cashReceived: paymentMethod === "cash" ? Number(cash) : total,
          paymentMethod,
        },
        authHeaders()
      );
    } catch (error) {
      if (!handleAuthExpired(error)) {
        alert(error.response?.data?.message || "ชำระเงินไม่สำเร็จ");
      }
      return;
    }

    const paidOrder = res.data.order;
    const paymentLabel =
      paymentOptions.find(([value]) => value === paymentMethod)?.[1] || "";
    const receiptData = {
      table,
      user,
      items: cart,
      subtotal,
      discount,
      total,
      cash: paymentMethod === "cash" ? Number(cash) : total,
      change: paymentMethod === "cash" ? Math.max(change, 0) : 0,
      paymentLabel,
      time: new Date().toLocaleString("th-TH"),
    };

    setReceipt(receiptData);
    setOrder(paidOrder);
    setCart([]);
    printReceipt(receiptData);
  };

  const canDiscount = role === "admin" || permissions.canDiscount;
  const canDeleteItem = role === "admin" || permissions.canDeleteItem;
  const canCancelOrder = role === "admin" || permissions.canCancelOrder;
  const canPay =
    cart.length > 0 &&
    orderId &&
    (paymentMethod !== "cash" || Number(cash || 0) >= total);

  return (
    <main className="grid min-h-[calc(100vh-65px)] grid-cols-1 lg:grid-cols-[1fr_430px]">
      <section className="p-4 lg:p-6">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-3xl font-bold">โต๊ะ {table}</h1>
            <p className="mt-1 text-slate-500">
              สถานะ:{" "}
              {order ? statusText[order.status] || order.status : "ยังไม่มีออเดอร์"}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => {
                setShowHistory(true);
                loadTableHistory();
              }}
              className="rounded-md border border-slate-300 px-4 py-2 font-semibold"
            >
              ประวัติ
            </button>
            <button
              onClick={handleBack}
              className="rounded-md bg-teal-700 px-4 py-2 font-semibold text-white shadow-sm hover:bg-teal-800"
            >
              กลับหน้าโต๊ะ
            </button>
          </div>
        </div>

        <div className="mb-4 grid gap-3 md:grid-cols-[1fr_auto]">
          <input
            type="search"
            placeholder="ค้นหาเมนู"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            className="rounded-md border border-slate-300 p-3"
          />
          <select
            value={category}
            onChange={(event) => setCategory(event.target.value)}
            className="rounded-md border border-slate-300 p-3"
          >
            {categories.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {filteredMenu.map((item) => (
            <MenuCard key={item._id} item={item} onAdd={addItem} />
          ))}
        </div>
      </section>

      <aside className="border-l border-emerald-100 bg-white/95 p-4 shadow-lg lg:p-6">
        <h2 className="text-2xl font-bold">รายการอาหาร</h2>

        <div className="mt-4 max-h-[42vh] space-y-3 overflow-y-auto pr-1">
          {cart.length === 0 && (
            <p className="rounded-md border border-dashed border-slate-300 p-6 text-center text-slate-500">
              ยังไม่มีรายการ
            </p>
          )}

          {cart.map((item) => (
            <div
              key={item._id}
              className="rounded-lg border border-emerald-100 bg-white p-3 shadow-sm"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-bold">{item.name}</p>
                  <p className="text-sm text-slate-500">
                    {money(item.price)} บาท
                  </p>
                  {item.note && (
                    <p className="mt-1 rounded-md bg-amber-50 px-2 py-1 text-xs font-semibold text-amber-800">
                      หมายเหตุ: {item.note}
                    </p>
                  )}
                </div>
                <p className="font-bold">{money(item.price * item.qty)} บาท</p>
              </div>

              <div className="mt-3 flex flex-wrap items-center gap-2">
                <button
                  onClick={() => removeItem(item)}
                  className="h-9 w-9 rounded-md bg-rose-600 font-bold text-white"
                >
                  -
                </button>
                <span className="w-8 text-center font-bold">{item.qty}</span>
                <button
                  onClick={() => addItem(item)}
                  className="h-9 w-9 rounded-md bg-emerald-600 font-bold text-white"
                >
                  +
                </button>
                <button
                  onClick={() => updateItemNote(item._id)}
                  className="rounded-md bg-amber-500 px-3 py-2 text-sm font-bold text-white"
                >
                  หมายเหตุ
                </button>
                {canDeleteItem && (
                  <button
                    onClick={() => deleteItem(item._id)}
                    className="rounded-md bg-slate-900 px-3 py-2 text-sm font-bold text-white"
                  >
                    ลบ
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>

        <div className="mt-4 space-y-3 border-t border-slate-200 pt-4">
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => saveOrder()}
              disabled={cart.length === 0}
              className="rounded-md bg-teal-700 py-3 font-bold text-white shadow-sm hover:bg-teal-800 disabled:bg-slate-300"
            >
              บันทึกออเดอร์
            </button>
            <button
              onClick={() => {
                saveOrder(cart, { silent: true }).then(printKitchenTicket);
              }}
              disabled={cart.length === 0}
              className="rounded-md bg-amber-600 py-3 font-bold text-white shadow-sm hover:bg-amber-700 disabled:bg-slate-300"
            >
              ใบครัว
            </button>
          </div>

          {orderId && (
            <div className="grid grid-cols-3 gap-2">
              <button
                onClick={() => updateStatus("preparing")}
                className="rounded-md border border-amber-200 py-2 text-sm font-bold text-amber-800"
              >
                กำลังทำ
              </button>
              <button
                onClick={() => updateStatus("ready")}
                className="rounded-md border border-emerald-200 py-2 text-sm font-bold text-emerald-800"
              >
                พร้อมเสิร์ฟ
              </button>
              <button
                onClick={() => updateStatus("served")}
                className="rounded-md border border-slate-300 py-2 text-sm font-bold text-slate-700"
              >
                เสิร์ฟแล้ว
              </button>
            </div>
          )}

          {orderId && canCancelOrder && (
            <button
              onClick={cancelOrder}
              className="w-full rounded-md border border-rose-200 py-3 font-bold text-rose-700 hover:bg-rose-50"
            >
              ยกเลิกบิล
            </button>
          )}

          <div className="rounded-lg border border-emerald-100 bg-emerald-50/50 p-3">
            <p className="mb-2 font-bold">ย้ายโต๊ะ</p>
            <div className="flex gap-2">
              <input
                type="number"
                value={targetTable}
                onChange={(event) => setTargetTable(event.target.value)}
                placeholder="โต๊ะปลายทาง"
                className="min-w-0 flex-1 rounded-md border border-slate-300 p-2"
              />
              <button
                onClick={moveTable}
                className="rounded-md bg-amber-600 px-4 font-bold text-white hover:bg-amber-700"
              >
                ย้าย
              </button>
            </div>
          </div>

          {canDiscount && (
            <label className="block">
              <span className="text-sm font-bold">ส่วนลด (%)</span>
              <input
                type="number"
                value={discount}
                min="0"
                max="100"
                onChange={(event) =>
                  setDiscount(
                    Math.max(0, Math.min(100, Number(event.target.value) || 0))
                  )
                }
                className="mt-1 w-full rounded-md border border-slate-300 p-3"
              />
            </label>
          )}

          <label className="block">
            <span className="text-sm font-bold">ช่องทางชำระเงิน</span>
            <select
              value={paymentMethod}
              onChange={(event) => setPaymentMethod(event.target.value)}
              className="mt-1 w-full rounded-md border border-slate-300 p-3"
            >
              {paymentOptions.map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </label>

          {paymentMethod === "cash" && (
            <label className="block">
              <span className="text-sm font-bold">รับเงินสด</span>
              <input
                type="number"
                value={cash}
                onChange={(event) => setCash(Number(event.target.value) || 0)}
                className="mt-1 w-full rounded-md border border-slate-300 p-3"
              />
            </label>
          )}

          <div className="rounded-lg border border-teal-100 bg-teal-50 p-4">
            <div className="flex justify-between text-sm">
              <span>รวมก่อนลด</span>
              <strong>{money(subtotal)} บาท</strong>
            </div>
            <div className="mt-1 flex justify-between text-sm">
              <span>ส่วนลด</span>
              <strong>{money(discountAmount)} บาท</strong>
            </div>
            <div className="mt-2 flex justify-between text-xl font-black">
              <span>สุทธิ</span>
              <span>{money(total)} บาท</span>
            </div>
            <div className="mt-1 flex justify-between text-sm">
              <span>เงินทอน</span>
              <strong>{money(Math.max(change, 0))} บาท</strong>
            </div>
          </div>

          <button
            onClick={payOrder}
            disabled={!canPay}
            className="w-full rounded-md bg-emerald-700 py-4 text-xl font-black text-white shadow-sm hover:bg-emerald-800 disabled:bg-slate-300"
          >
            ชำระเงิน
          </button>
        </div>
      </aside>

      {showHistory && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="max-h-[85vh] w-full max-w-xl overflow-y-auto rounded-md bg-white p-5 shadow-xl">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-2xl font-bold">ประวัติโต๊ะ {table}</h2>
              <button
                onClick={() => setShowHistory(false)}
                className="rounded-md bg-slate-900 px-3 py-1 font-bold text-white"
              >
                ปิด
              </button>
            </div>

            {history.length === 0 ? (
              <p className="text-slate-500">ยังไม่มีประวัติ</p>
            ) : (
              <div className="space-y-3">
                {history.map((item, index) => (
                  <div key={index} className="border-b border-slate-100 pb-3">
                    <p className="font-bold">{item.detail || item.action}</p>
                    {item.reason && (
                      <p className="text-sm text-rose-600">
                        เหตุผล: {item.reason}
                      </p>
                    )}
                    <p className="text-sm text-slate-500">
                      {item.user} - {item.time}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {receipt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-md bg-white p-5 shadow-xl">
            <h2 className="text-center text-2xl font-bold">ชำระเงินสำเร็จ</h2>
            <p className="mt-2 text-center text-slate-500">
              โต๊ะ {receipt.table} - {money(receipt.total)} บาท
            </p>
            <div className="mt-5 grid grid-cols-2 gap-3">
              <button
                onClick={() => printReceipt()}
                className="rounded-md bg-slate-900 py-3 font-bold text-white"
              >
                พิมพ์อีกครั้ง
              </button>
              <button
                onClick={() => {
                  setReceipt(null);
                  goBack();
                }}
                className="rounded-md bg-teal-700 py-3 font-bold text-white"
              >
                เสร็จ
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
