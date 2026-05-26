"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import * as XLSX from "xlsx";
import {
  getInventoryReport,
  getProfitReport,
  getSlowMovingItems,
  getExpiringItems,
  DBProduct,
  DBProfitReportRow,
  DBSlowMovingRow,
  DBExpiringRow,
} from "@/lib/dbActions";

type ReportTab = "inventory" | "profit" | "best" | "slow" | "expiry";

export default function ReportsView({ isAdmin = true }: { isAdmin?: boolean }) {
  const [activeTab, setActiveTab] = useState<ReportTab>("inventory");
  const [loading, setLoading] = useState(true);
  const [isPending, startTransition] = useTransition();

  // Report States
  const [inventory, setInventory] = useState<DBProduct[]>([]);
  const [profit, setProfit] = useState<DBProfitReportRow[]>([]);
  const [slowMoving, setSlowMoving] = useState<DBSlowMovingRow[]>([]);
  const [expiring, setExpiring] = useState<DBExpiringRow[]>([]);

  // Slow moving days control
  const [slowDays, setSlowDays] = useState(30);
  // Expiry days control
  const [expiryDays, setExpiryDays] = useState(30);

  const loadReportData = async () => {
    setLoading(true);
    try {
      if (activeTab === "inventory") {
        const data = await getInventoryReport();
        setInventory(data);
      } else if (activeTab === "profit") {
        const data = await getProfitReport();
        setProfit(data);
      } else if (activeTab === "slow") {
        const data = await getSlowMovingItems(slowDays);
        setSlowMoving(data);
      } else if (activeTab === "expiry") {
        const data = await getExpiringItems(expiryDays);
        setExpiring(data);
      }
    } catch (err) {
      console.error("Failed to load report data:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadReportData();
  }, [activeTab, slowDays, expiryDays]);

  // Top 10 Best Sellers derived from Profit report
  const bestSellers = useMemo(() => {
    // If profit report is loaded, sort by qtySold desc and take top 10
    return [...profit].sort((a, b) => b.qtySold - a.qtySold).slice(0, 10);
  }, [profit]);

  // Excel Export Logic
  const handleExportExcel = (data: any[], fileName: string) => {
    if (data.length === 0) {
      alert("ไม่มีข้อมูลที่จะส่งออก");
      return;
    }
    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "รายงาน MeeStock");
    XLSX.writeFile(workbook, `${fileName}.xlsx`);
  };

  const exportInventory = () => {
    // Format data for export (remove internal columns if Staff)
    const exportData = inventory.map((p) => {
      const row: any = {
        "SKU": p.sku,
        "บาร์โค้ด": p.barcode,
        "ชื่อสินค้า": p.name,
        "หมวดหมู่": p.categoryName || "ไม่ระบุ",
        "ราคาขาย": p.unitPrice,
        "สต็อกคงเหลือ": p.stockQty,
        "หน่วยนับ": p.unit,
        "ระดับแจ้งเตือนขั้นต่ำ": p.lowStockThreshold,
        "สถานะ": p.status === "active" ? "ใช้งาน" : p.status === "inactive" ? "ปิดใช้งาน" : "ยกเลิก",
      };
      if (isAdmin) {
        row["ราคาทุน"] = p.costPrice;
        row["มูลค่าคลังสินค้า (ราคาทุน)"] = p.costPrice * p.stockQty;
      }
      return row;
    });
    handleExportExcel(exportData, `รายงานสต็อกคงเหลือ_${new Date().toISOString().slice(0, 10)}`);
  };

  const exportProfit = () => {
    const exportData = profit.map((p) => {
      const row: any = {
        "SKU": p.sku,
        "ชื่อสินค้า": p.productName,
        "จำนวนที่ขายได้": p.qtySold,
        "ยอดขายรวม (THB)": p.salesTotal,
      };
      if (isAdmin) {
        row["ต้นทุนรวม (THB)"] = p.costTotal;
        row["กำไรรวม (THB)"] = p.profit;
      }
      return row;
    });
    handleExportExcel(exportData, `รายงานกำไรขาดทุน_${new Date().toISOString().slice(0, 10)}`);
  };

  const exportBest = () => {
    const exportData = bestSellers.map((p, idx) => ({
      "อันดับ": idx + 1,
      "SKU": p.sku,
      "ชื่อสินค้า": p.productName,
      "จำนวนชิ้นที่ขายได้": p.qtySold,
      "ยอดรวมยอดขาย (THB)": p.salesTotal,
    }));
    handleExportExcel(exportData, `รายงานสินค้าขายดี_${new Date().toISOString().slice(0, 10)}`);
  };

  const exportSlow = () => {
    const exportData = slowMoving.map((p) => {
      const row: any = {
        "SKU": p.sku,
        "ชื่อสินค้า": p.name,
        "สต็อกคงเหลือ": p.stockQty,
        "หน่วยนับ": p.unit,
        "ราคาขาย": p.unitPrice,
        "การเคลื่อนไหวล่าสุด": p.lastMovement || "ไม่มีการบันทึกประวัติการเดินสต็อก",
      };
      if (isAdmin) {
        row["ราคาทุน"] = p.costPrice;
      }
      return row;
    });
    handleExportExcel(exportData, `รายงานสินค้าขายช้า_${new Date().toISOString().slice(0, 10)}`);
  };

  const exportExpiry = () => {
    const exportData = expiring.map((p) => ({
      "Lot Number": p.lotNo || "ไม่ระบุ",
      "วันหมดอายุ": p.expiryDate,
      "SKU": p.sku,
      "ชื่อสินค้า": p.productName,
      "จำนวนคงค้าง": p.qty,
      "Supplier": p.supplierName || "ไม่ระบุ",
    }));
    handleExportExcel(exportData, `รายงานสินค้าใกล้หมดอายุ_${new Date().toISOString().slice(0, 10)}`);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 tracking-tight flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600 border border-indigo-100">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            </div>
            ระบบออกรายงานอัจฉริยะ (MeeStock Reports)
          </h1>
          <p className="text-slate-500 text-sm mt-1">ดูรายงานสต็อกคงคลัง กำไร-ขาดทุนเชิงลึก และส่งออกข้อมูล Excel จริงได้ทันที</p>
        </div>
      </div>

      {/* Reports tab navigation */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 border-b border-slate-200 pb-3">
        {[
          { tab: "inventory", label: "📦 สต็อกคงเหลือ", desc: "Inventory Snapshot" },
          { tab: "profit", label: "💵 กำไร-ขาดทุน", desc: "Profit & Loss" },
          { tab: "best", label: "🏆 สินค้าขายดี", desc: "Top 10 Sellers" },
          { tab: "slow", label: "⏸️ สินค้าขายช้า", desc: "Slow Moving" },
          { tab: "expiry", label: "⌛ ใกล้หมดอายุ", desc: "Expiring Lots" },
        ].map((t) => (
          <button
            key={t.tab}
            onClick={() => {
              setActiveTab(t.tab as ReportTab);
              // If best tab is clicked, trigger profit report loading to get its best sellers
              if (t.tab === "best" && profit.length === 0) {
                setActiveTab("profit");
                setTimeout(() => setActiveTab("best"), 50);
              }
            }}
            className={`py-3 px-4 rounded-2xl border text-center transition-all flex flex-col items-center justify-center gap-0.5 ${
              activeTab === t.tab
                ? "bg-indigo-600 text-white border-indigo-600 shadow-md shadow-indigo-100"
                : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50 hover:text-slate-800"
            }`}
          >
            <span className="text-xs font-bold">{t.label}</span>
            <span className={`text-[9px] uppercase tracking-wider ${activeTab === t.tab ? "text-indigo-200" : "text-slate-400"}`}>
              {t.desc}
            </span>
          </button>
        ))}
      </div>

      {/* Main Report Container */}
      <div className="rounded-3xl border border-slate-200 bg-white overflow-hidden shadow-sm">
        {/* Report Top Panel with Controls & Excel Export */}
        <div className="p-5 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-slate-50/50">
          <div>
            <h3 className="font-bold text-slate-800 text-base">
              {activeTab === "inventory" && "รายงานยอดสต็อกสินค้าคงคลังคงเหลือ"}
              {activeTab === "profit" && "รายงานต้นทุน-กำไรและการเงินสะสม"}
              {activeTab === "best" && "รายงานรายการสินค้าขายดีที่สุด 10 อันดับแรก"}
              {activeTab === "slow" && "รายงานสินค้าที่มีการหมุนเวียนคลังช้า"}
              {activeTab === "expiry" && "รายงานประวัติสินค้าคงคลังใกล้ถึงวันหมดอายุ"}
            </h3>
            <p className="text-slate-400 text-xs mt-0.5">
              {activeTab === "inventory" && "สรุปมูลค่าคลังสินค้า ราคาทุน และราคาขาย ณ วันปัจจุบัน"}
              {activeTab === "profit" && "สถิติวิเคราะห์กำไรขาดทุนจากการบันทึกจ่ายสต็อก/การขายจริง"}
              {activeTab === "best" && "สินค้าที่ได้รับความนิยมมียอดสั่งซื้อสูงสุดสะสมในระบบ"}
              {activeTab === "slow" && "สินค้าคงคลังที่ไม่มีการเดินยอดสต็อกหรือทำรายการเคลื่อนไหวใดๆ"}
              {activeTab === "expiry" && "ตรวจสอบ Lots รับเข้าเพื่อเตรียมความพร้อมระบายของก่อนหมดอายุ"}
            </p>
          </div>

          <div className="flex items-center gap-3">
            {/* Context Controls */}
            {activeTab === "slow" && (
              <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-600 bg-white px-3 py-1.5 rounded-xl border border-slate-200 shadow-sm">
                <span>ไม่ได้เคลื่อนไหวเกิน:</span>
                <select
                  className="bg-transparent font-bold text-slate-800 focus:outline-none cursor-pointer"
                  value={slowDays}
                  onChange={(e) => setSlowDays(Number(e.target.value))}
                >
                  <option value={15}>15 วัน</option>
                  <option value={30}>30 วัน</option>
                  <option value={60}>60 วัน</option>
                  <option value={90}>90 วัน</option>
                </select>
              </div>
            )}

            {activeTab === "expiry" && (
              <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-600 bg-white px-3 py-1.5 rounded-xl border border-slate-200 shadow-sm">
                <span>หมดอายุภายใน:</span>
                <select
                  className="bg-transparent font-bold text-slate-800 focus:outline-none cursor-pointer"
                  value={expiryDays}
                  onChange={(e) => setExpiryDays(Number(e.target.value))}
                >
                  <option value={15}>15 วัน</option>
                  <option value={30}>30 วัน</option>
                  <option value={60}>60 วัน</option>
                  <option value={90}>90 วัน</option>
                </select>
              </div>
            )}

            {/* Export buttons */}
            <button
              onClick={() => {
                if (activeTab === "inventory") exportInventory();
                else if (activeTab === "profit") exportProfit();
                else if (activeTab === "best") exportBest();
                else if (activeTab === "slow") exportSlow();
                else if (activeTab === "expiry") exportExpiry();
              }}
              className="py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shadow-sm transition-all active:scale-[0.98] flex items-center gap-1.5"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              ส่งออก Excel (.xlsx)
            </button>
          </div>
        </div>

        {/* Report Content Table */}
        {loading ? (
          <div className="p-20 flex flex-col items-center justify-center gap-3">
            <svg className="animate-spin h-8 w-8 text-indigo-600" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
            <p className="text-xs font-semibold text-slate-400">กำลังคำนวณและประมวลผลฐานข้อมูล...</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            {/* 1. Inventory snapshot report */}
            {activeTab === "inventory" && (
              <table className="w-full border-collapse text-left text-sm text-slate-700">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50/50 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                    <th className="px-6 py-4">SKU / บาร์โค้ด</th>
                    <th className="px-6 py-4">ชื่อสินค้า</th>
                    <th className="px-6 py-4">หมวดหมู่</th>
                    <th className="px-6 py-4 text-right">ราคาขาย</th>
                    {isAdmin && <th className="px-6 py-4 text-right">ราคาทุน</th>}
                    <th className="px-6 py-4 text-center">คงคลังคลังสินค้า</th>
                    {isAdmin && <th className="px-6 py-4 text-right">มูลค่ารวม (ทุน)</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {inventory.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-6 py-12 text-center text-slate-400 text-xs">ไม่พบข้อมูลสต็อก</td>
                    </tr>
                  ) : (
                    inventory.map((p) => (
                      <tr key={p.id} className="hover:bg-slate-50/30 transition-colors">
                        <td className="px-6 py-4">
                          <p className="font-mono text-xs font-semibold text-slate-700">{p.sku}</p>
                          <p className="font-mono text-[9px] text-slate-400">{p.barcode}</p>
                        </td>
                        <td className="px-6 py-4 font-semibold text-slate-800">{p.name}</td>
                        <td className="px-6 py-4">
                          {p.categoryName ? (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-50 text-indigo-600">
                              {p.categoryName}
                            </span>
                          ) : (
                            <span className="text-slate-300">—</span>
                          )}
                        </td>
                        <td className="px-6 py-4 text-right font-semibold">฿{p.unitPrice.toLocaleString()}</td>
                        {isAdmin && <td className="px-6 py-4 text-right text-indigo-600 font-mono text-xs">฿{p.costPrice.toLocaleString()}</td>}
                        <td className="px-6 py-4 text-center font-bold">{p.stockQty} {p.unit}</td>
                        {isAdmin && (
                          <td className="px-6 py-4 text-right font-bold text-slate-800 font-mono text-xs">
                            ฿{(p.costPrice * p.stockQty).toLocaleString()}
                          </td>
                        )}
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            )}

            {/* 2. Profit and loss report */}
            {activeTab === "profit" && (
              <table className="w-full border-collapse text-left text-sm text-slate-700">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50/50 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                    <th className="px-6 py-4">SKU / บาร์โค้ด</th>
                    <th className="px-6 py-4">ชื่อสินค้า</th>
                    <th className="px-6 py-4 text-center">จำนวนชิ้นที่ขาย</th>
                    <th className="px-6 py-4 text-right">ยอดรวมยอดขาย</th>
                    {isAdmin && <th className="px-6 py-4 text-right">ต้นทุนสะสม</th>}
                    {isAdmin && <th className="px-6 py-4 text-right">กำไรรวมสุทธิ</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {profit.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-6 py-12 text-center text-slate-400 text-xs">ยังไม่มีบันทึกข้อมูลการเงินจากการขาย</td>
                    </tr>
                  ) : (
                    profit.map((p, idx) => (
                      <tr key={idx} className="hover:bg-slate-50/30 transition-colors">
                        <td className="px-6 py-4 font-mono text-xs font-bold text-slate-600">{p.sku}</td>
                        <td className="px-6 py-4 font-semibold text-slate-800">{p.productName}</td>
                        <td className="px-6 py-4 text-center font-bold text-slate-600">{p.qtySold} ชิ้น</td>
                        <td className="px-6 py-4 text-right font-semibold text-indigo-600">฿{p.salesTotal.toLocaleString()}</td>
                        {isAdmin && <td className="px-6 py-4 text-right text-slate-500 font-mono text-xs">฿{p.costTotal.toLocaleString()}</td>}
                        {isAdmin && (
                          <td className={`px-6 py-4 text-right font-extrabold font-mono text-xs ${p.profit >= 0 ? "text-emerald-600" : "text-rose-600"}`}>
                            ฿{p.profit.toLocaleString()}
                          </td>
                        )}
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            )}

            {/* 3. Top 10 Best Sellers */}
            {activeTab === "best" && (
              <table className="w-full border-collapse text-left text-sm text-slate-700">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50/50 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                    <th className="px-6 py-4 text-center">อันดับ</th>
                    <th className="px-6 py-4">SKU</th>
                    <th className="px-6 py-4">ชื่อสินค้า</th>
                    <th className="px-6 py-4 text-center">จำนวนที่ขายได้</th>
                    <th className="px-6 py-4 text-right">ยอดรวมรายได้ขาย</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {bestSellers.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-6 py-12 text-center text-slate-400 text-xs">ยังไม่มีบันทึกข้อมูลสินค้า</td>
                    </tr>
                  ) : (
                    bestSellers.map((p, idx) => {
                      let badge = "bg-slate-100 text-slate-600";
                      if (idx === 0) badge = "bg-amber-100 text-amber-700 font-black shadow-sm";
                      if (idx === 1) badge = "bg-slate-200 text-slate-700 font-black";
                      if (idx === 2) badge = "bg-orange-100 text-orange-700 font-black";
                      return (
                        <tr key={idx} className="hover:bg-slate-50/30 transition-colors">
                          <td className="px-6 py-4 text-center">
                            <span className={`inline-flex items-center justify-center h-6 w-6 rounded-lg text-xxs font-bold ${badge}`}>
                              {idx + 1}
                            </span>
                          </td>
                          <td className="px-6 py-4 font-mono text-xs font-semibold text-slate-600">{p.sku}</td>
                          <td className="px-6 py-4 font-bold text-slate-800">{p.productName}</td>
                          <td className="px-6 py-4 text-center font-extrabold text-indigo-600">{p.qtySold} ชิ้น</td>
                          <td className="px-6 py-4 text-right font-bold text-slate-700">฿{p.salesTotal.toLocaleString()}</td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            )}

            {/* 4. Slow-moving items */}
            {activeTab === "slow" && (
              <table className="w-full border-collapse text-left text-sm text-slate-700">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50/50 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                    <th className="px-6 py-4">SKU / บาร์โค้ด</th>
                    <th className="px-6 py-4">ชื่อสินค้า</th>
                    <th className="px-6 py-4 text-center">คงค้างสต็อก</th>
                    <th className="px-6 py-4 text-right">ราคาขาย</th>
                    {isAdmin && <th className="px-6 py-4 text-right">ราคาทุน</th>}
                    <th className="px-6 py-4">วันที่มีความเคลื่อนไหวล่าสุด</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {slowMoving.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-6 py-12 text-center text-slate-400 text-xs">ยอดเยี่ยม! ทุกรหัสสินค้ามีการทำรายการปกติ</td>
                    </tr>
                  ) : (
                    slowMoving.map((p) => (
                      <tr key={p.id} className="hover:bg-slate-50/30 transition-colors">
                        <td className="px-6 py-4 font-mono text-xs font-semibold text-slate-600">{p.sku}</td>
                        <td className="px-6 py-4 font-semibold text-slate-800">{p.name}</td>
                        <td className="px-6 py-4 text-center font-bold text-slate-600">{p.stockQty} {p.unit}</td>
                        <td className="px-6 py-4 text-right font-semibold">฿{p.unitPrice.toLocaleString()}</td>
                        {isAdmin && <td className="px-6 py-4 text-right text-slate-400 font-mono text-xs">฿{p.costPrice.toLocaleString()}</td>}
                        <td className="px-6 py-4">
                          {p.lastMovement ? (
                            <span className="text-slate-600 font-semibold">{p.lastMovement}</span>
                          ) : (
                            <span className="text-rose-500 italic font-semibold">ไม่มีความเคลื่อนไหว (ตั้งแต่แรกเริ่ม)</span>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            )}

            {/* 5. Expiring items */}
            {activeTab === "expiry" && (
              <table className="w-full border-collapse text-left text-sm text-slate-700">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50/50 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                    <th className="px-6 py-4">วันหมดอายุ</th>
                    <th className="px-6 py-4">รหัสสินค้า / SKU</th>
                    <th className="px-6 py-4">ชื่อสินค้า</th>
                    <th className="px-6 py-4">หมายเลข Lot</th>
                    <th className="px-6 py-4 text-center">จำนวนคงเหลือ Lot</th>
                    <th className="px-6 py-4">ผู้จัดส่ง / Supplier</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {expiring.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-6 py-12 text-center text-slate-400 text-xs">ปลอดภัย! ไม่มีสินค้าหมดอายุภายในระยะเวลาที่กำหนด</td>
                    </tr>
                  ) : (
                    expiring.map((p, idx) => (
                      <tr key={idx} className="hover:bg-slate-50/30 transition-colors bg-rose-50/10">
                        <td className="px-6 py-4 text-rose-600 font-bold font-mono text-xs">{p.expiryDate}</td>
                        <td className="px-6 py-4 font-mono text-xs font-semibold text-slate-600">{p.sku}</td>
                        <td className="px-6 py-4 font-semibold text-slate-800">{p.productName}</td>
                        <td className="px-6 py-4 font-mono text-xs text-slate-500">{p.lotNo || "-"}</td>
                        <td className="px-6 py-4 text-center font-extrabold text-rose-600">{p.qty} ชิ้น</td>
                        <td className="px-6 py-4 font-medium text-slate-600">{p.supplierName || "-"}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
