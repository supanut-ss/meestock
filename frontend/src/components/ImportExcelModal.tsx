"use client";

import { useMemo, useState, useTransition } from "react";
import * as XLSX from "xlsx";
import { importProducts } from "@/lib/dbActions";
import MeeDataGrid from "@/components/ui/MeeDataGrid";
import StatusBadge from "@/components/ui/StatusBadge";
import { useNotification } from "@/components/ui/NotificationProvider";
import { GridColDef, GridRenderCellParams } from "@mui/x-data-grid";
import { Box, Chip, Tooltip } from "@mui/material";
import FileDownloadOutlinedIcon from "@mui/icons-material/FileDownloadOutlined";
import CloudUploadOutlinedIcon from "@mui/icons-material/CloudUploadOutlined";

type ParsedItem = {
  sku: string;
  barcode: string;
  name: string;
  unit: string;
  unitPrice: number;
  costPrice: number;
  stockQty: number;
  lowStockThreshold: number;
  notes: string;
  errors: string[];
};

type ExcelRow = {
  [key: string]: string | number | boolean | undefined | null;
};

export default function ImportExcelModal({
  onClose,
  onSuccess,
}: {
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [items, setItems] = useState<ParsedItem[]>([]);
  const [fileName, setFileName] = useState("");
  const [error, setError] = useState("");
  const [isPending, startTransition] = useTransition();
  const { notifySuccess, notifyError, notifyWarning } = useNotification();

  const handleDownloadTemplate = () => {
    const sample = [
      {
        "SKU *": "TSHIRT-001",
        "ชื่อสินค้า *": "เสื้อยืด Minimal Cotton",
        "บาร์โค้ด": "8851234567890",
        "หน่วยนับ": "ชิ้น",
        "ราคาขาย *": 199,
        "ราคาทุน *": 100,
        "สต็อกเริ่มต้น *": 50,
        "สต็อกขั้นต่ำ": 5,
        "หมายเหตุ": "หมายเหตุสินค้าเพิ่มเติม",
      },
    ];
    const worksheet = XLSX.utils.json_to_sheet(sample);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Template");
    XLSX.writeFile(workbook, "MeeStock_Import_Template.xlsx");
    notifySuccess("ดาวน์โหลด Template สำเร็จ");
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setFileName(file.name);
    setError("");

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const data = evt.target?.result;
        const workbook = XLSX.read(data, { type: "binary" });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const rows = XLSX.utils.sheet_to_json(worksheet) as ExcelRow[];

        if (rows.length === 0) {
          setError("ไฟล์ไม่มีข้อมูลสำหรับการนำเข้า");
          return;
        }

        if (rows.length > 1000) {
          setError("จำกัดการนำเข้าข้อมูลไม่เกิน 1,000 รายการต่อครั้ง");
          return;
        }

        const parsed: ParsedItem[] = rows.map((r, idx) => {
          const errors: string[] = [];

          // Map column name options
          const sku = String(r["SKU *"] || r["SKU"] || "").trim();
          const name = String(r["ชื่อสินค้า *"] || r["ชื่อสินค้า"] || "").trim();
          const barcode = String(r["บาร์โค้ด"] || "").trim();
          const unit = String(r["หน่วยนับ"] || "ชิ้น").trim();

          const unitPrice = Number(r["ราคาขาย *"] || r["ราคาขาย"] || 0);
          const costPrice = Number(r["ราคาทุน *"] || r["ราคาทุน"] || 0);
          const stockQty = Number(r["สต็อกเริ่มต้น *"] || r["สต็อกเริ่มต้น"] || 0);
          const lowStockThreshold = Number(r["สต็อกขั้นต่ำ"] || 3);
          const notes = String(r["หมายเหตุ"] || "").trim();

          if (!sku) errors.push(`แถวที่ ${idx + 2}: ไม่ระบุรหัส SKU`);
          if (!name) errors.push(`แถวที่ ${idx + 2}: ไม่ระบุชื่อสินค้า`);
          if (isNaN(unitPrice) || unitPrice < 0) errors.push(`แถวที่ ${idx + 2}: ราคาขายไม่ถูกต้อง`);
          if (isNaN(costPrice) || costPrice < 0) errors.push(`แถวที่ ${idx + 2}: ราคาทุนไม่ถูกต้อง`);
          if (isNaN(stockQty) || stockQty < 0) errors.push(`แถวที่ ${idx + 2}: สต็อกเริ่มต้นไม่ถูกต้อง`);

          return {
            sku,
            barcode,
            name,
            unit,
            unitPrice,
            costPrice,
            stockQty,
            lowStockThreshold,
            notes,
            errors,
          };
        });

        setItems(parsed);
      } catch (err) {
        console.error(err);
        setError("ไม่สามารถอ่านข้อมูลในไฟล์ได้ กรุณาตรวจสอบรูปแบบเทมเพลต");
      }
    };
    reader.readAsBinaryString(file);
  };

  const handleImport = () => {
    const hasErrors = items.some((i) => i.errors.length > 0);
    if (hasErrors) {
      notifyWarning("กรุณาแก้ไขข้อผิดพลาดในรายการก่อนทำการนำเข้าข้อมูล");
      return;
    }

    startTransition(async () => {
      const result = await importProducts(
        items.map((i) => ({
          sku: i.sku,
          barcode: i.barcode,
          name: i.name,
          unit: i.unit,
          unitPrice: i.unitPrice,
          costPrice: i.costPrice,
          stockQty: i.stockQty,
          lowStockThreshold: i.lowStockThreshold,
          notes: i.notes,
        }))
      );

      if (result.success) {
        notifySuccess(`นำเข้าสินค้าเรียบร้อยแล้วทั้งหมด ${result.importedCount} รายการ!`);
        onSuccess();
        onClose();
      } else {
        notifyError(result.error || "ไม่สามารถนำเข้าข้อมูลสินค้าได้");
      }
    });
  };

  const errorCount = items.filter((i) => i.errors.length > 0).length;

  const rowsWithId = useMemo(
    () => items.map((item, idx) => ({ ...item, id: idx })),
    [items]
  );

  const columns = useMemo<GridColDef<ParsedItem & { id: number }>[]>(
    () => [
      {
        field: "sku",
        headerName: "SKU",
        minWidth: 120,
        renderCell: (params) => (
          <span className="font-mono text-xs font-semibold text-slate-700">
            {params.value || "-"}
          </span>
        ),
      },
      {
        field: "name",
        headerName: "ชื่อสินค้า",
        minWidth: 200,
        flex: 1.5,
        renderCell: (params) => (
          <span className="font-semibold text-slate-800 text-xs truncate" title={params.value}>
            {params.value || "-"}
          </span>
        ),
      },
      {
        field: "unitPrice",
        headerName: "ราคาขาย",
        type: "number",
        minWidth: 100,
        headerAlign: "right",
        align: "right",
        renderCell: (params) => (
          <span className="font-bold text-xs text-slate-800">
            ฿{(params.value || 0).toLocaleString()}
          </span>
        ),
      },
      {
        field: "costPrice",
        headerName: "ราคาทุน",
        type: "number",
        minWidth: 100,
        headerAlign: "right",
        align: "right",
        renderCell: (params) => (
          <span className="text-xs text-slate-500 font-mono">
            ฿{(params.value || 0).toLocaleString()}
          </span>
        ),
      },
      {
        field: "stockQty",
        headerName: "คงคลังเริ่มต้น",
        type: "number",
        minWidth: 110,
        headerAlign: "center",
        align: "center",
        renderCell: (params) => (
          <span className="font-bold text-xs text-slate-700">
            {params.value} {params.row.unit}
          </span>
        ),
      },
      {
        field: "errors",
        headerName: "สถานะการตรวจสอบ",
        minWidth: 170,
        flex: 1,
        sortable: false,
        renderCell: (params: GridRenderCellParams<ParsedItem & { id: number }, string[]>) => {
          const errs = params.value || [];
          if (errs.length > 0) {
            return (
              <Tooltip title={errs.join(" | ")}>
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold text-rose-700 bg-rose-50 border border-rose-200 truncate cursor-help">
                  ❌ {errs[0]}
                </span>
              </Tooltip>
            );
          }
          return (
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold text-emerald-700 bg-emerald-50 border border-emerald-200">
              ✓ พร้อมนำเข้า
            </span>
          );
        },
      },
    ],
    []
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        onClick={onClose}
        className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity"
      />

      {/* Modal Dialog */}
      <div className="relative w-full max-w-4xl rounded-3xl bg-white p-6 sm:p-8 shadow-2xl border border-slate-100 flex flex-col gap-6 animate-in zoom-in-95 duration-200 max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 pb-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600 shadow-sm border border-indigo-100">
              <CloudUploadOutlinedIcon sx={{ fontSize: 22 }} />
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-800">
                นำเข้าสินค้าผ่านไฟล์ Excel
              </h3>
              <p className="text-xs text-slate-400">
                อัปโหลดไฟล์ Excel (.xlsx, .xls) เพื่อเพิ่มหรืออัปเดตสต็อกสินค้าพร้อมกันทีละหลายรายการ
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-xl bg-slate-50 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors cursor-pointer"
          >
            ✕
          </button>
        </div>

        {/* Content body */}
        <div className="space-y-4 overflow-y-auto pr-1">
          {/* Instructions and Template */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-2xl bg-slate-50 border border-slate-200/60">
            <div className="space-y-1">
              <p className="font-bold text-xs text-slate-700">รูปแบบไฟล์ที่รองรับ</p>
              <p className="text-slate-500 text-xs">
                สามารถดาวน์โหลดไฟล์ตัวอย่างเทมเพลตมาตรฐานไปกรอกข้อมูลก่อนอัปโหลดได้
              </p>
            </div>
            <button
              type="button"
              onClick={handleDownloadTemplate}
              className="py-2 px-3.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold shadow-sm transition-all flex items-center justify-center gap-1.5 cursor-pointer active:scale-95"
            >
              <FileDownloadOutlinedIcon sx={{ fontSize: 16, color: "#6366f1" }} />
              ดาวน์โหลด Template (.xlsx)
            </button>
          </div>

          {/* Upload Area */}
          <div className="rounded-2xl border-2 border-dashed border-slate-200 hover:border-indigo-400 bg-slate-50/50 p-6 transition-colors relative flex flex-col items-center justify-center gap-2 cursor-pointer group">
            <input
              type="file"
              accept=".xlsx,.xls"
              onChange={handleFileChange}
              className="absolute inset-0 opacity-0 cursor-pointer"
            />
            <CloudUploadOutlinedIcon
              sx={{ fontSize: 36, color: "#94a3b8", "&:hover": { color: "#6366f1" } }}
            />
            <p className="font-bold text-slate-700 text-sm">
              คลิกเพื่อเลือกไฟล์ หรือลากวางไฟล์ที่นี่
            </p>
            <p className="text-slate-400 text-xs">
              รองรับเฉพาะไฟล์ Excel (.xlsx, .xls) ไม่เกิน 1,000 แถว
            </p>
            {fileName && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-50 text-indigo-600 font-bold border border-indigo-100 text-xs mt-2">
                📂 {fileName}
              </span>
            )}
          </div>

          {/* Validation Alert */}
          {error && (
            <div className="flex items-center gap-2 rounded-2xl bg-rose-50 border border-rose-100 px-4 py-2.5 text-rose-600 font-bold text-xs">
              {error}
            </div>
          )}

          {/* Preview rows validation DataGrid */}
          {items.length > 0 && (
            <div className="space-y-2.5">
              <div className="flex justify-between items-center px-1">
                <h4 className="font-bold text-slate-700 text-xs">
                  รายการตัวอย่างข้อมูลที่ตรวจพบ ({items.length} รายการ)
                </h4>
                {errorCount > 0 ? (
                  <span className="font-bold text-rose-600 bg-rose-50 border border-rose-200 px-2.5 py-0.5 rounded-full text-xs">
                    พบข้อผิดพลาด {errorCount} แถว
                  </span>
                ) : (
                  <span className="font-bold text-emerald-600 bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 rounded-full text-xs">
                    ข้อมูลถูกต้องครบถ้วน พร้อมนำเข้า
                  </span>
                )}
              </div>

              <MeeDataGrid
                rows={rowsWithId}
                columns={columns}
                height={300}
                disableExport
                quickFilterPlaceholder="ค้นหารายการที่นำเข้า..."
              />
            </div>
          )}
        </div>

        {/* Footer actions */}
        <div className="flex gap-3 pt-3 border-t border-slate-100 mt-auto">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 py-2.5 rounded-2xl border border-slate-200 text-slate-600 hover:bg-slate-50 text-xs font-semibold transition-all cursor-pointer"
          >
            ยกเลิก
          </button>
          <button
            type="button"
            onClick={handleImport}
            disabled={isPending || items.length === 0 || errorCount > 0}
            className="flex-1 py-2.5 rounded-2xl bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-500 hover:to-indigo-600 text-white text-xs font-semibold shadow-md transition-all active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 cursor-pointer"
          >
            {isPending ? "กำลังอัปโหลดข้อมูล..." : "บันทึกนำเข้าข้อมูลทั้งหมด"}
          </button>
        </div>
      </div>
    </div>
  );
}
