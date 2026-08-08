import { useCallback, useEffect, useMemo, useState } from "react";
import axios from "axios";
import {
  ArcElement,
  BarElement,
  CategoryScale,
  Chart as ChartJS,
  Legend,
  LinearScale,
  LineElement,
  PointElement,
  Tooltip,
} from "chart.js";
import { Bar, Doughnut, Line } from "react-chartjs-2";
import API_BASE_URL from "../config/api";

ChartJS.register(
  ArcElement,
  BarElement,
  CategoryScale,
  Legend,
  LinearScale,
  LineElement,
  PointElement,
  Tooltip
);

const money = (value) => Number(value || 0).toLocaleString();

const paymentLabels = {
  cash: "เงินสด",
  transfer: "โอน",
  qr: "QR",
  card: "บัตร",
};

export default function Dashboard({ token }) {
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);
  const [closing, setClosing] = useState(false);
  const [selectedDate, setSelectedDate] = useState(
    new Date().toLocaleDateString("en-CA")
  );

  const permissions = JSON.parse(localStorage.getItem("permissions") || "{}");
  const role = localStorage.getItem("role");
  const canCloseStore = role === "admin" || permissions.canCloseStore;
  const canExportReports = role === "admin" || permissions.canExportReports;

  const headers = useMemo(
    () => ({
      headers: {
        Authorization: `Bearer ${token || localStorage.getItem("token")}`,
      },
    }),
    [token]
  );

  const loadDashboard = useCallback(async () => {
    try {
      setLoading(true);
      const res = await axios.get(
        `${API_BASE_URL}/api/orders/dashboard?date=${selectedDate}`,
        headers
      );
      setReport(res.data);
    } catch (error) {
      alert(error.response?.data?.message || "โหลดรายงานไม่สำเร็จ");
    } finally {
      setLoading(false);
    }
  }, [headers, selectedDate]);

  useEffect(() => {
    loadDashboard();
  }, [loadDashboard]);

  const today = report?.today || {};
  const storeDay = report?.storeDay;
  const pendingTables = today.pendingTables || [];
  const topMenus = today.topMenus || [];
  const hourlySales = today.hourlySales || [];
  const recentPaidOrders = today.recentPaidOrders || [];
  const payments = today.payments || {};
  const isToday = selectedDate === new Date().toLocaleDateString("en-CA");
  const isOpen = storeDay?.status !== "closed";

  const closeStore = async () => {
    if (pendingTables.length > 0) {
      alert(
        `ยังปิดร้านไม่ได้ เพราะมีโต๊ะค้างชำระ: ${pendingTables
          .map((item) => item.table)
          .join(", ")}`
      );
      return;
    }

    if (!window.confirm("ยืนยันปิดรอบขายวันนี้?")) return;

    try {
      setClosing(true);
      await axios.post(`${API_BASE_URL}/api/orders/store-day/close`, {}, headers);
      await loadDashboard();
      alert("ปิดรอบขายเรียบร้อย");
    } catch (error) {
      alert(error.response?.data?.message || "ปิดรอบขายไม่สำเร็จ");
    } finally {
      setClosing(false);
    }
  };

  const openStore = async () => {
    await axios.post(`${API_BASE_URL}/api/orders/store-day/open`, {}, headers);
    await loadDashboard();
  };

  const exportCsv = async () => {
    const res = await axios.get(
      `${API_BASE_URL}/api/orders/export?date=${selectedDate}`,
      {
        ...headers,
        responseType: "blob",
      }
    );
    const url = window.URL.createObjectURL(new Blob([res.data]));
    const link = document.createElement("a");
    link.href = url;
    link.download = `pos-report-${selectedDate}.csv`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
  };

  const hourlyChart = {
    labels: hourlySales.map((item) => `${item.hour}:00`),
    datasets: [
      {
        label: "ยอดขาย",
        data: hourlySales.map((item) => item.revenue),
        borderColor: "#0f766e",
        backgroundColor: "rgba(15, 118, 110, 0.18)",
        fill: true,
        tension: 0.35,
      },
    ],
  };

  const orderChart = {
    labels: hourlySales.map((item) => `${item.hour}:00`),
    datasets: [
      {
        label: "จำนวนบิล",
        data: hourlySales.map((item) => item.orders),
        backgroundColor: "#2563eb",
      },
    ],
  };

  const menuChart = {
    labels: topMenus.slice(0, 6).map((item) => item.name),
    datasets: [
      {
        data: topMenus.slice(0, 6).map((item) => item.quantity),
        backgroundColor: [
          "#0f766e",
          "#2563eb",
          "#f59e0b",
          "#dc2626",
          "#7c3aed",
          "#475569",
        ],
      },
    ],
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false,
      },
    },
    scales: {
      y: {
        beginAtZero: true,
      },
    },
  };

  if (loading) {
    return (
      <main className="mx-auto max-w-7xl px-4 py-6">
        <div className="rounded-md bg-white p-8 text-center text-slate-500">
          กำลังโหลดรายงาน...
        </div>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-7xl px-4 py-6">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-sm font-bold text-teal-700">
            รายงานวันที่ {report?.dateKey || selectedDate}
          </p>
          <h1 className="mt-1 text-3xl font-bold">รายงานร้าน</h1>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <input
            type="date"
            value={selectedDate}
            onChange={(event) => setSelectedDate(event.target.value)}
            className="rounded-md border border-slate-300 px-3 py-2"
          />
          {canExportReports && (
            <button
              onClick={exportCsv}
          className="rounded-md border border-teal-200 bg-white px-4 py-2 font-semibold text-teal-800 shadow-sm hover:bg-teal-50"
            >
              Export CSV
            </button>
          )}
          {isToday && canCloseStore && isOpen && (
            <button
              onClick={closeStore}
              disabled={closing}
              className="rounded-md bg-rose-600 px-4 py-2 font-bold text-white disabled:bg-slate-300"
            >
              {closing ? "กำลังปิดรอบ..." : "ปิดรอบขาย"}
            </button>
          )}
          {isToday && canCloseStore && !isOpen && (
            <button
              onClick={openStore}
              className="rounded-md bg-teal-700 px-4 py-2 font-bold text-white shadow-sm hover:bg-teal-800"
            >
              เปิดรอบขาย
            </button>
          )}
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        <Metric label="ยอดขาย" value={`${money(today.totalRevenue)} บาท`} />
        <Metric label="บิลที่ชำระแล้ว" value={today.paidOrders || 0} />
        <Metric label="จำนวนสินค้าที่ขาย" value={today.totalItemsSold || 0} />
        <Metric
          label="เฉลี่ยต่อบิล"
          value={`${money(today.averageOrderValue)} บาท`}
        />
        <Metric label="บิลที่ยกเลิก" value={today.cancelledOrders || 0} />
      </div>

      <section className="mt-6 rounded-lg border border-emerald-100 bg-white p-5 shadow-sm">
        <h2 className="mb-4 text-lg font-bold">ช่องทางชำระเงิน</h2>
        <div className="grid gap-3 md:grid-cols-4">
          {Object.entries(paymentLabels).map(([key, label]) => (
            <div key={key} className="rounded-md bg-slate-50 p-4">
              <p className="text-sm text-slate-500">{label}</p>
              <p className="mt-1 text-2xl font-black">
                {money(payments[key])} บาท
              </p>
            </div>
          ))}
        </div>
      </section>

      {pendingTables.length > 0 && (
        <section className="mt-6 rounded-md border border-amber-200 bg-amber-50 p-5">
          <h2 className="font-bold text-amber-900">โต๊ะค้างชำระ</h2>
          <div className="mt-3 flex flex-wrap gap-2">
            {pendingTables.map((item) => (
              <span
                key={item.table}
                className="rounded-md bg-white px-3 py-2 text-sm font-semibold text-amber-900"
              >
                โต๊ะ {item.table} · {money(item.totalPrice)} บาท
              </span>
            ))}
          </div>
        </section>
      )}

      <div className="mt-6 grid gap-6 xl:grid-cols-3">
        <section className="rounded-lg border border-emerald-100 bg-white p-5 shadow-sm xl:col-span-2">
          <h2 className="mb-4 text-lg font-bold">ยอดขายรายชั่วโมง</h2>
          <div className="h-72">
            {hourlySales.length ? (
              <Line data={hourlyChart} options={chartOptions} />
            ) : (
              <Empty text="ยังไม่มียอดขาย" />
            )}
          </div>
        </section>

        <section className="rounded-lg border border-emerald-100 bg-white p-5 shadow-sm">
          <h2 className="mb-4 text-lg font-bold">เมนูขายดี</h2>
          <div className="h-72">
            {topMenus.length ? (
              <Doughnut
                data={menuChart}
                options={{ responsive: true, maintainAspectRatio: false }}
              />
            ) : (
              <Empty text="ยังไม่มีข้อมูลเมนูขายดี" />
            )}
          </div>
        </section>
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-3">
        <section className="rounded-lg border border-emerald-100 bg-white p-5 shadow-sm">
          <h2 className="mb-4 text-lg font-">จำนวนบิลตามเวลา</h2>
          <div className="h-64">
            {hourlySales.length ? (
              <Bar data={orderChart} options={chartOptions} />
            ) : (
              <Empty text="ยังไม่มีบิลที่ชำระแล้ว" />
            )}
          </div>
        </section>

        <section className="rounded-lg border border-emerald-100 bg-white p-5 shadow-sm xl:col-span-2">
          <h2 className="mb-4 text-lg font-bold">บิลล่าสุด</h2>
          {recentPaidOrders.length === 0 ? (
            <Empty text="ยังไม่มีบิลล่าสุด" />
          ) : (
            <div className="grid gap-3 md:grid-cols-2">
              {recentPaidOrders.map((order) => (
                <div
                  key={order.id}
                  className="rounded-md border border-slate-200 p-4"
                >
                  <p className="text-sm text-slate-500">โต๊ะ {order.table}</p>
                  <p className="mt-1 text-xl font-black">
                    {money(order.totalPrice)} บาท
                  </p>
                  <p className="mt-1 text-sm text-slate-500">
                    {paymentLabels[order.paymentMethod] || "-"} ·{" "}
                    {order.paidAt
                      ? new Date(order.paidAt).toLocaleString("th-TH")
                      : "-"}
                  </p>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}

function Metric({ label, value }) {
  return (
    <div className="rounded-lg border border-emerald-100 bg-white p-5 shadow-sm">
      <p className="text-sm font-semibold text-slate-500">{label}</p>
      <p className="mt-2 text-2xl font-black text-slate-900">{value}</p>
    </div>
  );
}

function Empty({ text }) {
  return (
    <div className="flex h-full min-h-32 items-center justify-center rounded-md border border-dashed border-slate-300 bg-slate-50 text-sm text-slate-500">
      {text}
    </div>
  );
}
