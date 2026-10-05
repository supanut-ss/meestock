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
  DBSaleOrder,
} from "@/lib/dbActions";
import MeeDataGrid from "@/components/ui/MeeDataGrid";
import StatusBadge from "@/components/ui/StatusBadge";
import ConfirmDialog from "@/components/ui/ConfirmDialog";
import { useNotification } from "@/components/ui/NotificationProvider";
import { GridColDef, GridRenderCellParams, GridRowSelectionModel } from "@mui/x-data-grid";
import { Box, Tooltip, IconButton, Button } from "@mui/material";
import EditOutlinedIcon from "@mui/icons-material/EditOutlined";
import PrintOutlinedIcon from "@mui/icons-material/PrintOutlined";
import DeleteOutlineOutlinedIcon from "@mui/icons-material/DeleteOutlineOutlined";
import AssignmentReturnOutlinedIcon from "@mui/icons-material/AssignmentReturnOutlined";
import LocalShippingOutlinedIcon from "@mui/icons-material/LocalShippingOutlined";
import ReceiptLongOutlinedIcon from "@mui/icons-material/ReceiptLongOutlined";
import RefreshIcon from "@mui/icons-material/Refresh";

export default function OrdersHistoryView() {
  const [activeTab, setActiveTab] = useState<"shipments" | "sales">("shipments");
  const [loading, setLoading] = useState(true);
  const [isPending, startTransition] = useTransition();
  const { notifySuccess, notifyError, notifyWarning, notifyInfo } = useNotification();

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
  const [deleteTargetOrder, setDeleteTargetOrder] = useState<DBShipmentOrder | null>(null);
  const [selectedShipmentIds, setSelectedShipmentIds] = useState<GridRowSelectionModel>({
    type: "include",
    ids: new Set(),
  });

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
      const dbOrders = await getShipmentOrders("", statusFilter);
      setShipments(dbOrders);
    } catch (err) {
      console.error("Failed to load shipment orders:", err);
      notifyError("ไม่สามารถดึงข้อมูลรายการจัดส่งได้");
    } finally {
      setLoading(false);
    }
  };

  // Load Sales
  const loadSales = async () => {
    setLoading(true);
    try {
      const dbSales = await getSaleOrders("");
      setSaleOrders(dbSales);
    } catch (err) {
      console.error("Failed to load sale orders:", err);
      notifyError("ไม่สามารถดึงข้อมูลประวัติการขายได้");
    } finally {
      setLoading(false);
    }
  };

  // Run load on filter/tab changes
  useEffect(() => {
    if (activeTab === "shipments") {
      void loadShipments();
    } else {
      void loadSales();
    }
  }, [statusFilter, activeTab]);

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
        notifySuccess("อัปเดตข้อมูลพัสดุเรียบร้อยแล้ว");
        setEditingOrder(null);
        void loadShipments();
      } else {
        notifyError("ไม่สามารถบันทึกเลขพัสดุได้");
      }
    } catch (err) {
      console.error(err);
      notifyError("เกิดข้อผิดพลาดในการเชื่อมต่อฐานข้อมูล");
    } finally {
      setIsUpdatingTracking(false);
    }
  };

  // Delete Order (Shipments)
  const confirmDeleteOrder = async () => {
    if (!deleteTargetOrder) return;
    try {
      const success = await deleteShipmentOrder(deleteTargetOrder.id);
      if (success) {
        notifySuccess(`ลบคำสั่งซื้อ ${deleteTargetOrder.orderNo} เรียบร้อยแล้ว`);
        setDeleteTargetOrder(null);
        void loadShipments();
      } else {
        notifyError("ไม่สามารถลบคำสั่งซื้อได้");
      }
    } catch (err) {
      console.error(err);
      notifyError("เกิดข้อผิดพลาดในการลบคำสั่งซื้อ");
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

  // Batch Print Labels
  const handleBatchPrint = () => {
    if (selectedShipmentIds.ids.size === 0) {
      notifyWarning("กรุณาเลือกรายการที่ต้องการพิมพ์ใบปะหน้า");
      return;
    }
    const firstId = Array.from(selectedShipmentIds.ids)[0];
    const firstSelected = shipments.find((s) => s.id === firstId);
    if (firstSelected) {
      handlePrintLabel(firstSelected);
      notifyInfo(`กำลังเปิดหน้าต่างพิมพ์ใบปะหน้าสำหรับ ${selectedShipmentIds.ids.size} รายการที่เลือก`);
    }
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
        costPrice: item.costPrice || 0,
      }))
      .filter((i) => i.qty > 0);

    if (itemsToReturn.length === 0) {
      setReturnError("กรุณาระบุจำนวนสินค้าที่ต้องการคืนอย่างน้อย 1 ชิ้น");
      return;
    }

    startTransition(async () => {
      try {
        const result = await returnOrder(returningOrder.id, itemsToReturn, returnNote);
        if (result.success) {
          notifySuccess("บันทึกการคืนสินค้าและปรับยอดสต็อกคืนคลังเรียบร้อยแล้ว");
          setReturningOrder(null);
          void loadSales();
        } else {
          setReturnError(result.error || "เกิดข้อผิดพลาดในการบันทึกการคืนสินค้า");
        }
      } catch (err) {
        console.error(err);
        setReturnError("เกิดข้อผิดพลาดของระบบ ไม่สามารถประมวลผลได้");
      }
    });
  };

  // Shipments Columns
  const shipmentColumns = useMemo<GridColDef<DBShipmentOrder>[]>(
    () => [
      {
        field: "createdAt",
        headerName: "วันที่บันทึก",
        minWidth: 160,
        flex: 1,
        renderCell: (params: GridRenderCellParams<DBShipmentOrder, string>) => (
          <span className="text-xs font-medium text-slate-500">
            {params.value || "-"}
          </span>
        ),
      },
      {
        field: "orderNo",
        headerName: "รหัสออเดอร์",
        minWidth: 140,
        flex: 1,
        renderCell: (params: GridRenderCellParams<DBShipmentOrder, string>) => (
          <span className="font-mono text-xs font-bold text-slate-800 bg-slate-100 px-2 py-0.5 rounded">
            {params.value || "-"}
          </span>
        ),
      },
      {
        field: "receiverName",
        headerName: "ข้อมูลผู้รับ",
        minWidth: 260,
        flex: 2,
        renderCell: (params: GridRenderCellParams<DBShipmentOrder, string>) => (
          <Box sx={{ display: "flex", flexDirection: "column", justifyContent: "center", py: 0.5, overflow: "hidden" }}>
            <span className="font-semibold text-slate-800 text-xs">
              {params.value}
            </span>
            <span className="font-mono text-[11px] text-slate-500 font-semibold">
              {params.row.receiverPhone}
            </span>
            <span className="text-[11px] text-slate-400 truncate mt-0.5" title={params.row.receiverAddress}>
              {params.row.receiverAddress}
            </span>
          </Box>
        ),
      },
      {
        field: "status",
        headerName: "สถานะการจัดส่ง",
        minWidth: 140,
        headerAlign: "center",
        align: "center",
        renderCell: (params: GridRenderCellParams<DBShipmentOrder, string>) => {
          const val = params.value || "Confirmed";
          const isShipped = val === "Shipped";
          const isCancelled = val === "Cancelled";
          const label = isCancelled ? "ยกเลิก" : isShipped ? "จัดส่งแล้ว" : "เตรียมจัดส่ง";
          const variant = isCancelled ? "error" : isShipped ? "success" : "indigo";
          return <StatusBadge label={label} variant={variant} />;
        },
      },
      {
        field: "trackingNo",
        headerName: "เลขพัสดุ (Tracking)",
        minWidth: 160,
        flex: 1.2,
        renderCell: (params: GridRenderCellParams<DBShipmentOrder, string>) => (
          params.value ? (
            <span className="font-mono font-semibold text-xs text-indigo-700 bg-indigo-50 border border-indigo-100 px-2.5 py-1 rounded-md">
              {params.value}
            </span>
          ) : (
            <span className="text-slate-400 text-xs italic">ไม่มีข้อมูล</span>
          )
        ),
      },
      {
        field: "actions",
        headerName: "จัดการ",
        sortable: false,
        filterable: false,
        minWidth: 150,
        headerAlign: "center",
        align: "center",
        renderCell: (params: GridRenderCellParams<DBShipmentOrder>) => {
          const o = params.row;
          return (
            <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
              <Tooltip title="แก้ไขเลขพัสดุ / สถานะ">
                <IconButton
                  size="small"
                  onClick={() => openEditModal(o)}
                  sx={{
                    color: "#64748b",
                    border: "1px solid #e2e8f0",
                    borderRadius: "8px",
                    "&:hover": { color: "#4f46e5", backgroundColor: "#eef2ff" },
                  }}
                >
                  <EditOutlinedIcon sx={{ fontSize: 16 }} />
                </IconButton>
              </Tooltip>

              <Tooltip title="พิมพ์ใบปะหน้า 100x150mm">
                <IconButton
                  size="small"
                  onClick={() => handlePrintLabel(o)}
                  sx={{
                    color: "#64748b",
                    border: "1px solid #e2e8f0",
                    borderRadius: "8px",
                    "&:hover": { color: "#059669", backgroundColor: "#ecfdf5" },
                  }}
                >
                  <PrintOutlinedIcon sx={{ fontSize: 16 }} />
                </IconButton>
              </Tooltip>

              <Tooltip title="ลบออเดอร์">
                <IconButton
                  size="small"
                  onClick={() => setDeleteTargetOrder(o)}
                  sx={{
                    color: "#64748b",
                    border: "1px solid #e2e8f0",
                    borderRadius: "8px",
                    "&:hover": { color: "#dc2626", backgroundColor: "#fef2f2" },
                  }}
                >
                  <DeleteOutlineOutlinedIcon sx={{ fontSize: 16 }} />
                </IconButton>
              </Tooltip>
            </Box>
          );
        },
      },
    ],
    []
  );

  // Sales Columns
  const saleColumns = useMemo<GridColDef<DBSaleOrder>[]>(
    () => [
      {
        field: "createdAt",
        headerName: "วันที่ทำรายการ",
        minWidth: 160,
        flex: 1,
        renderCell: (params: GridRenderCellParams<DBSaleOrder, string>) => (
          <span className="text-xs font-medium text-slate-500">
            {params.value || "-"}
          </span>
        ),
      },
      {
        field: "invoiceNo",
        headerName: "เลขที่ใบเสร็จ",
        minWidth: 150,
        flex: 1,
        valueGetter: (_value, row) => row.invoiceNo || row.orderNo,
        renderCell: (params: GridRenderCellParams<DBSaleOrder, string>) => (
          <span className="font-mono text-xs font-bold text-slate-800 bg-slate-100 px-2 py-0.5 rounded">
            {params.value}
          </span>
        ),
      },
      {
        field: "items",
        headerName: "รายการสินค้า",
        minWidth: 260,
        flex: 2,
        sortable: false,
        renderCell: (params: GridRenderCellParams<DBSaleOrder, DBSaleOrder["items"]>) => {
          const items = params.value || [];
          return (
            <Box sx={{ display: "flex", flexDirection: "column", justifyContent: "center", py: 0.5, overflow: "hidden" }}>
              {items.slice(0, 2).map((item, idx) => (
                <span key={idx} className="text-xs text-slate-700 truncate">
                  • {item.productName} <strong className="text-indigo-600 font-mono">(x{item.qty})</strong>
                </span>
              ))}
              {items.length > 2 && (
                <span className="text-[10px] text-slate-400 font-medium">
                  + อีก {items.length - 2} รายการ
                </span>
              )}
            </Box>
          );
        },
      },
      {
        field: "totalAmount",
        headerName: "ยอดรวมขาย",
        type: "number",
        minWidth: 130,
        headerAlign: "right",
        align: "right",
        renderCell: (params: GridRenderCellParams<DBSaleOrder, number>) => (
          <span className="font-bold text-violet-700 text-sm">
            ฿{(params.value || 0).toLocaleString()}
          </span>
        ),
      },
      {
        field: "status",
        headerName: "สถานะบิล",
        minWidth: 130,
        headerAlign: "center",
        align: "center",
        renderCell: (params: GridRenderCellParams<DBSaleOrder, string>) => {
          const isReturned = params.value === "Returned";
          return (
            <StatusBadge
              label={isReturned ? "คืนสินค้าแล้ว" : "สำเร็จ"}
              variant={isReturned ? "warning" : "success"}
            />
          );
        },
      },
      {
        field: "note",
        headerName: "หมายเหตุ",
        minWidth: 160,
        flex: 1,
        renderCell: (params: GridRenderCellParams<DBSaleOrder, string>) => (
          <span className="text-xs text-slate-400 truncate" title={params.value || ""}>
            {params.value || "-"}
          </span>
        ),
      },
      {
        field: "actions",
        headerName: "จัดการ",
        sortable: false,
        filterable: false,
        minWidth: 180,
        headerAlign: "center",
        align: "center",
        renderCell: (params: GridRenderCellParams<DBSaleOrder>) => {
          const s = params.row;
          const isReturned = s.status === "Returned";
          return (
            <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
              <button
                type="button"
                onClick={() => handlePrintReceipt(s)}
                className="py-1 px-2.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 hover:text-indigo-600 text-xs font-semibold transition-all shadow-sm flex items-center gap-1 cursor-pointer"
                title="พิมพ์ใบเสร็จพิมพ์ซ้ำ"
              >
                <PrintOutlinedIcon sx={{ fontSize: 14 }} />
                พิมพ์บิล
              </button>

              <button
                type="button"
                onClick={() => openReturnModal(s)}
                disabled={isReturned}
                className={`py-1 px-2.5 rounded-lg border text-xs font-semibold transition-all shadow-sm flex items-center gap-1 ${
                  isReturned
                    ? "bg-slate-50 text-slate-300 border-slate-100 cursor-not-allowed"
                    : "bg-white border-slate-200 text-rose-500 hover:bg-rose-50 hover:border-rose-200 active:scale-95 cursor-pointer"
                }`}
                title="คืนสินค้าเข้าคลัง"
              >
                <AssignmentReturnOutlinedIcon sx={{ fontSize: 14 }} />
                คืนสินค้า
              </button>
            </Box>
          );
        },
      },
    ],
    []
  );

  return (
    <div className="space-y-6">
      {/* Header and Quick Stats */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 tracking-tight">
            ประวัติคำสั่งซื้อและการขาย
          </h1>
          <p className="text-slate-500 text-sm">
            จัดการและติดตามรายการจัดส่งสินค้า (Shipments) และประวัติบิลการขาย (Sales & Returns)
          </p>
        </div>

        {/* Global actions */}
        <div className="flex items-center gap-2">
          {activeTab === "shipments" && selectedShipmentIds.ids.size > 0 && (
            <Button
              variant="outlined"
              size="small"
              onClick={handleBatchPrint}
              startIcon={<PrintOutlinedIcon />}
              sx={{
                fontWeight: 600,
                color: "#4f46e5",
                borderColor: "#c7d2fe",
                backgroundColor: "#eef2ff",
                "&:hover": { backgroundColor: "#e0e7ff" },
              }}
            >
              พิมพ์ใบปะหน้าที่เลือก ({selectedShipmentIds.ids.size})
            </Button>
          )}

          <Tooltip title="รีเฟรชข้อมูล">
            <IconButton
              onClick={activeTab === "shipments" ? loadShipments : loadSales}
              sx={{
                p: 1.2,
                borderRadius: "12px",
                border: "1px solid #e2e8f0",
                backgroundColor: "#ffffff",
                boxShadow: "0 1px 2px 0 rgba(0, 0, 0, 0.05)",
                "&:hover": { backgroundColor: "#f8fafc" },
              }}
            >
              <RefreshIcon
                sx={{
                  fontSize: 18,
                  color: loading ? "#6366f1" : "#64748b",
                  animation: loading ? "spin 1s linear infinite" : "none",
                  "@keyframes spin": {
                    "0%": { transform: "rotate(0deg)" },
                    "100%": { transform: "rotate(360deg)" },
                  },
                }}
              />
            </IconButton>
          </Tooltip>
        </div>
      </div>

      {/* Modern Tabs Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 pb-3">
        <div className="flex items-center gap-2 bg-slate-100 p-1 rounded-2xl">
          <button
            onClick={() => setActiveTab("shipments")}
            className={`flex items-center gap-2 px-5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeTab === "shipments"
                ? "bg-white text-indigo-600 shadow-sm"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <LocalShippingOutlinedIcon sx={{ fontSize: 16 }} />
            รายการพัสดุและใบปะหน้า ({shipments.length})
          </button>
          <button
            onClick={() => setActiveTab("sales")}
            className={`flex items-center gap-2 px-5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeTab === "sales"
                ? "bg-white text-indigo-600 shadow-sm"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <ReceiptLongOutlinedIcon sx={{ fontSize: 16 }} />
            บิลการขาย & การคืนสินค้า ({saleOrders.length})
          </button>
        </div>

        {activeTab === "shipments" && (
          <div className="flex items-center gap-1.5">
            <span className="text-xs font-semibold text-slate-500 mr-1">สถานะ:</span>
            {(["All", "Confirmed", "Shipped", "Cancelled"] as const).map((s) => {
              const label =
                s === "All"
                  ? "ทั้งหมด"
                  : s === "Confirmed"
                  ? "เตรียมจัดส่ง"
                  : s === "Shipped"
                  ? "จัดส่งแล้ว"
                  : "ยกเลิก";
              const isActive = statusFilter === s;
              return (
                <button
                  key={s}
                  onClick={() => setStatusFilter(s)}
                  className={`px-3 py-1 text-xs font-semibold rounded-full border transition-all cursor-pointer ${
                    isActive
                      ? "bg-indigo-50 text-indigo-700 border-indigo-200"
                      : "bg-white text-slate-500 border-slate-200 hover:bg-slate-50"
                  }`}
                >
                  {label}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Main Tab Views with MUI X DataGrid */}
      {activeTab === "shipments" ? (
        <MeeDataGrid
          rows={shipments}
          columns={shipmentColumns}
          loading={loading}
          checkboxSelection
          onRowSelectionModelChange={(newModel) => setSelectedShipmentIds(newModel)}
          quickFilterPlaceholder="ค้นหารหัสออเดอร์, ชื่อผู้รับ, เบอร์โทร, เลขพัสดุ..."
          autoHeight
          rowHeight={72}
        />
      ) : (
        <MeeDataGrid
          rows={saleOrders}
          columns={saleColumns}
          loading={loading}
          quickFilterPlaceholder="ค้นหาเลขที่ใบเสร็จ, รหัสออเดอร์, สินค้า, หมายเหตุ..."
          autoHeight
          rowHeight={64}
        />
      )}

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
          <div
            ref={printSaleRef}
            style={{
              width: "210mm",
              padding: "20mm",
              fontFamily: "sans-serif",
              background: "white",
              color: "#000",
            }}
          >
            <div style={{ borderBottom: "2px solid #000", paddingBottom: "8mm", marginBottom: "8mm" }}>
              <h1 style={{ fontSize: "24px", fontWeight: "bold", margin: 0 }}>ใบเสร็จรับเงิน / ใบส่งของ</h1>
              <p style={{ margin: "2mm 0 0 0", color: "#666" }}>MeeStock Store Management</p>
            </div>

            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "8mm" }}>
              <div>
                <p style={{ margin: 0, fontWeight: "bold" }}>เลขที่ใบเสร็จ: {printingSale.invoiceNo || printingSale.orderNo}</p>
                <p style={{ margin: "1mm 0 0 0", color: "#666" }}>วันที่ทำรายการ: {printingSale.createdAt}</p>
              </div>
              <div style={{ textAlign: "right" }}>
                <p style={{ margin: 0, fontWeight: "bold" }}>สถานะบิล: {printingSale.status === "Returned" ? "คืนสินค้าแล้ว" : "ชำระเงินเรียบร้อย"}</p>
              </div>
            </div>

            <table style={{ width: "100%", borderCollapse: "collapse", marginBottom: "8mm" }}>
              <thead>
                <tr style={{ borderBottom: "1px solid #000", textAlign: "left" }}>
                  <th style={{ padding: "3mm 0" }}>ลำดับ</th>
                  <th style={{ padding: "3mm 0" }}>รายการสินค้า</th>
                  <th style={{ padding: "3mm 0", textAlign: "right" }}>ราคา/หน่วย</th>
                  <th style={{ padding: "3mm 0", textAlign: "right" }}>จำนวน</th>
                  <th style={{ padding: "3mm 0", textAlign: "right" }}>รวมเงิน</th>
                </tr>
              </thead>
              <tbody>
                {printingSale.items.map((it, idx) => (
                  <tr key={idx} style={{ borderBottom: "1px solid #ddd" }}>
                    <td style={{ padding: "3mm 0" }}>{idx + 1}</td>
                    <td style={{ padding: "3mm 0" }}>{it.productName}</td>
                    <td style={{ padding: "3mm 0", textAlign: "right" }}>฿{it.unitPrice.toLocaleString()}</td>
                    <td style={{ padding: "3mm 0", textAlign: "right" }}>{it.qty}</td>
                    <td style={{ padding: "3mm 0", textAlign: "right" }}>฿{(it.unitPrice * it.qty).toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            <div style={{ display: "flex", justifyContent: "flex-end" }}>
              <div style={{ width: "60mm" }}>
                <div style={{ display: "flex", justifyContent: "space-between", padding: "2mm 0" }}>
                  <span>ยอดรวมทั้งสิ้น:</span>
                  <span style={{ fontWeight: "bold", fontSize: "16px" }}>฿{printingSale.totalAmount.toLocaleString()}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ====================================================== */}
      {/* Edit Tracking Modal (Shipments)                        */}
      {/* ====================================================== */}
      {editingOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            onClick={() => setEditingOrder(null)}
            className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
          />
          <div className="relative w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl border border-slate-100 flex flex-col gap-4 animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base font-bold text-slate-800">
                แก้ไขพัสดุ: {editingOrder.orderNo}
              </h3>
              <button
                onClick={() => setEditingOrder(null)}
                className="text-slate-400 hover:text-slate-600 rounded-lg p-1 hover:bg-slate-100"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveTracking} className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-slate-600">เลขพัสดุ (Tracking No.)</label>
                <input
                  type="text"
                  placeholder="ระบุเลขพัสดุ Flash, J&T, Kerry..."
                  value={trackingNoInput}
                  onChange={(e) => setTrackingNoInput(e.target.value)}
                  className="mt-1 w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-600">สถานะคำสั่งซื้อ</label>
                <select
                  value={statusInput}
                  onChange={(e) => setStatusInput(e.target.value as "Confirmed" | "Shipped" | "Cancelled")}
                  className="mt-1 w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 focus:outline-none bg-white font-semibold"
                >
                  <option value="Confirmed">เตรียมจัดส่ง (Confirmed)</option>
                  <option value="Shipped">จัดส่งแล้ว (Shipped)</option>
                  <option value="Cancelled">ยกเลิกคำสั่งซื้อ (Cancelled)</option>
                </select>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setEditingOrder(null)}
                  className="py-2 px-4 rounded-xl border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-50"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  disabled={isUpdatingTracking}
                  className="py-2 px-5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-sm disabled:opacity-50"
                >
                  {isUpdatingTracking ? "กำลังบันทึก..." : "บันทึกข้อมูล"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ====================================================== */}
      {/* Return Order Modal (Sales)                             */}
      {/* ====================================================== */}
      {returningOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            onClick={() => setReturningOrder(null)}
            className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
          />
          <div className="relative w-full max-w-lg rounded-3xl bg-white p-6 shadow-2xl border border-slate-100 flex flex-col gap-4 max-h-[85vh] animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-base font-bold text-slate-800">
                  ทำรายการคืนสินค้า (Return Order)
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  บิล: {returningOrder.invoiceNo || returningOrder.orderNo}
                </p>
              </div>
              <button
                onClick={() => setReturningOrder(null)}
                className="text-slate-400 hover:text-slate-600 rounded-lg p-1 hover:bg-slate-100"
              >
                ✕
              </button>
            </div>

            {returnError && (
              <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold">
                {returnError}
              </div>
            )}

            <form onSubmit={handleReturnSubmit} className="space-y-4 overflow-y-auto pr-1">
              <div className="space-y-3">
                <p className="text-xs font-semibold text-slate-700">ระบุจำนวนสินค้าที่ต้องการคืน:</p>
                <div className="space-y-2">
                  {returningOrder.items.map((item) => (
                    <div
                      key={item.productId}
                      className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-200"
                    >
                      <div>
                        <p className="text-xs font-bold text-slate-800">{item.productName}</p>
                        <p className="text-[10px] text-slate-500 font-mono">
                          ซื้อแล้ว: {item.qty} ชิ้น @ ฿{item.unitPrice.toLocaleString()}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-slate-500 font-medium">คืน:</span>
                        <input
                          type="number"
                          min="0"
                          max={item.qty}
                          value={returnItemQtys[item.productId] ?? 0}
                          onChange={(e) =>
                            setReturnItemQtys({
                              ...returnItemQtys,
                              [item.productId]: Math.min(item.qty, Math.max(0, Number(e.target.value) || 0)),
                            })
                          }
                          className="w-16 px-2 py-1 text-center font-bold text-xs rounded-lg border border-slate-300 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                        />
                        <span className="text-xs text-slate-500">ชิ้น</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-600">เหตุผลในการคืนสินค้า</label>
                <textarea
                  rows={2}
                  placeholder="ระบุเหตุผล เช่น สินค้าชำรุด, ลูกค้าเปลี่ยนใจ..."
                  value={returnNote}
                  onChange={(e) => setReturnNote(e.target.value)}
                  className="mt-1 w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 focus:outline-none"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setReturningOrder(null)}
                  className="py-2 px-4 rounded-xl border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-50"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  disabled={isPending}
                  className="py-2 px-5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold shadow-sm disabled:opacity-50"
                >
                  {isPending ? "กำลังบันทึกคืนสินค้า..." : "ยืนยันการคืนสินค้า"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Confirm Delete Shipment Order Dialog */}
      <ConfirmDialog
        open={Boolean(deleteTargetOrder)}
        title="ยืนยันการลบคำสั่งซื้อ"
        message={`คุณแน่ใจหรือไม่ที่จะลบคำสั่งซื้อหมายเลข "${deleteTargetOrder?.orderNo}"? ข้อมูลนี้จะหายไปจากฐานข้อมูลถาวร`}
        confirmText="ลบคำสั่งซื้อ"
        cancelText="ยกเลิก"
        isDestructive
        onConfirm={confirmDeleteOrder}
        onClose={() => setDeleteTargetOrder(null)}
      />
    </div>
  );
}
