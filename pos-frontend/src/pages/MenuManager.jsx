import { useEffect, useMemo, useState } from "react";
import axios from "axios";
import API_BASE_URL from "../config/api";

const categories = ["อาหาร", "เครื่องดื่ม", "ของหวาน", "อื่น ๆ"];
const stations = [
  "ครัวทั่วไป",
  "เตาผัด",
  "เตาต้ม",
  "เตาย่าง",
  "ทอด",
  "ส้มตำ",
  "เครื่องดื่ม",
  "ของหวาน",
];

const defaultForm = {
  name: "",
  price: "",
  category: "อาหาร",
  station: "ครัวทั่วไป",
  available: true,
};

export default function MenuManager({ token }) {
  const [form, setForm] = useState(defaultForm);
  const [menus, setMenus] = useState([]);
  const [editingId, setEditingId] = useState(null);
  const [search, setSearch] = useState("");

  const headers = {
    headers: {
      Authorization: `Bearer ${token || localStorage.getItem("token")}`,
    },
  };

  const fetchMenus = async () => {
    const res = await axios.get(`${API_BASE_URL}/api/menu`);
    setMenus(res.data);
  };

  useEffect(() => {
    fetchMenus();
  }, []);

  const filteredMenus = useMemo(() => {
    const keyword = search.trim().toLowerCase();
    if (!keyword) return menus;

    return menus.filter(
      (menu) =>
        menu.name?.toLowerCase().includes(keyword) ||
        menu.category?.toLowerCase().includes(keyword) ||
        menu.station?.toLowerCase().includes(keyword)
    );
  }, [menus, search]);

  const saveMenu = async () => {
    if (!form.name || !form.price) {
      alert("กรุณากรอกชื่อเมนูและราคา");
      return;
    }

    const payload = {
      ...form,
      price: Number(form.price),
    };

    if (editingId) {
      await axios.put(`${API_BASE_URL}/api/menu/${editingId}`, payload, headers);
    } else {
      await axios.post(`${API_BASE_URL}/api/menu`, payload, headers);
    }

    setForm(defaultForm);
    setEditingId(null);
    fetchMenus();
  };

  const editMenu = (menu) => {
    setEditingId(menu._id);
    setForm({
      name: menu.name || "",
      price: menu.price || "",
      category: menu.category || "อาหาร",
      station: menu.station || "ครัวทั่วไป",
      available: menu.available !== false,
    });
  };

  const deleteMenu = async (id) => {
    if (!window.confirm("ต้องการลบเมนูนี้ใช่ไหม?")) return;
    await axios.delete(`${API_BASE_URL}/api/menu/${id}`, headers);
    fetchMenus();
  };

  const toggleAvailable = async (menu) => {
    await axios.put(
      `${API_BASE_URL}/api/menu/${menu._id}`,
      {
        ...menu,
        available: menu.available === false,
      },
      headers
    );
    fetchMenus();
  };

  return (
    <main className="mx-auto max-w-7xl px-4 py-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">จัดการเมนู</h1>
        <p className="mt-1 text-slate-500">
          เพิ่มราคา หมวดหมู่ station และปิดเมนูที่หมดได้จากหน้านี้
        </p>
      </div>

      <section className="rounded-lg border border-emerald-100 bg-white p-5 shadow-sm">
        <div className="grid gap-3 md:grid-cols-6">
          <input
            type="text"
            placeholder="ชื่อเมนู"
            value={form.name}
            onChange={(event) => setForm({ ...form, name: event.target.value })}
            className="rounded-md border border-slate-300 p-3 md:col-span-2"
          />
          <input
            type="number"
            placeholder="ราคา"
            value={form.price}
            onChange={(event) =>
              setForm({ ...form, price: event.target.value })
            }
            className="rounded-md border border-slate-300 p-3"
          />
          <select
            value={form.category}
            onChange={(event) =>
              setForm({ ...form, category: event.target.value })
            }
            className="rounded-md border border-slate-300 p-3"
          >
            {categories.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
          <select
            value={form.station}
            onChange={(event) =>
              setForm({ ...form, station: event.target.value })
            }
            className="rounded-md border border-slate-300 p-3"
          >
            {stations.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
          <button
            onClick={saveMenu}
            className="rounded-md bg-teal-700 px-4 py-3 font-bold text-white shadow-sm hover:bg-teal-800"
          >
            {editingId ? "บันทึกแก้ไข" : "เพิ่มเมนู"}
          </button>
        </div>
      </section>

      <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
        <input
          type="search"
          placeholder="ค้นหาเมนู หมวดหมู่ หรือ station"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          className="w-full rounded-md border border-slate-300 p-3 md:w-96"
        />
        {editingId && (
          <button
            onClick={() => {
              setEditingId(null);
              setForm(defaultForm);
            }}
            className="rounded-md border border-slate-300 px-4 py-2 font-semibold"
          >
            ยกเลิกแก้ไข
          </button>
        )}
      </div>

      <div className="mt-4 grid gap-3">
        {filteredMenus.map((menu) => (
          <div
            key={menu._id}
            className="flex flex-wrap items-center justify-between gap-4 rounded-lg border border-emerald-100 bg-white p-4 shadow-sm"
          >
            <div>
              <h2 className="text-lg font-bold">{menu.name}</h2>
              <p className="text-sm text-slate-500">
                {menu.category} - {menu.station || "ครัวทั่วไป"} -{" "}
                {Number(menu.price || 0).toLocaleString()} บาท
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => toggleAvailable(menu)}
                className={`rounded-md px-4 py-2 font-semibold ${
                  menu.available === false
                    ? "bg-rose-100 text-rose-800"
                    : "bg-emerald-100 text-emerald-800"
                }`}
              >
                {menu.available === false ? "เมนูหมด" : "พร้อมขาย"}
              </button>
              <button
                onClick={() => editMenu(menu)}
                className="rounded-md border border-slate-300 px-4 py-2 font-semibold"
              >
                แก้ไข
              </button>
              <button
                onClick={() => deleteMenu(menu._id)}
                className="rounded-md border border-rose-200 px-4 py-2 font-semibold text-rose-700"
              >
                ลบ
              </button>
            </div>
          </div>
        ))}
      </div>
    </main>
  );
}
