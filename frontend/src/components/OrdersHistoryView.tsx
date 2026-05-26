"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { useReactToPrint } from "react-to-print";
import ShippingLabel from "@/components/ShippingLabel";
import {
  getShipmentOrders,
  updateShipmentTracking,
  deleteShipmentOrder,
  DBShipmentOrder,
  getSaleOrders,
  returnOrder,
  DBSaleOrder
} from "@/lib/dbActions";

export default function OrdersHistoryView() {
  const [activeTab, setActiveTab] = useState<"shipments" | "sales">("shipments");
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [isPending, startTransition] = useTransition();

  // ==========================================
  // SHIPMENT ORDERS STATE
  // ==========================================
  const [shipments, setShipments] = useState<DBShipmentOrder[]>([]);
  const [statusFilter, setStatusFilter] = useState<"All" | "Confirmed" | "Shipped" | "Cancelled">("All");
  const [editingOrder, setEditingOrder] = useState<DBShipmentOrder | null>(null);
  const [trackingNoInput, setTrackingNoInput] = useState("");
  const [statusInput, setStatusInput] = useState<"Confirmed" | "Shipped" | "Cancelled">("Confirmed");
  const [isUpdatingTracking, setIsUpdatingTracking] = useState(false);
  const [printingOrder, setPrintingOrder] = useState<DBShipmentOrder | null>(null);

  // ==========================================
  // SALE ORDERS STATE
  // ==========================================
  const [saleOrders, setSaleOrders] = useState<DBSaleOrder[]>([]);
  const [returningOrder, setReturningOrder] = useState<DBSaleOrder | null>(null);
  const [returnItemQtys, setReturnItemQtys] = useState<Record<string, number>>({});
  const [returnNote, setReturnNote] = useState("");
  const [returnError, setReturnError] = useState("");
  const [printingSale, setPrintingSale] = useState<DBSaleOrder | null>(null);

  // Printing Refs
  const printShipmentRef = useRef<HTMLDivElement>(null);
  const printSaleRef = useRef<HTMLDivElement>(null);

  const triggerPrintShipment = useReactToPrint({
    contentRef: printShipmentRef,
    documentTitle: printingOrder ? `shipping-${printingOrder.orderNo}` : "shipping-label",
  });

  const triggerPrintSale = useReactToPrint({
    contentRef: printSaleRef,
    documentTitle: printingSale ? `receipt-${printingSale.orderNo}` : "receipt",
  });

  // Load Shipments
  const loadShipments = async () => {
    setLoading(true);
    try {
      const dbOrders = await getShipmentOrders(search, statusFilter);
      setShipments(dbOrders);
    } catch (err) {
      console.error("Failed to load shipment orders:", err);
    } finally {
      setLoading(false);
    }
  };

  // Load Sales
  const loadSales = async () => {
    setLoading(true);
    try {
      const dbSales = await getSaleOrders(search);
      setSaleOrders(dbSales);
    } catch (err) {
      console.error("Failed to load sale orders:", err);
    } finally {
      setLoading(false);
    }
  };

  // Run load on search/filter/tab changes
  useEffect(() => {
    const timer = setTimeout(() => {
      if (activeTab === "shipments") {
        void loadShipments();
      } else {
        void loadSales();
      }
    }, 300); // debounce input
    return () => clearTimeout(timer);
  }, [search, statusFilter, activeTab]);

  // Open edit modal (Shipments)
  const openEditModal = (order: DBShipmentOrder) => {
    setEditingOrder(order);
    setTrackingNoInput(order.trackingNo || "");
    setStatusInput(order.status);
  };

  // Save tracking & status (Shipments)
  const handleSaveTracking = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingOrder) return;
    setIsUpdatingTracking(true);
    try {
      const finalStatus = trackingNoInput.trim() ? "Shipped" : statusInput;
      const success = await updateShipmentTracking(editingOrder.id, trackingNoInput, finalStatus);
      if (success) {
        setEditingOrder(null);
        void loadShipments();
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

  // Delete Order (Shipments)
  const handleDeleteOrder = async (id: string, orderNo: string) => {
    if (!confirm(`คุณแน่ใจหรือไม่ที่จะลบคำสั่งซื้อหมายเลข ${orderNo}? ข้อมูลนี้จะหายไปจากฐานข้อมูลถาวร`)) return;
    try {
      const success = await deleteShipmentOrder(id);
      if (success) {
        void loadShipments();
      } else {
        alert("ไม่สามารถลบคำสั่งซื้อได้");
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Open reprint airway bill label (Shipments)
  const handlePrintLabel = (order: DBShipmentOrder) => {
    setPrintingOrder(order);
    setTimeout(() => {
      if (printShipmentRef.current) {
        triggerPrintShipment();
      }
    }, 100);
  };

  // Open print invoice/receipt (Sales)
  const handlePrintReceipt = (sale: DBSaleOrder) => {
    setPrintingSale(sale);
    setTimeout(() => {
      if (printSaleRef.current) {
        triggerPrintSale();
      }
    }, 100);
  };

  // Open Return Modal (Sales)
  const openReturnModal = (sale: DBSaleOrder) => {
    setReturningOrder(sale);
    const qtys: Record<string, number> = {};
    sale.items.forEach((item) => {
      qtys[item.productId] = item.qty; // default to return all
    });
    setReturnItemQtys(qtys);
    setReturnNote("");
    setReturnError("");
  };

  const handleReturnSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!returningOrder) return;

    // Build return list
    const itemsToReturn = returningOrder.items
      .map((item) => ({
        productId: item.productId,
        qty: returnItemQtys[item.productId] || 0,
        unitPrice: item.unitPrice,
        costPrice: item.costPrice,
      }))
      .filter((i) => i.qty > 0);

    if (itemsToReturn.length === 0) {
      setReturnError("กรุณาระบุจำนวนสินค้าที่จะคืนอย่างน้อย 1 ชิ้น");
      return;
    }

    setReturnError("");
    startTransition(async () => {
      const result = await returnOrder(returningOrder.id, itemsToReturn, returnNote);
      if (result.success) {
        setReturningOrder(null);
        void loadSales();
      } else {
        setReturnError(result.error || "เกิดข้อผิดพลาดในการทำรายการคืนสินค้า");
      }
    });
  };

  const handleExportSummary = () => {
    if (activeTab === "shipments") {
      if (shipments.length === 0) { alert("ไม่มีข้อมูลที่จะส่งออก"); return; }
      const textLines = [
        `📦 รายงานสรุปใบจัดส่งพัสดุ MeeStock (ทั้งหมด ${shipments.length} รายการ)`,
        `วันที่ส่งออก: ${new Date().toLocaleDateString("th-TH")} ${new Date().toLocaleTimeString("th-TH")}`,
        `=========================================`,
        "",
      ];
      shipments.forEach((o, index) => {
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
      void navigator.clipboard.writeText(textLines.join("\n")).then(() => {
        alert("คัดลอกข้อมูลสรุปจัดส่งพัสดุไปยัง Clipboard สำเร็จ!");
      });
    } else {
      if (saleOrders.length === 0) { alert("ไม่มีข้อมูลที่จะส่งออก"); return; }
      const textLines = [
        `💵 รายงานสรุปบิลขายสินค้า MeeStock (ทั้งหมด ${saleOrders.length} รายการ)`,
        `วันที่ส่งออก: ${new Date().toLocaleDateString("th-TH")} ${new Date().toLocaleTimeString("th-TH")}`,
        `=========================================`,
        "",
      ];
      saleOrders.forEach((o, index) => {
        textLines.push(
          `${index + 1}) เลขที่ใบเสร็จ: ${o.invoiceNo || o.orderNo}`,
          `   วันที่: ${o.createdAt}`,
          `   รายการสินค้า: ${o.items.map((i) => `${i.productName} (x${i.qty})`).join(", ")}`,
          `   ยอดรวม: ฿${o.totalAmount.toLocaleString()}`,
          `   สถานะ: ${o.status === "Returned" ? "คืนสินค้าแล้ว" : "สำเร็จ"}`,
          `-----------------------------------------`
        );
      });
      void navigator.clipboard.writeText(textLines.join("\n")).then(() => {
        alert("คัดลอกข้อมูลบิลขายสินค้าไปยัง Clipboard สำเร็จ!");
      });
    }
  };

  return (
    <div className="space-y-6">
      {/* Header and Quick Stats */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 tracking-tight">ประวัติและข้อมูลใบเสร็จ</h1>
          <p className="text-slate-500 text-sm">
            จัดการข้อมูลใบปะหน้าพัสดุ รายการบิลใบเสร็จรับเงิน และบันทึกคืนสินค้าเมื่อเกิดข้อผิดพลาด
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
            onClick={() => (activeTab === "shipments" ? void loadShipments() : void loadSales())}
            className="p-2.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 active:scale-95 text-slate-500 transition-all shadow-sm"
            title="รีเฟรชข้อมูล"
          >
            <svg className={`w-4 h-4 ${loading ? "animate-spin text-indigo-500" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 1121.21 7.89" />
            </svg>
          </button>
        </div>
      </div>

      {/* Modern Tabs Navigation */}
      <div className="flex border-b border-slate-200 gap-1.5">
        <button
          onClick={() => { setActiveTab("shipments"); setSearch(""); }}
          className={`py-3 px-5 text-sm font-bold border-b-2 transition-all flex items-center gap-2 ${
            activeTab === "shipments"
              ? "border-indigo-600 text-indigo-600 font-extrabold"
              : "border-transparent text-slate-500 hover:text-slate-800 hover:border-slate-300"
          }`}
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
          </svg>
          รายการพัสดุและใบปะหน้า (Shipments)
        </button>
        <button
          onClick={() => { setActiveTab("sales"); setSearch(""); }}
          className={`py-3 px-5 text-sm font-bold border-b-2 transition-all flex items-center gap-2 ${
            activeTab === "sales"
              ? "border-indigo-600 text-indigo-600 font-extrabold"
              : "border-transparent text-slate-500 hover:text-slate-800 hover:border-slate-300"
          }`}
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          บิลการขาย & การคืนสินค้า (Sales & Returns)
        </button>
      </div>

      {/* Control Box: Search */}
      <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-center">
          {/* Search bar */}
          <div className="md:col-span-8 relative">
            <input
              type="text"
              className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-xs transition-all"
              placeholder={
                activeTab === "shipments"
                  ? "ค้นหาชื่อผู้รับ, เบอร์โทร, เลขพัสดุ หรือหมายเลขจัดส่ง..."
                  : "ค้นหาเลขที่บิล/ใบเสร็จ หรือข้อความหมายเหตุ..."
              }
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            <div className="absolute left-3.5 top-3 text-slate-400">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
          </div>

          {/* Status Switches (Only for Shipments) */}
          {activeTab === "shipments" && (
            <div className="md:col-span-4 flex flex-wrap gap-2 md:justify-end">
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
                    className={`px-3 py-1.5 text-xs font-semibold rounded-full border border-slate-200 transition-all ${
                      isActive ? activeStyle : "bg-white text-slate-500 hover:bg-slate-50"
                    }`}
                  >
                    {label}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Main Database Table Container */}
      <div className="rounded-3xl border border-slate-200 bg-white overflow-hidden shadow-sm">
        {loading ? (
          <div className="p-16 flex flex-col items-center justify-center gap-3">
            <svg className="animate-spin h-8 w-8 text-indigo-600" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
            <p className="text-xs font-semibold text-slate-400">กำลังดึงข้อมูล...</p>
          </div>
        ) : activeTab === "shipments" ? (
          /* ====================================================== */
          /* 🚚 SHIPMENTS TAB VIEW                                 */
          /* ====================================================== */
          <>
            {/* Desktop table */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full border-collapse text-left">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50/70 text-slate-500 text-[10px] font-bold uppercase tracking-wider">
                    <th className="px-6 py-4">วันที่บันทึก</th>
                    <th className="px-6 py-4">รหัสออเดอร์</th>
                    <th className="px-6 py-4">ข้อมูลผู้รับ</th>
                    <th className="px-6 py-4">สถานะการจัดส่ง</th>
                    <th className="px-6 py-4">เลขพัสดุ (Tracking)</th>
                    <th className="px-6 py-4 text-center">จัดการคำสั่งซื้อ</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700 text-sm">
                  {shipments.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-6 py-16 text-center text-slate-400 text-xs">
                        ไม่พบบันทึกประวัติใบปะหน้าออเดอร์จัดส่งในระบบ
                      </td>
                    </tr>
                  ) : (
                    shipments.map((o) => {
                      const isShipped = o.status === "Shipped";
                      const isCancelled = o.status === "Cancelled";
                      return (
                        <tr key={o.id} className="hover:bg-slate-50/40 transition-colors">
                          <td className="px-6 py-4 text-xs font-medium text-slate-500">{o.createdAt}</td>
                          <td className="px-6 py-4 font-mono text-xs font-bold text-slate-700">{o.orderNo}</td>
                          <td className="px-6 py-4">
                            <div className="space-y-0.5">
                              <p className="font-semibold text-slate-800">{o.receiverName}</p>
                              <p className="text-[10px] font-mono font-semibold text-slate-400">{o.receiverPhone}</p>
                              <p className="text-[10px] text-slate-500 truncate max-w-xs" title={o.receiverAddress}>
                                {o.receiverAddress}
                              </p>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                              isCancelled
                                ? "bg-rose-50 text-rose-700 ring-1 ring-rose-600/10"
                                : isShipped 
                                ? "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-600/10" 
                                : "bg-indigo-50 text-indigo-700 ring-1 ring-indigo-600/10"
                            }`}>
                              <span className={`h-1.5 w-1.5 rounded-full ${isCancelled ? "bg-rose-500" : isShipped ? "bg-emerald-500" : "bg-indigo-500"}`}></span>
                              {isCancelled ? "ยกเลิก" : isShipped ? "จัดส่งแล้ว" : "เตรียมจัดส่ง"}
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
                              <button
                                onClick={() => openEditModal(o)}
                                className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 active:scale-95 text-slate-500 hover:text-indigo-600 transition-all shadow-sm"
                                title="แก้ไขเลขพัสดุ/สถานะ"
                              >
                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                                </svg>
                              </button>

                              <button
                                onClick={() => handlePrintLabel(o)}
                                className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 active:scale-95 text-slate-500 hover:text-emerald-600 transition-all shadow-sm"
                                title="พิมพ์ใบปะหน้ากล่อง"
                              >
                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                                </svg>
                              </button>

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

            {/* Mobile Cards */}
            <div className="block md:hidden p-4 space-y-4 bg-slate-50/50">
              {shipments.length === 0 ? (
                <p className="text-center text-slate-400 text-xs py-8">ไม่พบประวัติออเดอร์จัดส่ง</p>
              ) : (
                shipments.map((o) => {
                  const isShipped = o.status === "Shipped";
                  const isCancelled = o.status === "Cancelled";
                  return (
                    <div key={o.id} className="rounded-2xl bg-white border border-slate-100 p-4 shadow-sm space-y-3">
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="text-[10px] text-slate-400 font-medium">{o.createdAt}</p>
                          <h4 className="font-mono text-sm font-bold text-slate-800">{o.orderNo}</h4>
                        </div>
                        <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold ${
                          isCancelled
                            ? "bg-rose-50 text-rose-700"
                            : isShipped 
                            ? "bg-emerald-50 text-emerald-700" 
                            : "bg-indigo-50 text-indigo-700"
                        }`}>
                          {isCancelled ? "ยกเลิก" : isShipped ? "จัดส่งแล้ว" : "เตรียมจัดส่ง"}
                        </span>
                      </div>

                      <div className="border-t border-slate-100/70 pt-2.5 space-y-1">
                        <p className="text-[10px] text-slate-400 uppercase tracking-wider">ข้อมูลผู้รับสินค้า</p>
                        <p className="text-xs font-semibold text-slate-700">{o.receiverName} (โทร: {o.receiverPhone})</p>
                        <p className="text-[10px] text-slate-500 leading-relaxed">{o.receiverAddress}</p>
                      </div>

                      {o.trackingNo && (
                        <div className="bg-slate-50 rounded-xl p-2.5 flex items-center justify-between text-[10px] font-mono border border-slate-100">
                          <span className="text-slate-400">เลขพัสดุ (Tracking)</span>
                          <span className="font-bold text-slate-800">{o.trackingNo}</span>
                        </div>
                      )}

                      <div className="flex items-center justify-between gap-2 pt-2 border-t border-slate-100/70">
                        <button
                          onClick={() => openEditModal(o)}
                          className="py-2 px-3 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 text-[10px] font-semibold transition-all flex items-center justify-center gap-1.5 flex-1"
                        >
                          แก้ไขเลข
                        </button>
                        <button
                          onClick={() => handlePrintLabel(o)}
                          className="py-2 px-3 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-[10px] font-semibold transition-all flex items-center justify-center gap-1.5 flex-1"
                        >
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
        ) : (
          /* ====================================================== */
          /* 💵 SALES TAB VIEW                                     */
          /* ====================================================== */
          <>
            {/* Desktop table */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full border-collapse text-left">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50/70 text-slate-500 text-[10px] font-bold uppercase tracking-wider">
                    <th className="px-6 py-4">วันที่ทำรายการ</th>
                    <th className="px-6 py-4">เลขที่ใบเสร็จ</th>
                    <th className="px-6 py-4">รายการสินค้า</th>
                    <th className="px-6 py-4">ยอดรวมขาย</th>
                    <th className="px-6 py-4">สถานะบิล</th>
                    <th className="px-6 py-4">หมายเหตุ</th>
                    <th className="px-6 py-4 text-center">จัดการบิล</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700 text-sm">
                  {saleOrders.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-6 py-16 text-center text-slate-400 text-xs">
                        ไม่พบบันทึกประวัติบิลขายสินค้าในคลังข้อมูล
                      </td>
                    </tr>
                  ) : (
                    saleOrders.map((s) => {
                      const isReturned = s.status === "Returned";
                      return (
                        <tr key={s.id} className="hover:bg-slate-50/40 transition-colors">
                          <td className="px-6 py-4 text-xs font-medium text-slate-500">{s.createdAt}</td>
                          <td className="px-6 py-4 font-mono text-xs font-bold text-slate-700">{s.invoiceNo || s.orderNo}</td>
                          <td className="px-6 py-4">
                            <div className="max-w-xs space-y-1 text-xs">
                              {s.items.map((i, idx) => (
                                <p key={idx} className="truncate" title={i.productName}>
                                  • {i.productName} <span className="font-bold text-slate-500">(x{i.qty})</span>
                                </p>
                              ))}
                            </div>
                          </td>
                          <td className="px-6 py-4 font-bold text-violet-700">฿{s.totalAmount.toLocaleString()}</td>
                          <td className="px-6 py-4">
                            <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                              isReturned 
                                ? "bg-rose-50 text-rose-700 ring-1 ring-rose-600/10" 
                                : "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-600/10"
                            }`}>
                              <span className={`h-1.5 w-1.5 rounded-full ${isReturned ? "bg-rose-500" : "bg-emerald-500"}`}></span>
                              {isReturned ? "คืนสินค้าแล้ว" : "สำเร็จ"}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-xs text-slate-400 max-w-xs truncate" title={s.note || ""}>
                            {s.note || "-"}
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex items-center justify-center gap-2">
                              {/* Reprint invoice */}
                              <button
                                onClick={() => handlePrintReceipt(s)}
                                className="py-1.5 px-3 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 hover:text-indigo-600 text-xs font-semibold transition-all shadow-sm flex items-center gap-1"
                                title="พิมพ์ใบเสร็จพิมพ์ซ้ำ"
                              >
                                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                                </svg>
                                พิมพ์บิล
                              </button>

                              {/* Return order items */}
                              <button
                                onClick={() => openReturnModal(s)}
                                disabled={isReturned}
                                className={`py-1.5 px-3 rounded-xl border text-xs font-semibold transition-all shadow-sm flex items-center gap-1 ${
                                  isReturned
                                    ? "bg-slate-50 text-slate-300 border-slate-100 cursor-not-allowed"
                                    : "bg-white border-slate-200 text-rose-500 hover:bg-rose-50 hover:border-rose-200 active:scale-95"
                                }`}
                                title="คืนสินค้าเข้าคลัง"
                              >
                                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
                                </svg>
                                คืนสินค้า
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

            {/* Mobile Cards */}
            <div className="block md:hidden p-4 space-y-4 bg-slate-50/50">
              {saleOrders.length === 0 ? (
                <p className="text-center text-slate-400 text-xs py-8">ไม่พบประวัติบิลขายสินค้า</p>
              ) : (
                saleOrders.map((s) => {
                  const isReturned = s.status === "Returned";
                  return (
                    <div key={s.id} className="rounded-2xl bg-white border border-slate-100 p-4 shadow-sm space-y-3">
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="text-[10px] text-slate-400 font-medium">{s.createdAt}</p>
                          <h4 className="font-mono text-sm font-bold text-slate-800">{s.invoiceNo || s.orderNo}</h4>
                        </div>
                        <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold ${
                          isReturned ? "bg-rose-50 text-rose-700" : "bg-emerald-50 text-emerald-700"
                        }`}>
                          {isReturned ? "คืนแล้ว" : "สำเร็จ"}
                        </span>
                      </div>

                      <div className="border-t border-slate-100/70 pt-2.5 space-y-2">
                        <p className="text-[10px] text-slate-400 uppercase tracking-wider">รายการสินค้าในบิล</p>
                        <div className="bg-slate-50/70 border border-slate-100 rounded-xl p-2.5 text-xs space-y-1">
                          {s.items.map((i, idx) => (
                            <p key={idx} className="text-slate-600">
                              • {i.productName} <strong className="text-slate-800 font-bold">x{i.qty}</strong>
                            </p>
                          ))}
                        </div>
                      </div>

                      <div className="flex justify-between items-center bg-slate-50 rounded-xl p-2.5 border border-slate-100 text-xs">
                        <span className="text-slate-500 font-medium">ยอดรวมสุทธิ</span>
                        <span className="font-bold text-violet-700">฿{s.totalAmount.toLocaleString()}</span>
                      </div>

                      <div className="flex items-center gap-2 pt-2 border-t border-slate-100/70">
                        <button
                          onClick={() => handlePrintReceipt(s)}
                          className="py-2 px-3 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 text-[10px] font-semibold transition-all flex items-center justify-center gap-1.5 flex-1"
                        >
                          พิมพ์บิล
                        </button>
                        <button
                          onClick={() => openReturnModal(s)}
                          disabled={isReturned}
                          className={`py-2 px-3 rounded-xl border text-[10px] font-semibold transition-all flex items-center justify-center gap-1.5 flex-1 ${
                            isReturned
                              ? "bg-slate-50 text-slate-300 border-slate-100 cursor-not-allowed"
                              : "bg-rose-50 text-rose-700 border-rose-100 hover:bg-rose-100"
                          }`}
                        >
                          คืนสินค้า
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

      {/* ====================================================== */}
      {/* Invisible HTML Printing Sections                        */}
      {/* ====================================================== */}

      {/* Shipment airway bill print frame */}
      {printingOrder && (
        <div style={{ position: "absolute", left: -9999, top: -9999 }}>
          <div ref={printShipmentRef}>
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

      {/* Sale bill invoice reprint frame */}
      {printingSale && (
        <div style={{ position: "absolute", left: -9999, top: -9999 }}>
          <div ref={printSaleRef} style={{ width: "210mm", padding: "20mm", fontFamily: "sans-serif", background: "white", color: "#000" }}>
            <div style={{ borderBottom: "2px solid #000", paddingBottom: "8mm", marginBottom: "8mm" }}>
              <h1 style={{ fontSize: "24px", fontWeight: "bold", margin: 0 }}>INVOICE / RECEIPT (พิมพ์ซ้ำ)</h1>
              <p style={{ margin: "2mm 0 0 0", fontSize: "11px", color: "#555" }}>เลขที่: {printingSale.invoiceNo || printingSale.orderNo}</p>
              <p style={{ margin: "1mm 0 0 0", fontSize: "11px", color: "#555" }}>วันที่ขาย: {printingSale.createdAt}</p>
              <p style={{ margin: "1mm 0 0 0", fontSize: "11px", color: "#555" }}>สถานะบิล: {printingSale.status === "Returned" ? "คืนสินค้าแล้ว (Returned)" : "เสร็จสิ้น"}</p>
            </div>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "12px" }}>
              <thead>
                <tr style={{ borderBottom: "1px solid #000" }}>
                  <th style={{ padding: "3mm 2mm", textAlign: "left" }}>รายการสินค้า</th>
                  <th style={{ padding: "3mm 2mm", textAlign: "center" }}>จำนวน</th>
                  <th style={{ padding: "3mm 2mm", textAlign: "right" }}>ราคา/หน่วย</th>
                  <th style={{ padding: "3mm 2mm", textAlign: "right" }}>รวม</th>
                </tr>
              </thead>
              <tbody>
                {printingSale.items.map((item, i) => (
                  <tr key={i} style={{ borderBottom: "0.5px solid #ddd" }}>
                    <td style={{ padding: "2mm" }}>{item.productName}</td>
                    <td style={{ padding: "2mm", textAlign: "center" }}>{item.qty} ชิ้น</td>
                    <td style={{ padding: "2mm", textAlign: "right" }}>฿{item.unitPrice.toLocaleString()}</td>
                    <td style={{ padding: "2mm", textAlign: "right" }}>฿{(item.qty * item.unitPrice).toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div style={{ borderTop: "2px solid #000", marginTop: "4mm", paddingTop: "4mm", textAlign: "right" }}>
              <p style={{ margin: "2mm 0 0 0", fontSize: "18px", fontWeight: "bold" }}>ยอดรวม: ฿{printingSale.totalAmount.toLocaleString()}</p>
            </div>
            {printingSale.note && (
              <div style={{ marginTop: "6mm", fontSize: "11px", color: "#666", border: "1px solid #ddd", padding: "3mm", borderRadius: "4px" }}>
                <strong>หมายเหตุ:</strong> {printingSale.note}
              </div>
            )}
            <p style={{ marginTop: "12mm", fontSize: "10px", color: "#888", textAlign: "center" }}>ขอบคุณที่ใช้บริการ — MeeStock Pro</p>
          </div>
        </div>
      )}

      {/* ====================================================== */}
      {/* Modals & Dialogs                                       */}
      {/* ====================================================== */}

      {/* 1. Edit Shipment Tracking Modal */}
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
                <p className="text-[10px] font-bold text-slate-400">ออเดอร์จัดส่ง</p>
                <p className="text-xs font-bold text-slate-700">{editingOrder.orderNo}</p>
                <p className="text-[10px] text-slate-500 font-semibold">ผู้รับ: {editingOrder.receiverName}</p>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-semibold text-slate-500">หมายเลขเลขพัสดุ (Tracking Number)</label>
                <input
                  type="text"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-xs font-semibold uppercase tracking-wider text-slate-800"
                  placeholder="เช่น TH123456789"
                  value={trackingNoInput}
                  onChange={(e) => setTrackingNoInput(e.target.value)}
                />
                <p className="text-[10px] text-slate-400 mt-1 pl-1">
                  * หากใส่เลขพัสดุ ระบบจะปรับสถานะเป็น **"จัดส่งแล้ว"** โดยอัตโนมัติเมื่อบันทึก
                </p>
              </div>

              {!trackingNoInput.trim() && (
                <div className="space-y-1">
                  <label className="text-[10px] font-semibold text-slate-500">สถานะพัสดุ</label>
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
                {isUpdatingTracking ? "กำลังบันทึก..." : "บันทึกข้อมูล"}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* 2. Sale Order Return Items Modal */}
      {returningOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            onClick={() => setReturningOrder(null)}
            className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm transition-opacity"
          ></div>

          <form
            onSubmit={handleReturnSubmit}
            className="relative w-full max-w-md transform rounded-3xl bg-white p-6 text-left shadow-2xl transition-all border border-slate-100 flex flex-col gap-4 animate-in zoom-in-95 duration-200"
          >
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base font-bold text-slate-800">คืนสินค้าเข้าคลัง (Return Product)</h3>
              <button
                type="button"
                onClick={() => setReturningOrder(null)}
                className="text-slate-400 hover:text-slate-600 rounded-lg p-1 hover:bg-slate-100 transition-colors"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="space-y-4 text-xs">
              <div className="bg-slate-50 border border-slate-100 rounded-2xl p-3 space-y-1">
                <p className="text-[10px] font-bold text-slate-400">คืนสินค้าจากบิลเลขที่</p>
                <p className="text-xs font-bold text-slate-700">{returningOrder.invoiceNo || returningOrder.orderNo}</p>
                <p className="text-[10px] text-slate-500 font-semibold">ยอดเงินรวม: ฿{returningOrder.totalAmount.toLocaleString()}</p>
              </div>

              {/* Items returning inputs */}
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">ระบุจำนวนสินค้าที่จะคืนเข้าคลัง</label>
                <div className="divide-y divide-slate-100 border border-slate-100 rounded-2xl bg-slate-50/50 p-2.5 space-y-2 max-h-56 overflow-y-auto">
                  {returningOrder.items.map((item) => (
                    <div key={item.productId} className="flex items-center justify-between gap-3 py-2 first:pt-0 last:pb-0">
                      <div className="min-w-0">
                        <p className="font-semibold text-slate-800 truncate">{item.productName}</p>
                        <p className="text-[9px] text-slate-400">ซื้อไปทั้งหมด {item.qty} ชิ้น</p>
                      </div>
                      <div className="flex items-center gap-1.5 flex-shrink-0">
                        <input
                          type="number"
                          min="0"
                          max={item.qty}
                          className="w-16 px-2 py-1 rounded-lg border border-slate-200 text-center text-xs font-bold bg-white focus:outline-none focus:ring-1 focus:ring-rose-500 focus:border-rose-500"
                          value={returnItemQtys[item.productId] ?? 0}
                          onChange={(e) => {
                            const val = Math.min(item.qty, Math.max(0, Number(e.target.value)));
                            setReturnItemQtys({ ...returnItemQtys, [item.productId]: val });
                          }}
                        />
                        <span className="text-[10px] font-semibold text-slate-400">ชิ้น</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Return note */}
              <div className="space-y-1">
                <label className="text-[10px] font-semibold text-slate-500">เหตุผลในการคืนสินค้า</label>
                <input
                  type="text"
                  required
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 text-xs text-slate-800"
                  placeholder="เช่น ลูกค้าเปลี่ยนใจ, คืนสินค้าชำรุด"
                  value={returnNote}
                  onChange={(e) => setReturnNote(e.target.value)}
                />
              </div>

              {returnError && (
                <div className="flex items-center gap-2 rounded-2xl bg-rose-50 border border-rose-100 px-4 py-2.5 text-rose-600 text-[10px] leading-relaxed">
                  <svg className="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                  {returnError}
                </div>
              )}
            </div>

            <div className="flex items-center justify-end gap-3 border-t border-slate-100 pt-3 mt-1">
              <button
                type="button"
                onClick={() => setReturningOrder(null)}
                className="py-2.5 px-4 rounded-xl border border-slate-200 text-xs font-semibold text-slate-500 hover:bg-slate-50 active:scale-95 transition-all"
              >
                ยกเลิก
              </button>
              <button
                type="submit"
                disabled={isPending}
                className="py-2.5 px-5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold shadow-md shadow-rose-100 hover:shadow-lg active:scale-95 transition-all flex items-center justify-center gap-1.5"
              >
                {isPending ? "กำลังบันทึก..." : "ยืนยันการคืนสินค้า"}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
