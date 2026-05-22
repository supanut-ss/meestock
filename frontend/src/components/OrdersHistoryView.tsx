"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useReactToPrint } from "react-to-print";
import ShippingLabel from "@/components/ShippingLabel";
import {
  getShipmentOrders,
  updateShipmentTracking,
  deleteShipmentOrder,
  DBShipmentOrder
} from "@/lib/dbActions";

export default function OrdersHistoryView() {
  const [orders, setOrders] = useState<DBShipmentOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"All" | "Confirmed" | "Shipped" | "Cancelled">("All");

  // Editing tracking state
  const [editingOrder, setEditingOrder] = useState<DBShipmentOrder | null>(null);
  const [trackingNoInput, setTrackingNoInput] = useState("");
  const [statusInput, setStatusInput] = useState<"Confirmed" | "Shipped" | "Cancelled">("Confirmed");
  const [isUpdatingTracking, setIsUpdatingTracking] = useState(false);

  // Printing state
  const [printingOrder, setPrintingOrder] = useState<DBShipmentOrder | null>(null);
  const printRef = useRef<HTMLDivElement>(null);

  const triggerPrint = useReactToPrint({
    contentRef: printRef,
    documentTitle: printingOrder ? `shipping-${printingOrder.orderNo}` : "shipping-label",
  });

  // Load orders
  const loadOrders = async () => {
    setLoading(true);
    try {
      const dbOrders = await getShipmentOrders(search, statusFilter);
      setOrders(dbOrders);
    } catch (err) {
      console.error("Failed to load shipment orders:", err);
    } finally {
      setLoading(false);
    }
  };

  // Run load on search/filter changes
  useEffect(() => {
    const timer = setTimeout(() => {
      void loadOrders();
    }, 300); // debounce input
    return () => clearTimeout(timer);
  }, [search, statusFilter]);

  // Open edit modal
  const openEditModal = (order: DBShipmentOrder) => {
    setEditingOrder(order);
    setTrackingNoInput(order.trackingNo || "");
    setStatusInput(order.status);
  };

  // Save tracking & status
  const handleSaveTracking = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingOrder) return;
    setIsUpdatingTracking(true);
    try {
      const finalStatus = trackingNoInput.trim() ? "Shipped" : statusInput;
      const success = await updateShipmentTracking(editingOrder.id, trackingNoInput, finalStatus);
      if (success) {
        setEditingOrder(null);
        void loadOrders();
      } else {
        alert("ไม่สามารถบันทึกเลขพัสดุได้");
      }
    } catch (err) {
      console.error(err);
      alert("เกิดข้อผิดพลาดในการเชื่อมต่อฐานข้อมูล");
    } finally {
      setIsUpdatingTracking(false);
    }
  };

  // Delete Order
  const handleDeleteOrder = async (id: string, orderNo: string) => {
    if (!confirm(`คุณแน่ใจหรือไม่ที่จะลบคำสั่งซื้อหมายเลข ${orderNo}? ข้อมูลนี้จะหายไปจากฐานข้อมูลถาวร`)) return;
    try {
      const success = await deleteShipmentOrder(id);
      if (success) {
        void loadOrders();
      } else {
        alert("ไม่สามารถลบคำสั่งซื้อได้");
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Open reprint airway bill label
  const handlePrintLabel = (order: DBShipmentOrder) => {
    setPrintingOrder(order);
    // Let state register, then trigger print
    setTimeout(() => {
      if (printRef.current) {
        triggerPrint();
      }
    }, 100);
  };

  // Export summary to clipboard
  const handleExportSummary = () => {
    if (orders.length === 0) {
      alert("ไม่มีข้อมูลที่จะส่งออก");
      return;
    }
    const textLines = [
      `📦 รายงานสรุปใบจัดส่งพัสดุ MeeStock (ทั้งหมด ${orders.length} รายการ)`,
      `วันที่ส่งออก: ${new Date().toLocaleDateString("th-TH")} ${new Date().toLocaleTimeString("th-TH")}`,
      `=========================================`,
      "",
    ];

    orders.forEach((o, index) => {
      const statusText = o.status === "Shipped" ? `จัดส่งแล้ว [Tracking: ${o.trackingNo || "-"}]` : "เตรียมจัดส่ง (Pending)";
      textLines.push(
        `${index + 1}) หมายเลขออเดอร์: ${o.orderNo}`,
        `   ผู้รับ: คุณ ${o.receiverName} (โทร: ${o.receiverPhone})`,
        `   ที่อยู่: ${o.receiverAddress}`,
        `   สถานะ: ${statusText}`,
        `   ราคา: ฿${o.totalAmount.toLocaleString()}`,
        `-----------------------------------------`
      );
    });

    const exportText = textLines.join("\n");
    void navigator.clipboard.writeText(exportText).then(() => {
      alert("คัดลอกข้อมูลสรุปไปยัง Clipboard สำเร็จ! คุณสามารถนำไปวางใน Excel, Line หรือโปรแกรมอื่นๆ ได้ทันที");
    });
  };

  return (
    <div className="space-y-6">
      {/* Header and Quick Stats */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 tracking-tight">ประวัติคำสั่งซื้อและการจัดส่ง</h1>
          <p className="text-slate-500 text-sm">
            สืบค้นข้อมูลที่อยู่ สติกเกอร์จัดส่ง และบันทึกเลขพัสดุ (Tracking Number) ลงฐานข้อมูล
          </p>
        </div>

        {/* Global Action Tools */}
        <div className="flex items-center gap-3">
          <button
            onClick={handleExportSummary}
            className="py-2.5 px-4 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 active:scale-95 text-slate-600 text-xs font-semibold shadow-sm transition-all flex items-center gap-1.5"
          >
            <svg className="w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            ส่งออกข้อมูลสรุป
          </button>

          <button
            onClick={loadOrders}
            className="p-2.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 active:scale-95 text-slate-500 transition-all shadow-sm"
            title="รีเฟรชข้อมูล"
          >
            <svg className={`w-4 h-4 ${loading ? "animate-spin text-indigo-500" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 1121.21 7.89" />
            </svg>
          </button>
        </div>
      </div>

      {/* Control Box: Search & Status Filters */}
      <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-center">
          {/* Search bar */}
          <div className="md:col-span-6 relative">
            <input
              type="text"
              className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-xs transition-all"
              placeholder="ค้นหาชื่อผู้รับ, เบอร์โทร, เลขพัสดุ หรือ Order ID..."
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
            {(["All", "Confirmed", "Shipped", "Cancelled"] as const).map((s) => {
              const label = s === "All" ? "ทั้งหมด" : s === "Confirmed" ? "เตรียมจัดส่ง" : s === "Shipped" ? "จัดส่งแล้ว" : "ยกเลิก";
              const isActive = statusFilter === s;
              let activeStyle = "bg-indigo-50/80 text-indigo-600 shadow-sm shadow-indigo-100/50";
              if (s === "Shipped" && isActive) activeStyle = "bg-emerald-50 text-emerald-700 shadow-sm ring-1 ring-emerald-600/10";
              if (s === "Cancelled" && isActive) activeStyle = "bg-rose-50 text-rose-700 shadow-sm ring-1 ring-rose-600/10";

              return (
                <button
                  key={s}
                  onClick={() => setStatusFilter(s)}
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

      {/* Database Shipment Lists View */}
      <div className="rounded-3xl border border-slate-200 bg-white overflow-hidden shadow-sm">
        {loading ? (
          <div className="p-16 flex flex-col items-center justify-center gap-3">
            <svg className="animate-spin h-8 w-8 text-indigo-600" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
            <p className="text-xs font-semibold text-slate-400">กำลังสืบค้นข้อมูลจากฐานข้อมูล...</p>
          </div>
        ) : (
          <>
            {/* Desktop custom table */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full border-collapse text-left">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50/70 text-slate-500 text-xxs font-bold uppercase tracking-wider">
                    <th className="px-6 py-4">วันที่บันทึก</th>
                    <th className="px-6 py-4">รหัสออเดอร์</th>
                    <th className="px-6 py-4">ข้อมูลผู้รับ</th>
                    <th className="px-6 py-4">สถานะการจัดส่ง</th>
                    <th className="px-6 py-4">เลขพัสดุ (Tracking)</th>
                    <th className="px-6 py-4 text-center">จัดการคำสั่งซื้อ</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700 text-sm">
                  {orders.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-6 py-16 text-center text-slate-400 text-xs">
                        ไม่พบบันทึกประวัติใบปะหน้าออเดอร์จัดส่งในฐานข้อมูล
                      </td>
                    </tr>
                  ) : (
                    orders.map((o) => {
                      const isShipped = o.status === "Shipped";
                      return (
                        <tr key={o.id} className="hover:bg-slate-50/40 transition-colors">
                          <td className="px-6 py-4 text-xs font-medium text-slate-500">{o.createdAt}</td>
                          <td className="px-6 py-4 font-mono text-xs font-bold text-slate-700">{o.orderNo}</td>
                          <td className="px-6 py-4">
                            <div className="space-y-0.5">
                              <p className="font-semibold text-slate-800">{o.receiverName}</p>
                              <p className="text-xxs font-mono font-semibold text-slate-400">{o.receiverPhone}</p>
                              <p className="text-xxs text-slate-500 truncate max-w-xs" title={o.receiverAddress}>
                                {o.receiverAddress}
                              </p>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                              isShipped 
                                ? "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-600/10" 
                                : "bg-indigo-50 text-indigo-700 ring-1 ring-indigo-600/10"
                            }`}>
                              <span className={`h-1.5 w-1.5 rounded-full ${isShipped ? "bg-emerald-500" : "bg-indigo-500"}`}></span>
                              {isShipped ? "จัดส่งแล้ว" : "เตรียมจัดส่ง"}
                            </span>
                          </td>
                          <td className="px-6 py-4 font-mono text-xs text-slate-600">
                            {o.trackingNo ? (
                              <span className="font-semibold text-slate-800 bg-slate-100/80 px-2 py-1 rounded">
                                {o.trackingNo}
                              </span>
                            ) : (
                              <span className="text-slate-400 italic">ไม่มีข้อมูล</span>
                            )}
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex items-center justify-center gap-2">
                              {/* Edit tracking */}
                              <button
                                onClick={() => openEditModal(o)}
                                className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 active:scale-95 text-slate-500 hover:text-indigo-600 transition-all shadow-sm"
                                title="แก้ไขเลขพัสดุ/สถานะ"
                              >
                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                                </svg>
                              </button>

                              {/* Print label */}
                              <button
                                onClick={() => handlePrintLabel(o)}
                                className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 active:scale-95 text-slate-500 hover:text-emerald-600 transition-all shadow-sm"
                                title="พิมพ์ใบปะหน้ากล่อง"
                              >
                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                                </svg>
                              </button>

                              {/* Delete Order */}
                              <button
                                onClick={() => handleDeleteOrder(o.id, o.orderNo)}
                                className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-rose-50 active:scale-95 text-slate-400 hover:text-rose-600 transition-all shadow-sm"
                                title="ลบออเดอร์"
                              >
                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                </svg>
                              </button>
                            </div>
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
              {orders.length === 0 ? (
                <p className="text-center text-slate-400 text-xs py-8">ไม่พบประวัติออเดอร์ในระบบ</p>
              ) : (
                orders.map((o) => {
                  const isShipped = o.status === "Shipped";
                  return (
                    <div key={o.id} className="rounded-2xl bg-white border border-slate-100 p-4 shadow-sm space-y-3">
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="text-xxs text-slate-400 font-medium">{o.createdAt}</p>
                          <h4 className="font-mono text-sm font-bold text-slate-800">{o.orderNo}</h4>
                        </div>
                        <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xxs font-bold ${
                          isShipped ? "bg-emerald-50 text-emerald-700" : "bg-indigo-50 text-indigo-700"
                        }`}>
                          {isShipped ? "จัดส่งแล้ว" : "เตรียมจัดส่ง"}
                        </span>
                      </div>

                      <div className="border-t border-slate-100/70 pt-2.5 space-y-1">
                        <p className="text-xxs text-slate-400 uppercase tracking-wider">ข้อมูลผู้รับสินค้า</p>
                        <p className="text-xs font-semibold text-slate-700">{o.receiverName} (โทร: {o.receiverPhone})</p>
                        <p className="text-xxs text-slate-500 leading-relaxed">{o.receiverAddress}</p>
                      </div>

                      {o.trackingNo && (
                        <div className="bg-slate-50 rounded-xl p-2.5 flex items-center justify-between text-xxs font-mono border border-slate-100">
                          <span className="text-slate-400">เลขพัสดุ (Tracking)</span>
                          <span className="font-bold text-slate-800">{o.trackingNo}</span>
                        </div>
                      )}

                      {/* Card actions */}
                      <div className="flex items-center justify-between gap-2 pt-2 border-t border-slate-100/70">
                        <button
                          onClick={() => openEditModal(o)}
                          className="py-2 px-3 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 text-xxs font-semibold transition-all flex items-center justify-center gap-1.5 flex-1"
                        >
                          <svg className="w-3.5 h-3.5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                          </svg>
                          แก้ไขเลข
                        </button>

                        <button
                          onClick={() => handlePrintLabel(o)}
                          className="py-2 px-3 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xxs font-semibold transition-all flex items-center justify-center gap-1.5 flex-1"
                        >
                          <svg className="w-3.5 h-3.5 text-indigo-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                          </svg>
                          พิมพ์ป้าย
                        </button>

                        <button
                          onClick={() => handleDeleteOrder(o.id, o.orderNo)}
                          className="p-2 rounded-xl border border-slate-200 bg-white hover:bg-rose-50 text-slate-400 hover:text-rose-600 transition-all flex items-center justify-center shadow-sm"
                        >
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </>
        )}
      </div>

      {/* Invisible Print Label Frame */}
      {printingOrder && (
        <div style={{ position: "absolute", left: -9999, top: -9999 }}>
          <div ref={printRef}>
            <ShippingLabel
              senderName={printingOrder.senderName}
              senderAddress={printingOrder.senderAddress}
              receiverName={printingOrder.receiverName}
              receiverPhone={printingOrder.receiverPhone}
              receiverAddress={printingOrder.receiverAddress}
              orderNo={printingOrder.orderNo}
            />
          </div>
        </div>
      )}

      {/* Edit Tracking Modal */}
      {editingOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            onClick={() => setEditingOrder(null)}
            className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm transition-opacity"
          ></div>

          <form
            onSubmit={handleSaveTracking}
            className="relative w-full max-w-md transform rounded-3xl bg-white p-6 text-left shadow-2xl transition-all border border-slate-100 flex flex-col gap-4 animate-in zoom-in-95 duration-200"
          >
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base font-bold text-slate-800">อัปเดตเลขพัสดุและสถานะจัดส่ง</h3>
              <button
                type="button"
                onClick={() => setEditingOrder(null)}
                className="text-slate-400 hover:text-slate-600 rounded-lg p-1 hover:bg-slate-100 transition-colors"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="space-y-4 text-xs">
              <div className="bg-slate-50 border border-slate-100 rounded-2xl p-3 space-y-1">
                <p className="text-xxs font-bold text-slate-400">ออเดอร์จัดส่ง</p>
                <p className="text-xs font-bold text-slate-700">{editingOrder.orderNo}</p>
                <p className="text-xxs text-slate-500 font-semibold">ผู้รับ: {editingOrder.receiverName}</p>
              </div>

              <div className="space-y-1">
                <label className="text-xxs font-semibold text-slate-500">หมายเลขเลขพัสดุ (Tracking Number)</label>
                <input
                  type="text"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-xs font-semibold uppercase tracking-wider text-slate-800"
                  placeholder="เช่น TH123456789"
                  value={trackingNoInput}
                  onChange={(e) => setTrackingNoInput(e.target.value)}
                />
                <p className="text-xxs text-slate-400 mt-1 pl-1">
                  * หากใส่เลขพัสดุ ระบบจะปรับสถานะเป็น **"จัดส่งแล้ว"** โดยอัตโนมัติเมื่อบันทึก
                </p>
              </div>

              {!trackingNoInput.trim() && (
                <div className="space-y-1">
                  <label className="text-xxs font-semibold text-slate-500">สถานะพัสดุ</label>
                  <select
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-xs font-semibold text-slate-700 bg-white"
                    value={statusInput}
                    onChange={(e: any) => setStatusInput(e.target.value)}
                  >
                    <option value="Confirmed">เตรียมจัดส่ง (Confirmed)</option>
                    <option value="Cancelled">ยกเลิกออเดอร์ (Cancelled)</option>
                  </select>
                </div>
              )}
            </div>

            <div className="flex items-center justify-end gap-3 border-t border-slate-100 pt-3 mt-1">
              <button
                type="button"
                onClick={() => setEditingOrder(null)}
                className="py-2.5 px-4 rounded-xl border border-slate-200 text-xs font-semibold text-slate-500 hover:bg-slate-50 active:scale-95 transition-all"
              >
                ยกเลิก
              </button>
              <button
                type="submit"
                disabled={isUpdatingTracking}
                className="py-2.5 px-5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-md shadow-indigo-100 hover:shadow-lg active:scale-95 transition-all flex items-center gap-1.5"
              >
                {isUpdatingTracking ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    กำลังบันทึก...
                  </>
                ) : (
                  "บันทึกข้อมูล"
                )}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
