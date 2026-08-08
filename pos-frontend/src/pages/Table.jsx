import { useEffect, useMemo, useState } from "react";
import axios from "axios";
import API_BASE_URL from "../config/api";

const statusText = {
  pending: "รอส่งครัว",
  preparing: "กำลังทำ",
  ready: "พร้อมเสิร์ฟ",
  served: "เสิร์ฟแล้ว",
};

const statusStyle = {
  pending: "border-amber-200 bg-amber-50 text-amber-800",
  preparing: "border-blue-200 bg-blue-50 text-blue-800",
  ready: "border-emerald-200 bg-emerald-50 text-emerald-800",
  served: "border-slate-200 bg-slate-50 text-slate-700",
};

const filters = [
  ["all", "ทั้งหมด"],
  ["busy", "มีออเดอร์"],
  ["free", "โต๊ะว่าง"],
];

export default function Table({ onSelectTable }) {
  const [tables, setTables] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");

  const fetchTables = async () => {
    const token = localStorage.getItem("token");
    const data = [];

    for (let i = 1; i <= 20; i += 1) {
      try {
        const res = await axios.get(`${API_BASE_URL}/api/orders/table/${i}`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        data.push({
          number: i,
          order: res.data?._id ? res.data : null,
        });
      } catch (error) {
        data.push({
          number: i,
          order: null,
        });
      }
    }

    setTables(data);
    setLoading(false);
  };

  useEffect(() => {
    fetchTables();
    const interval = setInterval(fetchTables, 5000);
    return () => clearInterval(interval);
  }, []);

  const visibleTables = useMemo(() => {
    if (filter === "busy") return tables.filter((table) => table.order);
    if (filter === "free") return tables.filter((table) => !table.order);
    return tables;
  }, [filter, tables]);

  const busyCount = tables.filter((table) => table.order).length;
  const freeCount = tables.length - busyCount;

  return (
    <main className="mx-auto max-w-7xl px-4 py-6">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">เลือกโต๊ะ</h1>
          <p className="mt-1 text-slate-500">
            โต๊ะว่างกดเพื่อเปิดบิล โต๊ะที่มีออเดอร์กดเพื่อแก้ไขหรือชำระเงิน
          </p>
        </div>
        <button
          onClick={fetchTables}
          className="rounded-md border border-teal-200 bg-white px-4 py-2 font-semibold text-teal-800 shadow-sm hover:bg-teal-50"
        >
          โหลดใหม่
        </button>
      </div>

      <div className="mb-5 flex flex-wrap items-center gap-2">
        {filters.map(([value, label]) => (
          <button
            key={value}
            onClick={() => setFilter(value)}
            className={`rounded-md border px-4 py-2 font-semibold ${
              filter === value
                ? "border-teal-700 bg-teal-700 text-white"
                : "border-slate-200 bg-white text-slate-700 hover:border-teal-300"
            }`}
          >
            {label}
          </button>
        ))}
        <span className="text-sm font-semibold text-slate-500">
          มีออเดอร์ {busyCount} โต๊ะ / ว่าง {freeCount} โต๊ะ
        </span>
      </div>

      {loading ? (
        <div className="rounded-lg border border-emerald-100 bg-white p-8 text-center text-slate-500 shadow-sm">
          กำลังโหลดโต๊ะ...
        </div>
      ) : visibleTables.length === 0 ? (
        <div className="rounded-lg border border-emerald-100 bg-white p-8 text-center text-slate-500 shadow-sm">
          ไม่มีโต๊ะในตัวกรองนี้
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
          {visibleTables.map((table) => {
            const isBusy = !!table.order;
            const status = table.order?.status || "available";

            return (
              <button
                key={table.number}
                onClick={() => onSelectTable(table.number)}
                className={`min-h-36 rounded-md border p-5 text-left shadow-sm transition hover:shadow ${
                  isBusy
                    ? statusStyle[status] || "border-rose-200 bg-rose-50"
                    : "border-emerald-200 bg-white hover:border-emerald-500 hover:bg-emerald-50/50"
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <p className="text-4xl font-black">{table.number}</p>
                  <span
                    className={`rounded-md px-2 py-1 text-xs font-bold ${
                      isBusy
                        ? "bg-white/70 text-slate-700"
                        : "bg-emerald-100 text-emerald-800"
                    }`}
                  >
                    {isBusy ? statusText[status] || "มีออเดอร์" : "ว่าง"}
                  </span>
                </div>
                {isBusy ? (
                  <div className="mt-5 text-sm font-semibold">
                    <p>{table.order.items?.length || 0} รายการ</p>
                    <p>
                      {Number(table.order.totalPrice || 0).toLocaleString()} บาท
                    </p>
                  </div>
                ) : (
                  <p className="mt-5 text-sm font-semibold text-emerald-700">
                    พร้อมเปิดบิล
                  </p>
                )}
              </button>
            );
          })}
        </div>
      )}
    </main>
  );
}
