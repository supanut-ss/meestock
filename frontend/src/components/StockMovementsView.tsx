"use client";

import { useEffect, useMemo, useState } from "react";
import { getStockMovements, DBStockMovement } from "@/lib/dbActions";
import MeeDataGrid from "@/components/ui/MeeDataGrid";
import { GridColDef, GridRenderCellParams } from "@mui/x-data-grid";
import { Chip, Tooltip, IconButton } from "@mui/material";
import RefreshIcon from "@mui/icons-material/Refresh";
import ContentCopyIcon from "@mui/icons-material/ContentCopy";
import TrendingUpIcon from "@mui/icons-material/TrendingUp";
import TrendingDownIcon from "@mui/icons-material/TrendingDown";
import { useNotification } from "@/components/ui/NotificationProvider";

export default function StockMovementsView() {
  const [movements, setMovements] = useState<DBStockMovement[]>([]);
  const [loading, setLoading] = useState(true);
  const [typeFilter, setTypeFilter] = useState<"All" | "In" | "Out">("All");
  const { notifySuccess, notifyWarning } = useNotification();

  const loadMovements = async () => {
    setLoading(true);
    try {
      const data = await getStockMovements("", typeFilter);
      setMovements(data);
    } catch (err) {
      console.error("Failed to load stock movements:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadMovements();
  }, [typeFilter]);

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
      notifyWarning("ไม่มีประวัติข้อมูลที่จะส่งออก");
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
      notifySuccess("คัดลอกรายงานประวัติสต็อกไปยัง Clipboard สำเร็จ!");
    });
  };

  const columns = useMemo<GridColDef<DBStockMovement>[]>(
    () => [
      {
        field: "createdAt",
        headerName: "วัน-เวลาทำรายการ",
        minWidth: 170,
        flex: 1,
        renderCell: (params: GridRenderCellParams<DBStockMovement, string>) => (
          <span className="text-xs font-medium text-slate-600">
            {params.value || "-"}
          </span>
        ),
      },
      {
        field: "sku",
        headerName: "รหัส SKU",
        minWidth: 130,
        flex: 1,
        renderCell: (params: GridRenderCellParams<DBStockMovement, string>) => (
          <span className="font-mono text-xs font-semibold text-slate-700 bg-slate-100 px-2 py-0.5 rounded">
            {params.value || "-"}
          </span>
        ),
      },
      {
        field: "barcode",
        headerName: "บาร์โค้ด",
        minWidth: 130,
        flex: 1,
        renderCell: (params: GridRenderCellParams<DBStockMovement, string>) => (
          <span className="font-mono text-xs text-slate-500">
            {params.value || "-"}
          </span>
        ),
      },
      {
        field: "productName",
        headerName: "ชื่อสินค้า",
        minWidth: 200,
        flex: 1.5,
        renderCell: (params: GridRenderCellParams<DBStockMovement, string>) => (
          <span className="font-semibold text-slate-800 truncate" title={params.value}>
            {params.value || "-"}
          </span>
        ),
      },
      {
        field: "movementType",
        headerName: "ประเภท",
        minWidth: 120,
        headerAlign: "center",
        align: "center",
        renderCell: (params: GridRenderCellParams<DBStockMovement, string>) => {
          const isIn = params.value === "In";
          return (
            <Chip
              size="small"
              icon={isIn ? <TrendingUpIcon sx={{ fontSize: "14px !important" }} /> : <TrendingDownIcon sx={{ fontSize: "14px !important" }} />}
              label={isIn ? "รับเข้า" : "เบิกออก"}
              sx={{
                fontWeight: 700,
                fontSize: "0.75rem",
                borderRadius: "9999px",
                backgroundColor: isIn ? "#ecfdf5" : "#fef2f2",
                color: isIn ? "#047857" : "#b91c1c",
                border: isIn ? "1px solid #a7f3d0" : "1px solid #fecaca",
                "& .MuiChip-icon": {
                  color: isIn ? "#059669" : "#dc2626",
                },
              }}
            />
          );
        },
      },
      {
        field: "qty",
        headerName: "จำนวนสินค้า",
        type: "number",
        minWidth: 120,
        headerAlign: "right",
        align: "right",
        renderCell: (params: GridRenderCellParams<DBStockMovement, number>) => {
          const isIn = params.row.movementType === "In";
          const qty = params.value || 0;
          return (
            <span
              className={`font-bold text-sm ${
                isIn ? "text-emerald-600" : "text-rose-600"
              }`}
            >
              {isIn ? `+${qty}` : `-${Math.abs(qty)}`}
            </span>
          );
        },
      },
      {
        field: "reason",
        headerName: "เหตุผลทำรายการ",
        minWidth: 180,
        flex: 1.2,
        renderCell: (params: GridRenderCellParams<DBStockMovement, string>) => {
          const reasonText =
            params.value === "manual_adjust"
              ? "ปรับสต็อกด้วยตนเอง"
              : params.value === "stock_in"
              ? "รับเข้าคลังสินค้า"
              : params.value === "sale_out"
              ? "ขายสินค้าออก"
              : params.value || "-";
          return (
            <span className="bg-slate-100 text-slate-700 px-2.5 py-1 rounded-md text-xs font-medium border border-slate-200">
              {reasonText}
            </span>
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
            ประวัติการรับเข้า-เบิกออกสินค้า
          </h1>
          <p className="text-slate-500 text-sm">
            ตรวจสอบความเคลื่อนไหวสต็อกสินค้าคงคลัง การปรับปรุงสต็อก และประวัติการทำรายการ
          </p>
        </div>

        {/* Global actions */}
        <div className="flex items-center gap-3">
          <button
            onClick={handleExportLedger}
            className="py-2.5 px-4 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 active:scale-95 text-slate-600 text-xs font-semibold shadow-sm transition-all flex items-center gap-1.5"
          >
            <ContentCopyIcon sx={{ fontSize: 16, color: "#64748b" }} />
            คัดลอกสมุดบัญชีสต็อก
          </button>

          <Tooltip title="รีเฟรชข้อมูล">
            <IconButton
              onClick={loadMovements}
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

      {/* Metrics Card Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Total In */}
        <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm hover:shadow transition-all duration-300 border-emerald-100/70 text-emerald-600">
          <div className="flex justify-between items-start">
            <div className="space-y-2">
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                จำนวนสินค้ารับเข้ารวม
              </p>
              <div className="flex items-baseline gap-1.5">
                <span className="text-3xl font-extrabold text-slate-800 tracking-tight">
                  +{stats.totalIn.toLocaleString()}
                </span>
                <span className="text-xs font-semibold text-slate-500">ชิ้น</span>
              </div>
            </div>
            <div className="p-2.5 rounded-xl bg-white border border-slate-100 shadow-sm text-emerald-600">
              <TrendingUpIcon sx={{ fontSize: 24 }} />
            </div>
          </div>
          <div className="mt-4 pt-3 border-t border-slate-100/60 flex items-center justify-between text-xs font-semibold text-slate-400">
            <span>สต็อกนำเข้ายอดรวมสะสม</span>
          </div>
        </div>

        {/* Total Out */}
        <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm hover:shadow transition-all duration-300 border-rose-100/70 text-rose-600">
          <div className="flex justify-between items-start">
            <div className="space-y-2">
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                จำนวนสินค้าเบิกออกรวม
              </p>
              <div className="flex items-baseline gap-1.5">
                <span className="text-3xl font-extrabold text-slate-800 tracking-tight">
                  -{stats.totalOut.toLocaleString()}
                </span>
                <span className="text-xs font-semibold text-slate-500">ชิ้น</span>
              </div>
            </div>
            <div className="p-2.5 rounded-xl bg-white border border-slate-100 shadow-sm text-rose-600">
              <TrendingDownIcon sx={{ fontSize: 24 }} />
            </div>
          </div>
          <div className="mt-4 pt-3 border-t border-slate-100/60 flex items-center justify-between text-xs font-semibold text-slate-400">
            <span>สต็อกเบิกจำหน่ายและตัดยอดสะสม</span>
          </div>
        </div>
      </div>

      {/* Movement Type Filter Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 p-4 rounded-2xl bg-white border border-slate-200 shadow-sm">
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-slate-500">กรองประเภท:</span>
          {(["All", "In", "Out"] as const).map((t) => {
            const label =
              t === "All"
                ? "ทั้งหมด"
                : t === "In"
                ? "📥 รับสินค้าเข้า"
                : "📤 เบิกสินค้าออก";
            const isActive = typeFilter === t;
            let activeStyle =
              "bg-indigo-50 text-indigo-600 border-indigo-200 font-bold";
            if (t === "In" && isActive)
              activeStyle =
                "bg-emerald-50 text-emerald-700 border-emerald-300 font-bold";
            if (t === "Out" && isActive)
              activeStyle = "bg-rose-50 text-rose-700 border-rose-300 font-bold";

            return (
              <button
                key={t}
                onClick={() => setTypeFilter(t)}
                className={`px-3.5 py-1.5 text-xs rounded-full border transition-all ${
                  isActive
                    ? activeStyle
                    : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
                }`}
              >
                {label}
              </button>
            );
          })}
        </div>

        <div className="text-xs text-slate-500 font-medium">
          แสดงข้อมูล <span className="font-bold text-slate-800">{movements.length}</span> รายการ
        </div>
      </div>

      {/* MUI X DataGrid Container */}
      <MeeDataGrid
        rows={movements}
        columns={columns}
        loading={loading}
        quickFilterPlaceholder="ค้นหาวันที่, SKU, บาร์โค้ด, ชื่อสินค้า, เหตุผล..."
        autoHeight
      />
    </div>
  );
}
