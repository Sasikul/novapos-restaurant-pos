export default function MenuCard({ item, onAdd }) {
  return (
    <button
      onClick={() => onAdd(item)}
      disabled={item.available === false}
      className="rounded-lg border border-emerald-100 bg-white p-4 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-teal-300 hover:shadow-md disabled:cursor-not-allowed disabled:opacity-45"
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-slate-900">{item.name}</h2>
          <p className="mt-1 text-sm text-slate-500">
            {item.category || "ไม่ระบุหมวดหมู่"}
          </p>
          <p className="mt-1 text-xs font-semibold text-teal-700">
            {item.station || "ครัวทั่วไป"}
          </p>
        </div>
        <p className="rounded-md bg-teal-50 px-2 py-1 text-sm font-bold text-teal-800 ring-1 ring-teal-100">
          {Number(item.price || 0).toLocaleString()} บาท
        </p>
      </div>
      {item.available === false ? (
        <p className="mt-4 text-sm font-semibold text-rose-600">เมนูหมด</p>
      ) : (
        <p className="mt-4 text-sm font-semibold text-teal-700">
          แตะเพื่อเพิ่ม
        </p>
      )}
    </button>
  );
}
