"use client";

import { useEffect, useMemo, useState } from "react";
import { getStockMovements, DBStockMovement } from "@/lib/dbActions";

export default function StockMovementsView() {
  const [movements, setMovements] = useState<DBStockMovement[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<"All" | "In" | "Out">("All");

  const loadMovements = async () => {
    setLoading(true);
    try {
      const data = await getStockMovements(search, typeFilter);
      setMovements(data);
    } catch (err) {
      console.error("Failed to load stock movements:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      void loadMovements();
    }, 300);
    return () => clearTimeout(timer);
  }, [search, typeFilter]);

  // Aggregate metrics
  const stats = useMemo(() => {
    let totalIn = 0;
    let totalOut = 0;
    movements.forEach((m) => {
      if (m.movementType === "In") {
        totalIn += Math.abs(m.qty);
      } else {
        totalOut += Math.abs(m.qty);
      }
    });
    return { totalIn, totalOut };
  }, [movements]);

  // Export plain-text log summary
  const handleExportLedger = () => {
    if (movements.length === 0) {
      alert("ไม่มีประวัติข้อมูลที่จะส่งออก");
      return;
    }
    const textLines = [
      `📊 สมุดบัญชีประวัติรับเข้า-เบิกออกสินค้า MeeStock`,
      `สรุป ณ วันที่: ${new Date().toLocaleDateString("th-TH")} ${new Date().toLocaleTimeString("th-TH")}`,
      `จำนวนรายการทั้งหมด: ${movements.length} รายการ | รับเข้าสะสม: +${stats.totalIn} ชิ้น | เบิกออกสะสม: -${stats.totalOut} ชิ้น`,
      `=========================================`,
      "",
    ];

    movements.forEach((m, index) => {
      const typeText = m.movementType === "In" ? "[รับเข้า]" : "[เบิกออก]";
      const qtySign = m.movementType === "In" ? `+${m.qty}` : `-${Math.abs(m.qty)}`;
      const reasonText = m.reason === "manual_adjust" ? "ปรับสต็อกด้วยตนเอง" : m.reason;

      textLines.push(
        `${index + 1}) วันที่: ${m.createdAt}`,
        `   สินค้า: ${m.productName} (SKU: ${m.sku})`,
        `   ประเภทรายการ: ${typeText} | จำนวน: ${qtySign} ชิ้น`,
        `   เหตุผล: ${reasonText}`,
        `-----------------------------------------`
      );
    });

    const exportText = textLines.join("\n");
    void navigator.clipboard.writeText(exportText).then(() => {
      alert("คัดลอกรายงานประวัติสต็อกไปยัง Clipboard สำเร็จ! คุณสามารถนำไปบันทึกหรือส่งต่อได้ทันที");
    });
  };

  return (
    <div className="space-y-6">
      {/* Header and Quick Stats */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 tracking-tight">ประวัติการรับเข้า-เบิกออกสินค้า</h1>
          <p className="text-slate-500 text-sm">
            ตรวจสอบความเคลื่อนไหวสต็อกสินค้าคงคลัง การปรับปรุงสต็อกด้วยมือ และประวัติการบันทึกรายการสินค้า
          </p>
        </div>

        {/* Global actions */}
        <div className="flex items-center gap-3">
          <button
            onClick={handleExportLedger}
            className="py-2.5 px-4 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 active:scale-95 text-slate-600 text-xs font-semibold shadow-sm transition-all flex items-center gap-1.5"
          >
            <svg className="w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" />
            </svg>
            ส่งออกสมุดบัญชีสต็อก
          </button>

          <button
            onClick={loadMovements}
            className="p-2.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 active:scale-95 text-slate-500 transition-all shadow-sm"
            title="รีเฟรชข้อมูล"
          >
            <svg className={`w-4 h-4 ${loading ? "animate-spin text-indigo-500" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 1121.21 7.89" />
            </svg>
          </button>
        </div>
      </div>

      {/* Metrics Card Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Total In */}
        <div className="rounded-3xl border border-slate-200 bg-gradient-to-br bg-white p-5 shadow-sm hover:shadow transition-all duration-300 from-emerald-500/5 to-emerald-600/5 border-emerald-100/70 text-emerald-600">
          <div className="flex justify-between items-start">
            <div className="space-y-2">
              <p className="text-xxs font-semibold text-slate-400 uppercase tracking-wider">จำนวนสินค้ารับเข้ารวม</p>
              <div className="flex items-baseline gap-1.5">
                <span className="text-3xl font-extrabold text-slate-800 tracking-tight">+{stats.totalIn}</span>
                <span className="text-xs font-semibold text-slate-500">ชิ้น</span>
              </div>
            </div>
            <div className="p-2.5 rounded-xl bg-white border border-slate-100 shadow-sm text-emerald-600">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 11l3-3m0 0l3 3m-3-3v8m0-13a9 9 0 110 18 9 9 0 010-18z" />
              </svg>
            </div>
          </div>
          <div className="mt-4 pt-3 border-t border-slate-100/60 flex items-center justify-between text-xxs font-semibold text-slate-400">
            <span>สต็อกนำเข้ายอดรวมสะสม</span>
          </div>
        </div>

        {/* Total Out */}
        <div className="rounded-3xl border border-slate-200 bg-gradient-to-br bg-white p-5 shadow-sm hover:shadow transition-all duration-300 from-rose-500/5 to-rose-600/5 border-rose-100/70 text-rose-600">
          <div className="flex justify-between items-start">
            <div className="space-y-2">
              <p className="text-xxs font-semibold text-slate-400 uppercase tracking-wider">จำนวนสินค้าเบิกออกรวม</p>
              <div className="flex items-baseline gap-1.5">
                <span className="text-3xl font-extrabold text-slate-800 tracking-tight">-{stats.totalOut}</span>
                <span className="text-xs font-semibold text-slate-500">ชิ้น</span>
              </div>
            </div>
            <div className="p-2.5 rounded-xl bg-white border border-slate-100 shadow-sm text-rose-600">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 13l-3 3m0 0l-3-3m3 3V8m0-5a9 9 0 110 18 9 9 0 010-18z" />
              </svg>
            </div>
          </div>
          <div className="mt-4 pt-3 border-t border-slate-100/60 flex items-center justify-between text-xxs font-semibold text-slate-400">
            <span>สต็อกเบิกจำหน่ายและตัดยอดสะสม</span>
          </div>
        </div>
      </div>

      {/* Control Box: Search & Filters */}
      <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-center">
          {/* Search bar */}
          <div className="md:col-span-6 relative">
            <input
              type="text"
              className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-xs transition-all"
              placeholder="ค้นหาชื่อสินค้า, SKU, บาร์โค้ด หรือ เหตุผลปรับสต็อก..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            <div className="absolute left-3.5 top-3 text-slate-400">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
          </div>

          {/* Status Switches */}
          <div className="md:col-span-6 flex flex-wrap gap-2 md:justify-end">
            {(["All", "In", "Out"] as const).map((t) => {
              const label = t === "All" ? "ประเภททั้งหมด" : t === "In" ? "📥 รับสินค้าเข้า" : "📤 เบิกสินค้าออก";
              const isActive = typeFilter === t;
              let activeStyle = "bg-indigo-50/80 text-indigo-600 shadow-sm shadow-indigo-100/50";
              if (t === "In" && isActive) activeStyle = "bg-emerald-50 text-emerald-700 shadow-sm ring-1 ring-emerald-600/10";
              if (t === "Out" && isActive) activeStyle = "bg-rose-50 text-rose-700 shadow-sm ring-1 ring-rose-600/10";

              return (
                <button
                  key={t}
                  onClick={() => setTypeFilter(t)}
                  className={`px-4 py-2 text-xs font-semibold rounded-full border border-slate-200 transition-all ${
                    isActive ? activeStyle : "bg-white text-slate-500 hover:bg-slate-50"
                  }`}
                >
                  {label}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Database movements ledgers presentation */}
      <div className="rounded-3xl border border-slate-200 bg-white overflow-hidden shadow-sm">
        {loading ? (
          <div className="p-16 flex flex-col items-center justify-center gap-3">
            <svg className="animate-spin h-8 w-8 text-indigo-600" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
            <p className="text-xs font-semibold text-slate-400">กำลังดึงประวัติการทำรายการสต็อก...</p>
          </div>
        ) : (
          <>
            {/* Desktop custom table */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full border-collapse text-left">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50/70 text-slate-500 text-xxs font-bold uppercase tracking-wider">
                    <th className="px-6 py-4">วัน-เวลาทำรายการ</th>
                    <th className="px-6 py-4">รหัส SKU</th>
                    <th className="px-6 py-4">บาร์โค้ด</th>
                    <th className="px-6 py-4">ชื่อสินค้า</th>
                    <th className="px-6 py-4 text-center">ประเภท</th>
                    <th className="px-6 py-4 text-right">จำนวนสินค้า</th>
                    <th className="px-6 py-4">เหตุผลทำรายการ</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700 text-sm">
                  {movements.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-6 py-16 text-center text-slate-400 text-xs">
                        ไม่พบบันทึกประวัติการปรับปรุงสต็อก (รับเข้า-เบิกออก) ในระบบ
                      </td>
                    </tr>
                  ) : (
                    movements.map((m) => {
                      const isIn = m.movementType === "In";
                      const reasonText = m.reason === "manual_adjust" ? "ปรับสต็อกแบบแมนนวล" : m.reason;
                      return (
                        <tr key={m.id} className="hover:bg-slate-50/40 transition-colors">
                          <td className="px-6 py-4 text-xs font-medium text-slate-500">{m.createdAt}</td>
                          <td className="px-6 py-4 font-mono text-xs font-semibold text-slate-600">{m.sku}</td>
                          <td className="px-6 py-4 font-mono text-xs text-slate-500">{m.barcode}</td>
                          <td className="px-6 py-4 font-semibold text-slate-800">{m.productName}</td>
                          <td className="px-6 py-4 text-center">
                            <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                              isIn 
                                ? "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-600/10" 
                                : "bg-rose-50 text-rose-700 ring-1 ring-rose-600/10"
                            }`}>
                              {isIn ? "📥 รับเข้า" : "📤 เบิกออก"}
                            </span>
                          </td>
                          <td className={`px-6 py-4 text-right font-bold ${isIn ? "text-emerald-600" : "text-rose-600"}`}>
                            {isIn ? `+${m.qty}` : `-${Math.abs(m.qty)}`}
                          </td>
                          <td className="px-6 py-4 text-xs text-slate-500 font-medium">
                            <span className="bg-slate-100/80 px-2.5 py-1 rounded-md text-slate-600 border border-slate-200/50">
                              {reasonText}
                            </span>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* Mobile custom cards layout */}
            <div className="block md:hidden p-4 space-y-4 bg-slate-50/50">
              {movements.length === 0 ? (
                <p className="text-center text-slate-400 text-xs py-8">ไม่พบประวัติรายการสินค้าคงคลัง</p>
              ) : (
                movements.map((m) => {
                  const isIn = m.movementType === "In";
                  const reasonText = m.reason === "manual_adjust" ? "ปรับสต็อกแบบแมนนวล" : m.reason;
                  return (
                    <div key={m.id} className="rounded-2xl bg-white border border-slate-100 p-4 shadow-sm space-y-3">
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="text-xxs text-slate-400 font-medium">{m.createdAt}</p>
                          <h4 className="font-bold text-slate-800 text-sm mt-0.5">{m.productName}</h4>
                          <p className="text-xxs font-mono text-slate-400">SKU: {m.sku} | Bar: {m.barcode}</p>
                        </div>
                        <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xxs font-bold ${
                          isIn ? "bg-emerald-50 text-emerald-700" : "bg-rose-50 text-rose-700"
                        }`}>
                          {isIn ? "📥 รับเข้า" : "📤 เบิกออก"}
                        </span>
                      </div>

                      <div className="border-t border-slate-100/70 pt-2.5 flex items-center justify-between">
                        <div className="space-y-0.5">
                          <p className="text-xxs text-slate-400">เหตุผล</p>
                          <span className="text-xxs text-slate-500 font-semibold">{reasonText}</span>
                        </div>
                        <div className="text-right">
                          <p className="text-xxs text-slate-400">จำนวนที่ขยับ</p>
                          <span className={`text-sm font-bold ${isIn ? "text-emerald-600" : "text-rose-600"}`}>
                            {isIn ? `+${m.qty}` : `-${Math.abs(m.qty)}`} ชิ้น
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
