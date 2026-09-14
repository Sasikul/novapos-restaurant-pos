const tableCount = 20;

const buildOrderUrl = (table) => {
  const url = new URL(window.location.origin);
  url.searchParams.set("customer", "1");
  url.searchParams.set("table", String(table));
  return url.toString();
};

const buildQrUrl = (table) => {
  const orderUrl = buildOrderUrl(table);
  return `https://api.qrserver.com/v1/create-qr-code/?size=220x220&margin=12&data=${encodeURIComponent(
    orderUrl
  )}`;
};

export default function TableQR() {
  const tables = Array.from({ length: tableCount }, (_, index) => index + 1);

  return (
    <main className="mx-auto max-w-7xl px-4 py-6">
      <style>
        {`
          @media print {
            header, .qr-no-print { display: none !important; }
            body { background: white !important; }
            .qr-grid { grid-template-columns: repeat(2, minmax(0, 1fr)) !important; }
            .qr-card { break-inside: avoid; box-shadow: none !important; }
          }
        `}
      </style>

      <div className="qr-no-print mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">QR สั่งอาหารรายโต๊ะ</h1>
          <p className="mt-1 text-slate-500">
            พิมพ์ QR แล้วติดไว้ที่โต๊ะ ลูกค้าสแกนเพื่อเปิดเมนูและส่งออเดอร์เข้า POS
          </p>
        </div>
        <button
          onClick={() => window.print()}
          className="rounded-md bg-teal-700 px-4 py-2 font-bold text-white shadow-sm hover:bg-teal-800"
        >
          พิมพ์ QR
        </button>
      </div>

      <div className="qr-grid grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {tables.map((table) => {
          const orderUrl = buildOrderUrl(table);

          return (
            <article
              key={table}
              className="qr-card rounded-md border border-emerald-100 bg-white p-5 text-center shadow-sm"
            >
              <p className="text-sm font-bold text-teal-700">NovaPOS QR Order</p>
              <h2 className="mt-1 text-4xl font-black">โต๊ะ {table}</h2>
              <img
                src={buildQrUrl(table)}
                alt={`QR โต๊ะ ${table}`}
                className="mx-auto mt-4 h-56 w-56 rounded-md border border-slate-200 bg-white p-2"
              />
              <p className="mt-4 break-all text-xs text-slate-500">{orderUrl}</p>
              <p className="mt-3 text-sm font-semibold text-slate-700">
                สแกนเพื่อสั่งอาหารจากโต๊ะนี้
              </p>
            </article>
          );
        })}
      </div>
    </main>
  );
}
