// Decorative product mockups drawn with HTML/SVG. They show the real layout of the app
// with sample content, so every one is hidden from assistive technology.

const INK = "#173d42";
const MINT = "#a8e6cb";

function WindowFrame({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <div
      aria-hidden="true"
      className={`overflow-hidden rounded-2xl border border-white/20 bg-white text-slate-900 shadow-2xl shadow-black/30 ${className}`}
    >
      <div className="flex items-center gap-1.5 border-b border-slate-100 bg-slate-50 px-3 py-2">
        <span className="h-2 w-2 rounded-full bg-rose-300" />
        <span className="h-2 w-2 rounded-full bg-amber-300" />
        <span className="h-2 w-2 rounded-full bg-emerald-300" />
        <span className="ml-3 h-4 w-40 rounded-full bg-slate-200/70" />
      </div>
      {children}
    </div>
  );
}

function SidebarMock() {
  return (
    <div className="flex w-14 shrink-0 flex-col items-center gap-3 py-3" style={{ background: INK }}>
      <span className="h-6 w-6 rounded-lg" style={{ background: MINT }} />
      {[0, 1, 2, 3, 4].map((i) => (
        <span key={i} className={`h-5 w-5 rounded-md ${i === 1 ? "" : "bg-white/20"}`} style={i === 1 ? { background: MINT } : undefined} />
      ))}
    </div>
  );
}

export function DashboardMock({ className = "" }: { className?: string }) {
  return (
    <WindowFrame className={className}>
      <div className="flex">
        <SidebarMock />
        <div className="min-w-0 flex-1 space-y-3 bg-[#f1f5f3] p-4">
          <div className="grid grid-cols-3 gap-2">
            {[
              { l: "ยอดขายสะสม", v: "฿ 128,450", dark: true },
              { l: "สินค้าทั้งหมด", v: "246" },
              { l: "สต็อกต่ำ", v: "7", warn: true },
            ].map((k) => (
              <div
                key={k.l}
                className={`rounded-xl p-2.5 ${k.dark ? "text-white" : "bg-white"}`}
                style={k.dark ? { background: INK } : undefined}
              >
                <p className={`text-[9px] ${k.dark ? "text-white/60" : "text-slate-500"}`}>{k.l}</p>
                <p className={`mt-1 text-base font-extrabold tabular-nums ${k.warn ? "text-rose-600" : ""}`}>{k.v}</p>
              </div>
            ))}
          </div>
          <div className="rounded-xl bg-white p-3">
            <p className="text-[10px] font-bold text-slate-700">ยอดขายรายวัน</p>
            <svg viewBox="0 0 300 90" className="mt-1 h-24 w-full" preserveAspectRatio="none">
              <defs>
                <linearGradient id="mock-area" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#34b38f" stopOpacity="0.35" />
                  <stop offset="100%" stopColor="#34b38f" stopOpacity="0" />
                </linearGradient>
              </defs>
              <path d="M0 70 C25 62 40 40 65 48 S110 78 135 52 S185 18 215 30 S270 44 300 14 L300 90 L0 90Z" fill="url(#mock-area)" />
              <path
                d="M0 70 C25 62 40 40 65 48 S110 78 135 52 S185 18 215 30 S270 44 300 14"
                fill="none"
                stroke="#0f766e"
                strokeWidth="2.5"
                strokeLinecap="round"
                className="landing-draw"
              />
            </svg>
          </div>
          <div className="grid grid-cols-4 gap-2">
            {[
              ["เตรียมจัดส่ง", "bg-amber-50 text-amber-700"],
              ["จัดส่งแล้ว", "bg-emerald-50 text-emerald-700"],
              ["คืนสินค้า", "bg-slate-100 text-slate-600"],
              ["ยกเลิก", "bg-rose-50 text-rose-700"],
            ].map(([l, c]) => (
              <div key={l} className={`rounded-lg px-2 py-1.5 text-[9px] font-semibold ${c}`}>
                {l}
              </div>
            ))}
          </div>
        </div>
      </div>
    </WindowFrame>
  );
}

export function PhoneMock({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <div
      aria-hidden="true"
      className={`relative w-[220px] rounded-[2rem] border-[6px] border-[#0d1c1e] bg-white text-slate-900 shadow-2xl shadow-black/40 ${className}`}
    >
      <div className="absolute left-1/2 top-1.5 z-10 h-4 w-16 -translate-x-1/2 rounded-full bg-[#0d1c1e]" />
      <div className="overflow-hidden rounded-[1.5rem]">{children}</div>
    </div>
  );
}

export function PosPhoneScreen() {
  return (
    <div className="flex h-[400px] flex-col bg-[#f1f5f3]">
      <div className="px-3 pb-2 pt-7 text-[11px] font-bold">จ่ายสินค้า</div>
      <div className="mx-3 rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-[10px] text-slate-400">ค้นหา / สแกนบาร์โค้ด…</div>
      <div className="mx-3 mt-2 space-y-1.5">
        {[
          ["Razer BlackShark V2", "฿6,490"],
          ["Logitech G Pro X", "฿4,990"],
          ["Keychron Q1 Pro", "฿6,990"],
        ].map(([n, p]) => (
          <div key={n} className="flex items-center justify-between rounded-lg bg-white p-2 text-[10px]">
            <span className="flex items-center gap-1.5 font-semibold">
              <span className="h-6 w-6 rounded-md bg-slate-200" />
              {n}
            </span>
            <span className="font-bold tabular-nums">{p}</span>
          </div>
        ))}
      </div>
      <div className="mx-3 mt-auto rounded-xl p-2.5 text-white" style={{ background: INK }}>
        <div className="flex justify-between text-[10px] text-white/70">
          <span>ยอดรวมสุทธิ</span>
          <span>3 รายการ</span>
        </div>
        <div className="text-lg font-extrabold tabular-nums">฿18,470</div>
        <div className="mt-1.5 rounded-lg py-1.5 text-center text-[10px] font-bold text-[#173d42]" style={{ background: MINT }}>
          บันทึกการขาย
        </div>
      </div>
      <div className="mt-2 grid grid-cols-5 border-t border-slate-200 bg-white py-1.5">
        {[0, 1, 2, 3, 4].map((i) => (
          <span key={i} className={`mx-auto h-3.5 w-3.5 rounded ${i === 2 ? "" : "bg-slate-200"}`} style={i === 2 ? { background: INK } : undefined} />
        ))}
      </div>
    </div>
  );
}

export function ScanPhoneScreen() {
  return (
    <div className="relative flex h-[400px] flex-col items-center justify-center bg-[#0d1c1e]">
      <p className="absolute top-8 text-[11px] font-bold text-white">สแกนบาร์โค้ด</p>
      <div className="relative h-36 w-44">
        {["left-0 top-0 border-l-2 border-t-2", "right-0 top-0 border-r-2 border-t-2", "bottom-0 left-0 border-b-2 border-l-2", "bottom-0 right-0 border-b-2 border-r-2"].map((c) => (
          <span key={c} className={`absolute h-6 w-6 rounded-sm ${c}`} style={{ borderColor: MINT }} />
        ))}
        <div className="absolute inset-x-3 top-1/2 flex h-14 -translate-y-1/2 items-stretch gap-[2px]">
          {BARCODE.map((w, i) => (
            <span key={i} className="bg-white/80" style={{ width: w }} />
          ))}
        </div>
        <span className="landing-scan absolute inset-x-1 h-0.5 rounded-full" style={{ background: MINT, boxShadow: `0 0 12px ${MINT}` }} />
      </div>
      <p className="absolute bottom-10 px-6 text-center text-[10px] text-white/70">วางบาร์โค้ดให้อยู่ในกรอบ ระบบเพิ่มเข้าตะกร้าให้อัตโนมัติ</p>
    </div>
  );
}

// Deterministic bar widths so the server and client markup match
const BARCODE = [2, 1, 3, 1, 2, 2, 1, 3, 2, 1, 1, 3, 1, 2, 3, 1, 2, 1, 1, 3, 2, 1, 2, 3, 1, 1, 2, 2, 1, 3, 1, 2];

export function LabelMock({ className = "" }: { className?: string }) {
  return (
    <div aria-hidden="true" className={`w-[200px] rounded-xl bg-white p-3 text-slate-900 shadow-2xl shadow-black/30 ${className}`}>
      <div className="flex items-center justify-between border-b-2 border-slate-900 pb-1.5">
        <span className="text-[11px] font-extrabold" style={{ color: INK }}>MEESTOCK</span>
        <span className="rounded bg-slate-900 px-1.5 py-0.5 text-[8px] font-bold text-white">100×150</span>
      </div>
      <p className="mt-2 text-[8px] font-bold text-slate-500">TO</p>
      <p className="text-xs font-extrabold">นายสมชาย ใจดี</p>
      <p className="text-[10px] font-semibold tabular-nums">081-234-5678</p>
      <p className="mt-0.5 text-[9px] leading-snug text-slate-600">1/99 ซอย 3 ถนนพหลโยธิน แขวงจอมพล เขตจตุจักร กรุงเทพ 10900</p>
      <div className="mt-2.5 flex h-10 items-stretch justify-center gap-[1.5px]">
        {BARCODE.map((w, i) => (
          <span key={i} className="bg-slate-900" style={{ width: w }} />
        ))}
      </div>
      <p className="mt-1 text-center font-mono text-[8px] tracking-widest text-slate-500">MS-202610190001</p>
    </div>
  );
}

export function PosMock({ className = "" }: { className?: string }) {
  return (
    <WindowFrame className={className}>
      <div className="grid gap-3 bg-[#f1f5f3] p-4 sm:grid-cols-[1.4fr_1fr]">
        <div className="space-y-2">
          <div className="relative">
            <div className="flex items-center justify-between rounded-lg border-2 bg-white px-3 py-2 text-[11px]" style={{ borderColor: "#0f766e" }}>
              <span className="font-semibold">razer<span className="landing-caret ml-px inline-block h-3 w-px bg-slate-700 align-middle" /></span>
              <kbd className="rounded border border-slate-300 bg-slate-50 px-1.5 text-[9px] font-bold text-slate-500">F2</kbd>
            </div>
            <div className="absolute inset-x-0 top-full z-10 mt-1 rounded-lg border border-slate-200 bg-white p-1 shadow-lg">
              <div className="flex items-center justify-between rounded-md px-2 py-1.5 text-[10px]" style={{ background: "#effaf6" }}>
                <span>
                  <b>Razer BlackShark V2 Pro</b>
                  <span className="block font-mono text-[8px] text-slate-400">ACC-RAZ-BSV2P</span>
                </span>
                <span className="text-slate-500">คงเหลือ 35</span>
              </div>
              <div className="flex items-center justify-between px-2 py-1.5 text-[10px] text-slate-500">
                <span>Razer Huntsman V3</span>
                <span>คงเหลือ 12</span>
              </div>
            </div>
          </div>
          <div className="space-y-1.5 pt-12">
            {[
              ["Logitech G Pro X Superlight 2", 1, "฿4,990"],
              ["Keychron Q1 Pro Wireless", 2, "฿13,980"],
            ].map(([n, q, p]) => (
              <div key={String(n)} className="flex items-center justify-between rounded-lg bg-white px-2.5 py-2 text-[10px]">
                <span className="font-semibold">{n}</span>
                <span className="flex items-center gap-3 tabular-nums">
                  <span className="rounded bg-slate-100 px-1.5">× {q}</span>
                  <b>{p}</b>
                </span>
              </div>
            ))}
          </div>
        </div>
        <div className="flex flex-col justify-between rounded-xl p-3 text-white" style={{ background: INK }}>
          <div className="space-y-1 text-[10px] text-white/70">
            <div className="flex justify-between"><span>รวมก่อนส่วนลด</span><span className="tabular-nums">฿18,970</span></div>
            <div className="flex justify-between"><span>ส่วนลด</span><span className="tabular-nums">฿500</span></div>
          </div>
          <div>
            <p className="text-[10px] text-white/60">ยอดรวมสุทธิ</p>
            <p className="text-2xl font-extrabold tabular-nums">฿18,470</p>
            <div className="mt-2 rounded-lg py-2 text-center text-[11px] font-bold" style={{ background: MINT, color: INK }}>บันทึกการขาย</div>
          </div>
        </div>
      </div>
    </WindowFrame>
  );
}

export function StockMock({ className = "" }: { className?: string }) {
  const rows = [
    { n: "SSD Samsung 990 Pro 2TB", lot: "LOT-2610-A", q: 60, max: 80, tone: "bg-emerald-500" },
    { n: "RAM Corsair Dominator 32GB", lot: "LOT-2609-C", q: 40, max: 80, tone: "bg-emerald-500" },
    { n: "Elgato Stream Deck MK.2", lot: "LOT-2608-B", q: 6, max: 80, tone: "bg-rose-500", low: true },
    { n: "Keychron Q1 Pro", lot: "LOT-2610-D", q: 22, max: 80, tone: "bg-amber-500", exp: "หมดอายุ 30 วัน" },
  ];
  return (
    <WindowFrame className={className}>
      <div className="space-y-2 bg-[#f1f5f3] p-4">
        {rows.map((r) => (
          <div key={r.n} className="rounded-xl bg-white p-3">
            <div className="flex items-center justify-between gap-2 text-[11px]">
              <span className="font-bold">{r.n}</span>
              <span className="flex items-center gap-1.5">
                {r.low && <span className="rounded-full bg-rose-50 px-2 py-0.5 text-[9px] font-bold text-rose-600">สต็อกต่ำ</span>}
                {r.exp && <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[9px] font-bold text-amber-700">{r.exp}</span>}
                <span className="font-mono text-[9px] text-slate-400">{r.lot}</span>
              </span>
            </div>
            <div className="mt-2 flex items-center gap-2">
              <div className="h-1.5 flex-1 rounded-full bg-slate-100">
                <div className={`h-1.5 rounded-full ${r.tone}`} style={{ width: `${(r.q / r.max) * 100}%` }} />
              </div>
              <span className="w-10 text-right text-[10px] font-bold tabular-nums">{r.q} ชิ้น</span>
            </div>
          </div>
        ))}
      </div>
    </WindowFrame>
  );
}

export function RoleMock({ className = "" }: { className?: string }) {
  const rows = [
    ["Razer BlackShark V2", "฿6,490", "฿4,900", "฿1,590"],
    ["Logitech G Pro X", "฿4,990", "฿3,800", "฿1,190"],
    ["Keychron Q1 Pro", "฿6,990", "฿5,200", "฿1,790"],
  ];
  return (
    <div aria-hidden="true" className={`grid gap-3 sm:grid-cols-2 ${className}`}>
      {[
        { title: "เจ้าของร้าน", admin: true },
        { title: "พนักงาน", admin: false },
      ].map((v) => (
        <div key={v.title} className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl">
          <div className="flex items-center justify-between px-3 py-2 text-[11px] font-bold" style={v.admin ? { background: INK, color: "white" } : { background: "#f1f5f3" }}>
            {v.title}
            <span className="rounded-full px-2 py-0.5 text-[9px]" style={v.admin ? { background: MINT, color: INK } : { background: "#e2e8f0" }}>
              {v.admin ? "Admin" : "Staff"}
            </span>
          </div>
          <table className="w-full text-[10px]">
            <thead>
              <tr className="text-left text-slate-400">
                <th className="px-3 py-1.5 font-medium">สินค้า</th>
                <th className="px-1 py-1.5 font-medium">ราคาขาย</th>
                <th className="px-1 py-1.5 font-medium">ทุน</th>
                <th className="px-3 py-1.5 font-medium">กำไร</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r[0]} className="border-t border-slate-100">
                  <td className="px-3 py-2 font-semibold">{r[0]}</td>
                  <td className="px-1 py-2 tabular-nums">{r[1]}</td>
                  <td className="px-1 py-2 tabular-nums">{v.admin ? r[2] : <span className="inline-block h-2 w-8 rounded bg-slate-200" />}</td>
                  <td className="px-3 py-2 font-bold tabular-nums text-emerald-700">{v.admin ? r[3] : <span className="inline-block h-2 w-8 rounded bg-slate-200" />}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ))}
    </div>
  );
}
