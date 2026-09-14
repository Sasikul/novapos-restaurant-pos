import { useEffect, useMemo, useState } from "react";
import axios from "axios";
import API_BASE_URL from "../config/api";

const money = (value) => Number(value || 0).toLocaleString();

export default function CustomerOrder({ table }) {
  const [menus, setMenus] = useState([]);
  const [cart, setCart] = useState({});
  const [customerName, setCustomerName] = useState("");
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("all");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState("");
  const [activeOrder, setActiveOrder] = useState(null);

  useEffect(() => {
    const load = async () => {
      try {
        const [menuRes, orderRes] = await Promise.all([
          axios.get(`${API_BASE_URL}/api/menu`),
          axios.get(`${API_BASE_URL}/api/orders/customer/table/${table}`),
        ]);

        setMenus((menuRes.data || []).filter((item) => item.available !== false));
        setActiveOrder(orderRes.data?._id ? orderRes.data : null);
      } catch (error) {
        setMessage("ไม่สามารถโหลดเมนูได้ กรุณาแจ้งพนักงาน");
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [table]);

  const categories = useMemo(() => {
    const list = menus.map((menu) => menu.category).filter(Boolean);
    return ["all", ...new Set(list)];
  }, [menus]);

  const filteredMenus = useMemo(() => {
    const keyword = search.trim().toLowerCase();

    return menus.filter((menu) => {
      const matchCategory = category === "all" || menu.category === category;
      const matchKeyword =
        !keyword ||
        menu.name?.toLowerCase().includes(keyword) ||
        menu.category?.toLowerCase().includes(keyword);

      return matchCategory && matchKeyword;
    });
  }, [menus, search, category]);

  const cartItems = useMemo(
    () =>
      Object.values(cart)
        .filter((item) => item.quantity > 0)
        .map((item) => ({
          ...item,
          total: Number(item.menu.price || 0) * item.quantity,
        })),
    [cart]
  );

  const total = cartItems.reduce((sum, item) => sum + item.total, 0);

  const updateCart = (menu, quantity) => {
    setCart((current) => {
      const next = { ...current };

      if (quantity <= 0) {
        delete next[menu._id];
      } else {
        next[menu._id] = {
          menu,
          quantity,
          note: next[menu._id]?.note || "",
        };
      }

      return next;
    });
  };

  const updateNote = (menuId, note) => {
    setCart((current) => ({
      ...current,
      [menuId]: {
        ...current[menuId],
        note,
      },
    }));
  };

  const submitOrder = async () => {
    if (cartItems.length === 0) {
      setMessage("กรุณาเลือกเมนูก่อนส่งออเดอร์");
      return;
    }

    setSubmitting(true);
    setMessage("");

    try {
      const res = await axios.post(`${API_BASE_URL}/api/orders/customer`, {
        table,
        customerName,
        items: cartItems.map((item) => ({
          menu: item.menu._id,
          quantity: item.quantity,
          note: item.note,
        })),
      });

      setActiveOrder(res.data);
      setCart({});
      setMessage("ส่งออเดอร์เรียบร้อยแล้ว พนักงานและครัวจะเห็นรายการของโต๊ะนี้");
    } catch (error) {
      setMessage(error.response?.data?.message || "ส่งออเดอร์ไม่สำเร็จ กรุณาแจ้งพนักงาน");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-stone-50 text-slate-900">
      <header className="sticky top-0 z-30 border-b border-emerald-100 bg-white/95 shadow-sm backdrop-blur">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-3 px-4 py-3">
          <div>
            <p className="text-sm font-bold text-teal-700">QR Order</p>
            <h1 className="text-2xl font-black">โต๊ะ {table}</h1>
          </div>
          <div className="rounded-md bg-emerald-50 px-3 py-2 text-right text-sm font-bold text-emerald-800">
            {money(total)} บาท
          </div>
        </div>
      </header>

      <main className="mx-auto grid max-w-5xl gap-5 px-4 py-5 lg:grid-cols-[1fr_340px]">
        <section>
          <div className="mb-4 rounded-md border border-emerald-100 bg-white p-4 shadow-sm">
            <label className="text-sm font-bold text-slate-600">ชื่อผู้สั่ง (ไม่บังคับ)</label>
            <input
              value={customerName}
              onChange={(event) => setCustomerName(event.target.value)}
              placeholder="เช่น คุณกิม / ลูกค้าโต๊ะ 3"
              className="mt-2 w-full rounded-md border border-slate-300 p-3"
            />
            {activeOrder && (
              <p className="mt-3 text-sm font-semibold text-teal-700">
                โต๊ะนี้มีออเดอร์เปิดอยู่ สามารถสั่งเพิ่มได้เลย
              </p>
            )}
          </div>

          <div className="mb-4 grid gap-3 sm:grid-cols-[1fr_auto]">
            <input
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="ค้นหาเมนู"
              className="rounded-md border border-slate-300 bg-white p-3"
            />
            <select
              value={category}
              onChange={(event) => setCategory(event.target.value)}
              className="rounded-md border border-slate-300 bg-white p-3"
            >
              {categories.map((item) => (
                <option key={item} value={item}>
                  {item === "all" ? "ทุกหมวดหมู่" : item}
                </option>
              ))}
            </select>
          </div>

          {loading ? (
            <div className="rounded-md border border-emerald-100 bg-white p-8 text-center text-slate-500">
              กำลังโหลดเมนู...
            </div>
          ) : filteredMenus.length === 0 ? (
            <div className="rounded-md border border-emerald-100 bg-white p-8 text-center text-slate-500">
              ไม่พบเมนู
            </div>
          ) : (
            <div className="grid gap-3">
              {filteredMenus.map((menu) => {
                const item = cart[menu._id];
                const quantity = item?.quantity || 0;

                return (
                  <article
                    key={menu._id}
                    className="rounded-md border border-emerald-100 bg-white p-4 shadow-sm"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <h2 className="text-lg font-black">{menu.name}</h2>
                        <p className="mt-1 text-sm text-slate-500">
                          {menu.category} · {menu.station || "ครัวทั่วไป"}
                        </p>
                        <p className="mt-2 text-xl font-black text-teal-800">
                          {money(menu.price)} บาท
                        </p>
                      </div>

                      <div className="flex shrink-0 items-center gap-2">
                        <button
                          onClick={() => updateCart(menu, quantity - 1)}
                          className="grid h-10 w-10 place-items-center rounded-md border border-slate-300 bg-white text-xl font-black"
                        >
                          -
                        </button>
                        <span className="grid h-10 w-10 place-items-center rounded-md bg-slate-100 font-black">
                          {quantity}
                        </span>
                        <button
                          onClick={() => updateCart(menu, quantity + 1)}
                          className="grid h-10 w-10 place-items-center rounded-md bg-teal-700 text-xl font-black text-white"
                        >
                          +
                        </button>
                      </div>
                    </div>

                    {quantity > 0 && (
                      <input
                        value={item?.note || ""}
                        onChange={(event) => updateNote(menu._id, event.target.value)}
                        placeholder="หมายเหตุ เช่น ไม่เผ็ด / ไม่ใส่ผัก"
                        className="mt-3 w-full rounded-md border border-slate-300 p-3"
                      />
                    )}
                  </article>
                );
              })}
            </div>
          )}
        </section>

        <aside className="lg:sticky lg:top-24 lg:self-start">
          <div className="rounded-md border border-emerald-100 bg-white p-4 shadow-sm">
            <h2 className="text-xl font-black">รายการที่เลือก</h2>

            {cartItems.length === 0 ? (
              <p className="mt-4 text-sm text-slate-500">ยังไม่มีรายการ</p>
            ) : (
              <div className="mt-4 grid gap-3">
                {cartItems.map((item) => (
                  <div key={item.menu._id} className="border-b border-slate-100 pb-3">
                    <div className="flex justify-between gap-3 font-bold">
                      <span>{item.menu.name}</span>
                      <span>{money(item.total)}</span>
                    </div>
                    <p className="mt-1 text-sm text-slate-500">
                      {item.quantity} x {money(item.menu.price)} บาท
                    </p>
                    {item.note && (
                      <p className="mt-1 text-sm text-amber-700">หมายเหตุ: {item.note}</p>
                    )}
                  </div>
                ))}
              </div>
            )}

            <div className="mt-4 flex items-center justify-between border-t border-slate-200 pt-4 text-lg font-black">
              <span>รวม</span>
              <span>{money(total)} บาท</span>
            </div>

            {message && (
              <div className="mt-4 rounded-md bg-slate-100 p-3 text-sm font-semibold text-slate-700">
                {message}
              </div>
            )}

            <button
              onClick={submitOrder}
              disabled={submitting || cartItems.length === 0}
              className="mt-4 w-full rounded-md bg-teal-700 px-4 py-3 font-black text-white shadow-sm hover:bg-teal-800 disabled:cursor-not-allowed disabled:bg-slate-300"
            >
              {submitting ? "กำลังส่งออเดอร์..." : "ส่งออเดอร์"}
            </button>
          </div>
        </aside>
      </main>
    </div>
  );
}
