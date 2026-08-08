import { useCallback, useEffect, useMemo, useState } from "react";
import axios from "axios";
import API_BASE_URL from "../config/api";

const stations = [
  "ทั้งหมด",
  "เตาผัด",
  "เตาต้ม",
  "เตาย่าง",
  "ทอด",
  "ส้มตำ",
  "เครื่องดื่ม",
  "ของหวาน",
  "ครัวทั่วไป",
];

const statusText = {
  pending: "รอทำ",
  preparing: "กำลังทำ",
  ready: "พร้อมเสิร์ฟ",
};

const nextActions = {
  pending: ["preparing", "เริ่มทำ"],
  preparing: ["ready", "พร้อมเสิร์ฟ"],
  ready: ["served", "เสิร์ฟแล้ว"],
};

export default function Kitchen({ token }) {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [station, setStation] = useState("ทั้งหมด");

  const headers = useMemo(
    () => ({
      headers: {
        Authorization: `Bearer ${token || localStorage.getItem("token")}`,
      },
    }),
    [token]
  );

  const loadOrders = useCallback(async () => {
    try {
      setLoading(true);
      const params =
        station === "ทั้งหมด" ? "" : `?station=${encodeURIComponent(station)}`;
      const res = await axios.get(
        `${API_BASE_URL}/api/orders/kitchen${params}`,
        headers
      );
      setOrders(res.data);
    } catch (error) {
      console.log(error);
    } finally {
      setLoading(false);
    }
  }, [headers, station]);

  useEffect(() => {
    loadOrders();
    const interval = setInterval(loadOrders, 5000);
    return () => clearInterval(interval);
  }, [loadOrders]);

  const updateStatus = async (orderId, status) => {
    await axios.put(
      `${API_BASE_URL}/api/orders/${orderId}/status`,
      { status },
      headers
    );
    loadOrders();
  };

  return (
    <main className="mx-auto max-w-7xl px-4 py-6">
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">หน้าครัว</h1>
          <p className="mt-1 text-slate-500">
            แยกงานตาม station เช่น เตาผัด เตาต้ม เตาย่าง ทอด เครื่องดื่ม และของหวาน
          </p>
        </div>
        <button
          onClick={loadOrders}
          className="rounded-md border border-teal-200 bg-white px-4 py-2 font-semibold text-teal-800 shadow-sm hover:bg-teal-50"
        >
          โหลดใหม่
        </button>
      </div>

      <div className="mb-5 flex gap-2 overflow-x-auto pb-2">
        {stations.map((item) => (
          <button
            key={item}
            onClick={() => setStation(item)}
            className={`whitespace-nowrap rounded-md border px-4 py-2 font-semibold ${
              station === item
                ? "border-teal-700 bg-teal-700 text-white"
                : "border-slate-200 bg-white text-slate-700 hover:border-teal-300"
            }`}
          >
            {item}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="rounded-lg border border-emerald-100 bg-white p-8 text-center text-slate-500 shadow-sm">
          กำลังโหลดออเดอร์...
        </div>
      ) : orders.length === 0 ? (
        <div className="rounded-lg border border-emerald-100 bg-white p-8 text-center text-slate-500 shadow-sm">
          ไม่มีออเดอร์ค้างใน station นี้
        </div>
      ) : (
        <div className="grid gap-4 lg:grid-cols-3">
          {orders.map((order) => {
            const action = nextActions[order.status];

            return (
              <section
                key={order._id}
                className="rounded-lg border border-amber-100 bg-white p-5 shadow-sm"
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h2 className="text-3xl font-black">โต๊ะ {order.table}</h2>
                    <p className="mt-1 text-sm text-slate-500">
                      {new Date(order.createdAt).toLocaleString("th-TH")}
                    </p>
                  </div>
                  <span className="rounded-md bg-amber-100 px-3 py-1 text-sm font-bold text-amber-800">
                    {statusText[order.status] || order.status}
                  </span>
                </div>

                <div className="mt-5 space-y-3">
                  {order.items.map((item, index) => (
                    <div
                      key={`${item.menu?._id || index}-${index}`}
                      className="rounded-md bg-slate-50 p-3"
                    >
                      <div className="flex justify-between gap-3">
                        <div>
                          <p className="font-bold">
                            {item.menu?.name || "ไม่พบเมนู"}
                          </p>
                          <p className="mt-1 text-xs font-semibold text-teal-700">
                            {item.menu?.station || "ครัวทั่วไป"}
                          </p>
                        </div>
                        <p className="text-xl font-black">x{item.quantity}</p>
                      </div>
                      {item.note && (
                        <p className="mt-2 rounded-md bg-amber-50 px-2 py-1 text-sm font-semibold text-amber-800">
                          หมายเหตุ: {item.note}
                        </p>
                      )}
                    </div>
                  ))}
                </div>

                {action && (
                  <button
                    onClick={() => updateStatus(order._id, action[0])}
                    className="mt-5 w-full rounded-md bg-teal-700 py-3 font-bold text-white hover:bg-teal-800"
                  >
                    {action[1]}
                  </button>
                )}
              </section>
            );
          })}
        </div>
      )}
    </main>
  );
}
