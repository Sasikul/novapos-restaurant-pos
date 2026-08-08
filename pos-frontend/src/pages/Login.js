import { useState } from "react";
import axios from "axios";
import API_BASE_URL from "../config/api";

export default function Login({ setToken }) {
  const [isRegister, setIsRegister] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const handleSubmit = async () => {
    try {
      if (isRegister) {
        await axios.post(`${API_BASE_URL}/api/auth/register`, {
          name,
          email,
          password,
        });

        alert("สมัครสมาชิกสำเร็จ");
        setIsRegister(false);
        setName("");
        setEmail("");
        setPassword("");
        return;
      }

      const res = await axios.post(`${API_BASE_URL}/api/auth/login`, {
        email,
        password,
      });

      localStorage.setItem("token", res.data.token);
      localStorage.setItem("role", res.data.user.role);
      localStorage.setItem("name", res.data.user.name);
      localStorage.setItem(
        "permissions",
        JSON.stringify(res.data.user.permissions || {})
      );

      setToken(res.data.token);
    } catch (error) {
      alert(error.response?.data?.message || "เกิดข้อผิดพลาด");
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-teal-900 via-emerald-800 to-stone-900 p-4">
      <div className="w-full max-w-md rounded-lg border border-white/20 bg-white p-8 shadow-2xl">
        <h1 className="text-center text-3xl font-bold">POS ร้านอาหาร</h1>
        <p className="mt-2 text-center text-slate-500">
          เข้าสู่ระบบเพื่อเริ่มขายหน้าร้าน
        </p>

        <div className="mt-8 space-y-4">
          {isRegister && (
            <input
              type="text"
              placeholder="ชื่อพนักงาน"
              className="w-full rounded-md border border-slate-300 p-3 outline-none focus:border-teal-600 focus:ring-2 focus:ring-teal-100"
              value={name}
              onChange={(event) => setName(event.target.value)}
            />
          )}

          <input
            type="email"
            placeholder="อีเมล"
            className="w-full rounded-md border border-slate-300 p-3 outline-none focus:border-teal-600 focus:ring-2 focus:ring-teal-100"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
          />

          <input
            type="password"
            placeholder="รหัสผ่าน"
            className="w-full rounded-md border border-slate-300 p-3 outline-none focus:border-teal-600 focus:ring-2 focus:ring-teal-100"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
          />

          <button
            onClick={handleSubmit}
            className="w-full rounded-md bg-teal-700 py-3 font-bold text-white shadow-sm hover:bg-teal-800"
          >
            {isRegister ? "สมัครสมาชิก" : "เข้าสู่ระบบ"}
          </button>
        </div>

        <p className="mt-6 text-center text-sm text-slate-500">
          {isRegister ? "มีบัญชีอยู่แล้ว?" : "ยังไม่มีบัญชี?"}
          <button
            onClick={() => setIsRegister(!isRegister)}
            className="ml-2 font-bold text-teal-700"
          >
            {isRegister ? "เข้าสู่ระบบ" : "สมัครสมาชิก"}
          </button>
        </p>
      </div>
    </div>
  );
}
