"use client";

import { useEffect, useMemo, useState } from "react";
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
import MeeDataGrid from "@/components/ui/MeeDataGrid";
import StatusBadge from "@/components/ui/StatusBadge";
import { useNotification } from "@/components/ui/NotificationProvider";
import { GridColDef, GridRenderCellParams } from "@mui/x-data-grid";
import { Box, Tooltip, IconButton, Chip } from "@mui/material";
import FileDownloadOutlinedIcon from "@mui/icons-material/FileDownloadOutlined";
import RefreshIcon from "@mui/icons-material/Refresh";
import Inventory2OutlinedIcon from "@mui/icons-material/Inventory2Outlined";
import MonetizationOnOutlinedIcon from "@mui/icons-material/MonetizationOnOutlined";
import EmojiEventsOutlinedIcon from "@mui/icons-material/EmojiEventsOutlined";
import HourglassEmptyOutlinedIcon from "@mui/icons-material/HourglassEmptyOutlined";
import WarningAmberOutlinedIcon from "@mui/icons-material/WarningAmberOutlined";

type ReportTab = "inventory" | "profit" | "best" | "slow" | "expiry";

export default function ReportsView({ isAdmin = true }: { isAdmin?: boolean }) {
  const [activeTab, setActiveTab] = useState<ReportTab>("inventory");
  const [loading, setLoading] = useState(true);
  const { notifySuccess, notifyWarning } = useNotification();

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
      } else if (activeTab === "best") {
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
    return [...profit]
      .sort((a, b) => b.qtySold - a.qtySold)
      .slice(0, 10)
      .map((item, index) => ({
        ...item,
        rank: index + 1,
      }));
  }, [profit]);

  // Excel Export Logic
  const handleExportExcel = (data: any[], fileName: string) => {
    if (data.length === 0) {
      notifyWarning("ไม่มีข้อมูลที่จะส่งออก");
      return;
    }
    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "รายงาน MeeStock");
    XLSX.writeFile(workbook, `${fileName}.xlsx`);
    notifySuccess(`ส่งออกไฟล์ ${fileName}.xlsx เรียบร้อยแล้ว`);
  };

  const exportCurrentReport = () => {
    const dateStr = new Date().toISOString().slice(0, 10);
    if (activeTab === "inventory") {
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
      handleExportExcel(exportData, `รายงานสต็อกคงเหลือ_${dateStr}`);
    } else if (activeTab === "profit") {
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
      handleExportExcel(exportData, `รายงานกำไรขาดทุน_${dateStr}`);
    } else if (activeTab === "best") {
      const exportData = bestSellers.map((p) => ({
        "อันดับ": p.rank,
        "SKU": p.sku,
        "ชื่อสินค้า": p.productName,
        "จำนวนที่ขายได้": p.qtySold,
        "ยอดรวมรายได้ขาย (THB)": p.salesTotal,
      }));
      handleExportExcel(exportData, `รายงานสินค้าขายดี10อันดับ_${dateStr}`);
    } else if (activeTab === "slow") {
      const exportData = slowMoving.map((p) => {
        const row: any = {
          "SKU": p.sku,
          "ชื่อสินค้า": p.name,
          "คงค้างสต็อก": p.stockQty,
          "ราคาขาย": p.unitPrice,
          "วันที่มีความเคลื่อนไหวล่าสุด": p.lastMovement || "ไม่มีข้อมูล",
        };
        if (isAdmin) {
          row["ราคาทุน"] = p.costPrice;
        }
        return row;
      });
      handleExportExcel(exportData, `รายงานสินค้าเคลื่อนไหวช้า_${slowDays}วัน_${dateStr}`);
    } else if (activeTab === "expiry") {
      const exportData = expiring.map((p) => ({
        "วันหมดอายุ": p.expiryDate,
        "รหัสสินค้า / SKU": p.sku,
        "ชื่อสินค้า": p.productName,
        "หมายเลข Lot": p.lotNo || "-",
        "จำนวนคงเหลือ Lot": p.qty,
        "ผู้จัดส่ง": p.supplierName || "-",
      }));
      handleExportExcel(exportData, `รายงานสินค้าใกล้หมดอายุ_${expiryDays}วัน_${dateStr}`);
    }
  };

  // ==========================================
  // COLUMNS DEFINITIONS
  // ==========================================

  // 1. Inventory Columns
  const inventoryColumns = useMemo<GridColDef<DBProduct>[]>(() => {
    const cols: GridColDef<DBProduct>[] = [
      {
        field: "sku",
        headerName: "SKU / บาร์โค้ด",
        minWidth: 150,
        flex: 1,
        renderCell: (params: GridRenderCellParams<DBProduct, string>) => (
          <Box sx={{ display: "flex", flexDirection: "column", justifyContent: "center", py: 0.5 }}>
            <span className="font-mono text-xs font-semibold text-slate-700 bg-slate-100 px-2 py-0.5 rounded w-fit">
              {params.value || "-"}
            </span>
            {params.row.barcode && (
              <span className="font-mono text-xs text-slate-400 mt-0.5">
                {params.row.barcode}
              </span>
            )}
          </Box>
        ),
      },
      {
        field: "name",
        headerName: "ชื่อสินค้า",
        minWidth: 240,
        flex: 1.8,
        renderCell: (params: GridRenderCellParams<DBProduct, string>) => (
          <span className="font-semibold text-slate-800 text-xs truncate" title={params.value}>
            {params.value}
          </span>
        ),
      },
      {
        field: "categoryName",
        headerName: "หมวดหมู่",
        minWidth: 130,
        flex: 1,
        renderCell: (params: GridRenderCellParams<DBProduct, string>) =>
          params.value ? (
            <span className="text-xs font-bold text-indigo-600 bg-indigo-50/70 px-2.5 py-1 rounded-full">
              {params.value}
            </span>
          ) : (
            <span className="text-slate-300 text-xs">—</span>
          ),
      },
      {
        field: "unitPrice",
        headerName: "ราคาขาย",
        type: "number",
        minWidth: 110,
        headerAlign: "right",
        align: "right",
        renderCell: (params: GridRenderCellParams<DBProduct, number>) => (
          <span className="font-semibold text-slate-800 text-xs">
            ฿{(params.value || 0).toLocaleString()}
          </span>
        ),
      },
    ];

    if (isAdmin) {
      cols.push({
        field: "costPrice",
        headerName: "ราคาทุน",
        type: "number",
        minWidth: 110,
        headerAlign: "right",
        align: "right",
        renderCell: (params: GridRenderCellParams<DBProduct, number>) => (
          <span className="text-xs font-mono font-semibold text-indigo-600">
            ฿{(params.value || 0).toLocaleString()}
          </span>
        ),
      });
    }

    cols.push({
      field: "stockQty",
      headerName: "คงคลังคลังสินค้า",
      type: "number",
      minWidth: 140,
      headerAlign: "center",
      align: "center",
      renderCell: (params: GridRenderCellParams<DBProduct, number>) => {
        const isLow = (params.value || 0) <= params.row.lowStockThreshold;
        return (
          <span
            className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold ${
              isLow
                ? "text-rose-700 bg-rose-50 ring-1 ring-rose-600/20 animate-pulse"
                : "text-slate-700 bg-slate-100"
            }`}
          >
            <span className={`w-1.5 h-1.5 rounded-full ${isLow ? "bg-rose-500" : "bg-emerald-500"}`} />
            {params.value} {params.row.unit}
          </span>
        );
      },
    });

    if (isAdmin) {
      cols.push({
        field: "totalCost",
        headerName: "มูลค่ารวม (ทุน)",
        type: "number",
        minWidth: 140,
        headerAlign: "right",
        align: "right",
        valueGetter: (_value, row) => row.costPrice * row.stockQty,
        renderCell: (params: GridRenderCellParams<DBProduct, number>) => (
          <span className="font-mono font-bold text-xs text-slate-800">
            ฿{(params.value || 0).toLocaleString()}
          </span>
        ),
      });
    }

    return cols;
  }, [isAdmin]);

  // 2. Profit Columns
  const profitColumns = useMemo<GridColDef<DBProfitReportRow>[]>(() => {
    const cols: GridColDef<DBProfitReportRow>[] = [
      {
        field: "sku",
        headerName: "SKU",
        minWidth: 140,
        flex: 1,
        renderCell: (params: GridRenderCellParams<DBProfitReportRow, string>) => (
          <span className="font-mono text-xs font-bold text-slate-700 bg-slate-100 px-2 py-0.5 rounded">
            {params.value}
          </span>
        ),
      },
      {
        field: "productName",
        headerName: "ชื่อสินค้า",
        minWidth: 220,
        flex: 1.8,
        renderCell: (params: GridRenderCellParams<DBProfitReportRow, string>) => (
          <span className="font-semibold text-slate-800 text-xs truncate" title={params.value}>
            {params.value}
          </span>
        ),
      },
      {
        field: "qtySold",
        headerName: "จำนวนชิ้นที่ขาย",
        type: "number",
        minWidth: 130,
        headerAlign: "center",
        align: "center",
        renderCell: (params: GridRenderCellParams<DBProfitReportRow, number>) => (
          <span className="font-bold text-slate-700 text-xs bg-slate-100 px-2.5 py-1 rounded-full">
            {params.value} ชิ้น
          </span>
        ),
      },
      {
        field: "salesTotal",
        headerName: "ยอดรวมยอดขาย",
        type: "number",
        minWidth: 140,
        headerAlign: "right",
        align: "right",
        renderCell: (params: GridRenderCellParams<DBProfitReportRow, number>) => (
          <span className="font-bold text-indigo-600 text-xs font-mono">
            ฿{(params.value || 0).toLocaleString()}
          </span>
        ),
      },
    ];

    if (isAdmin) {
      cols.push(
        {
          field: "costTotal",
          headerName: "ต้นทุนสะสม",
          type: "number",
          minWidth: 130,
          headerAlign: "right",
          align: "right",
          renderCell: (params: GridRenderCellParams<DBProfitReportRow, number>) => (
            <span className="text-slate-500 font-mono text-xs">
              ฿{(params.value || 0).toLocaleString()}
            </span>
          ),
        },
        {
          field: "profit",
          headerName: "กำไรรวมสุทธิ",
          type: "number",
          minWidth: 140,
          headerAlign: "right",
          align: "right",
          renderCell: (params: GridRenderCellParams<DBProfitReportRow, number>) => {
            const val = params.value || 0;
            return (
              <span
                className={`font-mono font-black text-xs ${
                  val >= 0 ? "text-emerald-600" : "text-rose-600"
                }`}
              >
                ฿{val.toLocaleString()}
              </span>
            );
          },
        }
      );
    }

    return cols;
  }, [isAdmin]);

  // 3. Best Sellers Columns
  const bestColumns = useMemo<GridColDef<any>[]>(
    () => [
      {
        field: "rank",
        headerName: "อันดับ",
        minWidth: 90,
        headerAlign: "center",
        align: "center",
        renderCell: (params: GridRenderCellParams<any, number>) => {
          const rank = params.value || 1;
          const medals: Record<number, string> = { 1: "🥇", 2: "🥈", 3: "🥉" };
          return (
            <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
              <span>{medals[rank] || ""}</span>
              <span
                className={`inline-flex items-center justify-center h-6 w-6 rounded-lg text-xs font-black ${
                  rank === 1
                    ? "bg-amber-100 text-amber-800"
                    : rank === 2
                    ? "bg-slate-200 text-slate-800"
                    : rank === 3
                    ? "bg-orange-100 text-orange-800"
                    : "bg-slate-100 text-slate-600"
                }`}
              >
                {rank}
              </span>
            </Box>
          );
        },
      },
      {
        field: "sku",
        headerName: "SKU",
        minWidth: 140,
        flex: 1,
        renderCell: (params: GridRenderCellParams<any, string>) => (
          <span className="font-mono text-xs font-semibold text-slate-700 bg-slate-100 px-2 py-0.5 rounded">
            {params.value}
          </span>
        ),
      },
      {
        field: "productName",
        headerName: "ชื่อสินค้า",
        minWidth: 240,
        flex: 2,
        renderCell: (params: GridRenderCellParams<any, string>) => (
          <span className="font-bold text-slate-800 text-xs truncate" title={params.value}>
            {params.value}
          </span>
        ),
      },
      {
        field: "qtySold",
        headerName: "จำนวนที่ขายได้",
        type: "number",
        minWidth: 140,
        headerAlign: "center",
        align: "center",
        renderCell: (params: GridRenderCellParams<any, number>) => (
          <span className="font-extrabold text-indigo-600 text-xs bg-indigo-50 px-3 py-1 rounded-full">
            {params.value} ชิ้น
          </span>
        ),
      },
      {
        field: "salesTotal",
        headerName: "ยอดรวมรายได้ขาย",
        type: "number",
        minWidth: 150,
        headerAlign: "right",
        align: "right",
        renderCell: (params: GridRenderCellParams<any, number>) => (
          <span className="font-bold text-slate-800 text-xs font-mono">
            ฿{(params.value || 0).toLocaleString()}
          </span>
        ),
      },
    ],
    []
  );

  // 4. Slow Moving Columns
  const slowColumns = useMemo<GridColDef<DBSlowMovingRow>[]>(() => {
    const cols: GridColDef<DBSlowMovingRow>[] = [
      {
        field: "sku",
        headerName: "SKU / บาร์โค้ด",
        minWidth: 140,
        flex: 1,
        renderCell: (params: GridRenderCellParams<DBSlowMovingRow, string>) => (
          <span className="font-mono text-xs font-semibold text-slate-700 bg-slate-100 px-2 py-0.5 rounded">
            {params.value}
          </span>
        ),
      },
      {
        field: "name",
        headerName: "ชื่อสินค้า",
        minWidth: 240,
        flex: 2,
        renderCell: (params: GridRenderCellParams<DBSlowMovingRow, string>) => (
          <span className="font-semibold text-slate-800 text-xs truncate" title={params.value}>
            {params.value}
          </span>
        ),
      },
      {
        field: "stockQty",
        headerName: "คงค้างสต็อก",
        type: "number",
        minWidth: 130,
        headerAlign: "center",
        align: "center",
        renderCell: (params: GridRenderCellParams<DBSlowMovingRow, number>) => (
          <span className="font-bold text-slate-700 text-xs bg-slate-100 px-2.5 py-1 rounded-full">
            {params.value} {params.row.unit}
          </span>
        ),
      },
      {
        field: "unitPrice",
        headerName: "ราคาขาย",
        type: "number",
        minWidth: 120,
        headerAlign: "right",
        align: "right",
        renderCell: (params: GridRenderCellParams<DBSlowMovingRow, number>) => (
          <span className="font-semibold text-slate-800 text-xs">
            ฿{(params.value || 0).toLocaleString()}
          </span>
        ),
      },
    ];

    if (isAdmin) {
      cols.push({
        field: "costPrice",
        headerName: "ราคาทุน",
        type: "number",
        minWidth: 120,
        headerAlign: "right",
        align: "right",
        renderCell: (params: GridRenderCellParams<DBSlowMovingRow, number>) => (
          <span className="text-slate-500 font-mono text-xs">
            ฿{(params.value || 0).toLocaleString()}
          </span>
        ),
      });
    }

    cols.push({
      field: "lastMovement",
      headerName: "วันที่มีความเคลื่อนไหวล่าสุด",
      minWidth: 200,
      flex: 1.5,
      renderCell: (params: GridRenderCellParams<DBSlowMovingRow, string>) =>
        params.value ? (
          <span className="text-slate-600 font-semibold text-xs">{params.value}</span>
        ) : (
          <span className="text-rose-500 italic font-semibold text-xs">
            ไม่มีความเคลื่อนไหว (ตั้งแต่แรกเริ่ม)
          </span>
        ),
    });

    return cols;
  }, [isAdmin]);

  // 5. Expiring Columns
  const expiryColumns = useMemo<GridColDef<DBExpiringRow>[]>(
    () => [
      {
        field: "expiryDate",
        headerName: "วันหมดอายุ",
        minWidth: 140,
        flex: 1,
        renderCell: (params: GridRenderCellParams<DBExpiringRow, string>) => (
          <span className="text-rose-600 font-bold font-mono text-xs bg-rose-50 border border-rose-100 px-2.5 py-1 rounded-md">
            {params.value}
          </span>
        ),
      },
      {
        field: "sku",
        headerName: "รหัสสินค้า / SKU",
        minWidth: 140,
        flex: 1,
        renderCell: (params: GridRenderCellParams<DBExpiringRow, string>) => (
          <span className="font-mono text-xs font-semibold text-slate-700 bg-slate-100 px-2 py-0.5 rounded">
            {params.value}
          </span>
        ),
      },
      {
        field: "productName",
        headerName: "ชื่อสินค้า",
        minWidth: 240,
        flex: 2,
        renderCell: (params: GridRenderCellParams<DBExpiringRow, string>) => (
          <span className="font-semibold text-slate-800 text-xs truncate" title={params.value}>
            {params.value}
          </span>
        ),
      },
      {
        field: "lotNo",
        headerName: "หมายเลข Lot",
        minWidth: 130,
        renderCell: (params: GridRenderCellParams<DBExpiringRow, string>) => (
          <span className="font-mono text-xs text-slate-600 font-medium">
            {params.value || "-"}
          </span>
        ),
      },
      {
        field: "qty",
        headerName: "จำนวนคงเหลือ Lot",
        type: "number",
        minWidth: 140,
        headerAlign: "center",
        align: "center",
        renderCell: (params: GridRenderCellParams<DBExpiringRow, number>) => (
          <span className="font-extrabold text-rose-600 text-xs bg-rose-50 px-2.5 py-1 rounded-full">
            {params.value} ชิ้น
          </span>
        ),
      },
      {
        field: "supplierName",
        headerName: "ผู้จัดส่ง / Supplier",
        minWidth: 160,
        flex: 1.2,
        renderCell: (params: GridRenderCellParams<DBExpiringRow, string>) => (
          <span className="text-xs font-medium text-slate-600">
            {params.value || "-"}
          </span>
        ),
      },
    ],
    []
  );

  return (
    <div className="space-y-6">
      {/* Header and Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 tracking-tight">
            รายงานและสถิติคลังสินค้า
          </h1>
          <p className="text-slate-500 text-sm">
            วิเคราะห์สต็อกสินค้าคงคลัง ข้อมูลงบกำไรขาดทุน สินค้าขายดี และแจ้งเตือนล็อตหมดอายุผ่าน MUI X Data Grid
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={exportCurrentReport}
            className="py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shadow-sm transition-all flex items-center gap-1.5 cursor-pointer active:scale-95"
          >
            <FileDownloadOutlinedIcon sx={{ fontSize: 16 }} />
            ส่งออก Excel (.xlsx)
          </button>

          <Tooltip title="รีเฟรชข้อมูล">
            <IconButton
              onClick={loadReportData}
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

      {/* Modern Tab Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        {[
          { id: "inventory", label: "สต็อกคงเหลือ", sub: "Inventory Snapshot", icon: <Inventory2OutlinedIcon /> },
          { id: "profit", label: "กำไร-ขาดทุน", sub: "Profit & Loss", icon: <MonetizationOnOutlinedIcon /> },
          { id: "best", label: "สินค้าขายดี", sub: "Top 10 Best Sellers", icon: <EmojiEventsOutlinedIcon /> },
          { id: "slow", label: "สินค้าขายช้า", sub: "Slow Moving Items", icon: <HourglassEmptyOutlinedIcon /> },
          { id: "expiry", label: "ใกล้หมดอายุ", sub: "Expiring Lots", icon: <WarningAmberOutlinedIcon /> },
        ].map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as ReportTab)}
              className={`p-4 rounded-2xl border text-left transition-all flex flex-col gap-2 cursor-pointer ${
                isActive
                  ? "bg-white border-indigo-500 shadow-md ring-2 ring-indigo-500/10"
                  : "bg-white/80 border-slate-200 hover:bg-white hover:border-slate-300 shadow-sm"
              }`}
            >
              <div className="flex items-center justify-between">
                <span className={isActive ? "text-indigo-600" : "text-slate-400"}>
                  {tab.icon}
                </span>
                {isActive && <span className="w-2 h-2 rounded-full bg-indigo-500" />}
              </div>
              <div>
                <p className={`text-xs font-bold ${isActive ? "text-indigo-600" : "text-slate-800"}`}>
                  {tab.label}
                </p>
                <p className="text-xs text-slate-400 font-medium truncate">{tab.sub}</p>
              </div>
            </button>
          );
        })}
      </div>

      {/* Control Bar for Slow/Expiry tabs */}
      {(activeTab === "slow" || activeTab === "expiry") && (
        <div className="flex items-center justify-between p-4 rounded-2xl bg-white border border-slate-200 shadow-sm">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-slate-600">
              {activeTab === "slow" ? "สินค้าไม่มีการขายเกิน:" : "สินค้าที่จะหมดอายุภายใน:"}
            </span>
            <select
              className="px-3 py-1.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-800 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
              value={activeTab === "slow" ? slowDays : expiryDays}
              onChange={(e) =>
                activeTab === "slow"
                  ? setSlowDays(Number(e.target.value))
                  : setExpiryDays(Number(e.target.value))
              }
            >
              <option value={15}>15 วัน</option>
              <option value={30}>30 วัน</option>
              <option value={60}>60 วัน</option>
              <option value={90}>90 วัน</option>
            </select>
          </div>

          <span className="text-xs font-medium text-slate-400">
            แสดงข้อมูลตามช่วงเวลาที่กำหนด
          </span>
        </div>
      )}

      {/* MUI X DataGrid Container for All 5 Report Views */}
      {activeTab === "inventory" && (
        <MeeDataGrid
          rows={inventory}
          columns={inventoryColumns}
          loading={loading}
          quickFilterPlaceholder="ค้นหาสินค้าคงคลัง, SKU, หมวดหมู่..."
          autoHeight
        />
      )}

      {activeTab === "profit" && (
        <MeeDataGrid
          rows={profit}
          getRowId={(row) => row.sku}
          columns={profitColumns}
          loading={loading}
          quickFilterPlaceholder="ค้นหารายงานกำไรขาดทุนตาม SKU, ชื่อสินค้า..."
          autoHeight
        />
      )}

      {activeTab === "best" && (
        <MeeDataGrid
          rows={bestSellers}
          getRowId={(row) => row.sku}
          columns={bestColumns}
          loading={loading}
          quickFilterPlaceholder="ค้นหาสินค้าขายดี..."
          autoHeight
        />
      )}

      {activeTab === "slow" && (
        <MeeDataGrid
          rows={slowMoving}
          columns={slowColumns}
          loading={loading}
          quickFilterPlaceholder="ค้นหาสินค้าขายช้า, SKU..."
          autoHeight
        />
      )}

      {activeTab === "expiry" && (
        <MeeDataGrid
          rows={expiring}
          getRowId={(row) => `${row.sku}-${row.lotNo}-${row.expiryDate}`}
          columns={expiryColumns}
          loading={loading}
          quickFilterPlaceholder="ค้นหาสินค้าใกล้หมดอายุ, Lot, ผู้จัดส่ง..."
          autoHeight
        />
      )}
    </div>
  );
}
