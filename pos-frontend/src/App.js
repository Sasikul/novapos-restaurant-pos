import { useCallback, useEffect, useState } from "react";

import Dashboard from "./pages/Dashboard";
import CustomerOrder from "./pages/CustomerOrder";
import Kitchen from "./pages/Kitchen";
import Login from "./pages/Login";
import MenuManager from "./pages/MenuManager";
import POS from "./pages/POS";
import TableQR from "./pages/TableQR";
import Table from "./pages/Table";
import Users from "./pages/Users";

function App() {
  const params = new URLSearchParams(window.location.search);
  const customerTable = Number(params.get("table"));
  const isCustomerOrder =
    params.get("customer") === "1" &&
    Number.isInteger(customerTable) &&
    customerTable > 0;
  const [token, setToken] = useState(localStorage.getItem("token"));
  const [page, setPage] = useState("table");
  const [selectedTable, setSelectedTable] = useState(null);

  const role = localStorage.getItem("role");
  const name = localStorage.getItem("name");
  const permissions = JSON.parse(localStorage.getItem("permissions") || "{}");
  const isAdmin = role === "admin";
  const canViewDashboard = isAdmin || permissions.canViewDashboard;
  const canManageUsers = isAdmin || permissions.canManageUsers;
  const canEditMenu = isAdmin || permissions.canEditMenu;
  const canManageKitchen = isAdmin || permissions.canManageKitchen;

  const logout = useCallback(() => {
    localStorage.removeItem("token");
    localStorage.removeItem("role");
    localStorage.removeItem("name");
    localStorage.removeItem("permissions");
    setToken(null);
    setPage("table");
  }, []);

  useEffect(() => {
    const handleUnauthorized = (event) => {
      if (event.reason?.response?.status !== 401) return;

      event.preventDefault();
      logout();
    };

    window.addEventListener("unhandledrejection", handleUnauthorized);
    return () => {
      window.removeEventListener("unhandledrejection", handleUnauthorized);
    };
  }, [logout]);

  if (isCustomerOrder) {
    return <CustomerOrder table={customerTable} />;
  }

  if (!token) {
    return <Login setToken={setToken} />;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-stone-50 via-emerald-50/40 to-sky-50 text-slate-900">
      <header className="sticky top-0 z-40 border-b border-emerald-100 bg-white/95 shadow-sm backdrop-blur">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-2 px-4 py-3">
          <button
            onClick={() => setPage("table")}
            className={`rounded-md px-4 py-2 font-semibold ${
              page === "table"
                ? "bg-teal-700 text-white shadow-sm"
                : "text-slate-700 hover:bg-emerald-50 hover:text-teal-800"
            }`}
          >
            โต๊ะ
          </button>

          {canManageKitchen && (
            <button
              onClick={() => setPage("kitchen")}
              className={`rounded-md px-4 py-2 font-semibold ${
                page === "kitchen"
                  ? "bg-teal-700 text-white shadow-sm"
                  : "text-slate-700 hover:bg-emerald-50 hover:text-teal-800"
              }`}
            >
              ครัว
            </button>
          )}

          {canViewDashboard && (
            <button
              onClick={() => setPage("dashboard")}
              className={`rounded-md px-4 py-2 font-semibold ${
                page === "dashboard"
                  ? "bg-teal-700 text-white shadow-sm"
                  : "text-slate-700 hover:bg-emerald-50 hover:text-teal-800"
              }`}
            >
              รายงาน
            </button>
          )}

          {canEditMenu && (
            <button
              onClick={() => setPage("menu")}
              className={`rounded-md px-4 py-2 font-semibold ${
                page === "menu"
                  ? "bg-teal-700 text-white shadow-sm"
                  : "text-slate-700 hover:bg-emerald-50 hover:text-teal-800"
              }`}
            >
              เมนู
            </button>
          )}

          {(isAdmin || canEditMenu) && (
            <button
              onClick={() => setPage("qr")}
              className={`rounded-md px-4 py-2 font-semibold ${
                page === "qr"
                  ? "bg-teal-700 text-white shadow-sm"
                  : "text-slate-700 hover:bg-emerald-50 hover:text-teal-800"
              }`}
            >
              QR โต๊ะ
            </button>
          )}

          {canManageUsers && (
            <button
              onClick={() => setPage("users")}
              className={`rounded-md px-4 py-2 font-semibold ${
                page === "users"
                  ? "bg-teal-700 text-white shadow-sm"
                  : "text-slate-700 hover:bg-emerald-50 hover:text-teal-800"
              }`}
            >
              พนักงาน
            </button>
          )}

          <div className="ml-auto flex items-center gap-3">
            <div className="text-right">
              <p className="text-sm font-bold">{name || "ผู้ใช้งาน"}</p>
              <p className="text-xs text-slate-500">
                {isAdmin ? "Admin" : "Employee"}
              </p>
            </div>
            <button
              onClick={logout}
              className="rounded-md border border-rose-200 px-4 py-2 font-semibold text-rose-700 hover:bg-rose-50"
            >
              ออกจากระบบ
            </button>
          </div>
        </div>
      </header>

      {page === "table" && (
        <Table
          token={token}
          onSelectTable={(table) => {
            setSelectedTable(table);
            setPage("pos");
          }}
        />
      )}

      {page === "pos" && (
        <POS
          token={token}
          table={selectedTable}
          goBack={() => setPage("table")}
        />
      )}

      {page === "kitchen" && canManageKitchen && <Kitchen token={token} />}
      {page === "dashboard" && canViewDashboard && (
        <Dashboard token={token} />
      )}
      {page === "users" && canManageUsers && <Users token={token} />}
      {page === "menu" && canEditMenu && <MenuManager token={token} />}
      {page === "qr" && (isAdmin || canEditMenu) && <TableQR />}
    </div>
  );
}

export default App;
