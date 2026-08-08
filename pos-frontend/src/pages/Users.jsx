import { useEffect, useState } from "react";
import axios from "axios";
import API_BASE_URL from "../config/api";

const permissionList = [
  ["canDiscount", "ให้ส่วนลด"],
  ["canDeleteItem", "ลบรายการอาหาร"],
  ["canCancelOrder", "ยกเลิกบิล"],
  ["canEditMenu", "จัดการเมนู"],
  ["canManageKitchen", "จัดการหน้าครัว"],
  ["canViewDashboard", "ดูรายงาน"],
  ["canExportReports", "Export รายงาน"],
  ["canCloseStore", "ปิดรอบขาย"],
  ["canManageUsers", "จัดการพนักงาน"],
  ["canRefund", "คืนเงิน"],
];

export default function Users({ token }) {
  const [users, setUsers] = useState([]);

  const headers = {
    headers: {
      Authorization: `Bearer ${token || localStorage.getItem("token")}`,
    },
  };

  const fetchUsers = async () => {
    try {
      const res = await axios.get(`${API_BASE_URL}/api/users`, headers);
      setUsers(res.data);
    } catch (error) {
      alert(error.response?.data?.message || "โหลดรายชื่อพนักงานไม่สำเร็จ");
    }
  };

  useEffect(() => {
    fetchUsers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const updateUser = async (userId, updates) => {
    const current = users.find((user) => user._id === userId);
    const res = await axios.put(
      `${API_BASE_URL}/api/users/${userId}`,
      {
        role: updates.role || current.role,
        permissions: {
          ...(current.permissions || {}),
          ...(updates.permissions || {}),
        },
      },
      headers
    );

    setUsers((prev) =>
      prev.map((user) => (user._id === userId ? res.data.user : user))
    );
  };

  return (
    <main className="mx-auto max-w-7xl px-4 py-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">จัดการพนักงาน</h1>
        <p className="mt-1 text-slate-500">
          กำหนดสิทธิ์ตามหน้าที่จริงของแต่ละคน
        </p>
      </div>

      <div className="grid gap-4">
        {users.map((user) => (
          <section key={user._id} className="rounded-lg border border-emerald-100 bg-white p-5 shadow-sm">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <h2 className="text-xl font-bold">{user.name}</h2>
                <p className="text-sm text-slate-500">{user.email}</p>
              </div>
              <select
                value={user.role}
                onChange={(event) =>
                  updateUser(user._id, { role: event.target.value })
                }
                className="rounded-md border border-slate-300 px-3 py-2 font-semibold"
              >
                <option value="employee">พนักงาน</option>
                <option value="admin">Admin</option>
              </select>
            </div>

            <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-5">
              {permissionList.map(([key, label]) => (
                <label
                  key={key}
                  className="flex items-center gap-2 rounded-md border border-emerald-100 bg-emerald-50/30 px-3 py-2 text-sm"
                >
                  <input
                    type="checkbox"
                    checked={user.role === "admin" || !!user.permissions?.[key]}
                    disabled={user.role === "admin"}
                    onChange={(event) =>
                      updateUser(user._id, {
                        permissions: {
                          [key]: event.target.checked,
                        },
                      })
                    }
                  />
                  {label}
                </label>
              ))}
            </div>
          </section>
        ))}
      </div>
    </main>
  );
}
