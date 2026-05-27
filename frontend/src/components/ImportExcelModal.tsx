"use client";

import { useState, useTransition } from "react";
import * as XLSX from "xlsx";
import { importProducts } from "@/lib/dbActions";

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
      alert("กรุณาแก้ไขข้อผิดพลาดในรายการก่อนทำการนำเข้าข้อมูล");
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
        alert(`นำเข้าสินค้าเรียบร้อยแล้วทั้งหมด ${result.importedCount} รายการ!`);
        onSuccess();
        onClose();
      } else {
        setError(result.error || "เกิดข้อผิดพลาดในการนำเข้าข้อมูล");
      }
    });
  };

  const errorCount = items.reduce((sum, i) => sum + i.errors.length, 0);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm animate-fade-in" onClick={onClose} />

      {/* Modal Card */}
      <div className="relative w-full max-w-3xl rounded-3xl border border-slate-100 bg-white p-6 shadow-2xl z-10 flex flex-col max-h-[85vh] animate-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
          <div>
            <h2 className="font-bold text-slate-800 text-lg">นำเข้าสินค้าจากไฟล์ Excel (.xlsx)</h2>
            <p className="text-xxs text-slate-400 mt-0.5">อัปโหลดไฟล์ Excel คัดแยกและ upsert บันทึกข้อมูลคลังสินค้าแบบกลุ่ม</p>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 p-1 hover:bg-slate-50 rounded-lg transition-colors"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content Panel */}
        <div className="flex-1 overflow-y-auto space-y-4 pr-1 text-xs">
          {/* Instructions and Download Template */}
          <div className="rounded-2xl border border-indigo-100 bg-indigo-50/30 p-4 flex flex-col sm:flex-row justify-between sm:items-center gap-3">
            <div className="space-y-1">
              <h4 className="font-bold text-indigo-900">ยังไม่มีเทมเพลตสำหรับนำเข้าใช่หรือไม่?</h4>
              <p className="text-slate-500 leading-relaxed text-[11px]">
                กรุณาดาวน์โหลดเทมเพลต Excel ด้านขวา นำข้อมูลสินค้าไปกรอกตามรูปแบบโครงสร้าง แล้วจึงนำมาอัปโหลด
              </p>
            </div>
            <button
              onClick={handleDownloadTemplate}
              type="button"
              className="py-2 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold transition-all text-xxs flex items-center justify-center gap-1 flex-shrink-0"
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 11-6 0v-1m6 0H9" />
              </svg>
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
            <svg className="w-8 h-8 text-slate-300 group-hover:text-indigo-500 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
            </svg>
            <p className="font-bold text-slate-700">คลิกเพื่อเลือกไฟล์ หรือลากวางไฟล์ที่นี่</p>
            <p className="text-slate-400 text-xxs">รองรับเฉพาะไฟล์ Excel (.xlsx, .xls) ไม่เกิน 1,000 แถว</p>
            {fileName && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-50 text-indigo-600 font-bold border border-indigo-100 text-[10px] mt-2">
                📂 {fileName}
              </span>
            )}
          </div>

          {/* Validation Alert */}
          {error && (
            <div className="flex items-center gap-2 rounded-2xl bg-rose-50 border border-rose-100 px-4 py-2.5 text-rose-600 font-bold">
              <svg className="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
              {error}
            </div>
          )}

          {/* Preview rows validation */}
          {items.length > 0 && (
            <div className="space-y-2.5">
              <div className="flex justify-between items-center px-1">
                <h4 className="font-bold text-slate-700 text-xs">
                  รายการตัวอย่างข้อมูลที่ตรวจพบ ({items.length} รายการ)
                </h4>
                {errorCount > 0 && (
                  <span className="font-bold text-rose-600 bg-rose-50 px-2 py-0.5 rounded-md">
                    พบข้อผิดพลาด {errorCount} แถว
                  </span>
                )}
              </div>

              <div className="rounded-2xl border border-slate-100 overflow-hidden max-h-60 overflow-y-auto">
                <table className="w-full border-collapse text-left text-[11px]">
                  <thead>
                    <tr className="border-b border-slate-100 bg-slate-50/70 text-slate-400 font-bold uppercase tracking-wider">
                      <th className="px-4 py-2.5">SKU</th>
                      <th className="px-4 py-2.5">ชื่อสินค้า</th>
                      <th className="px-4 py-2.5 text-right">ราคาขาย</th>
                      <th className="px-4 py-2.5 text-right">ราคาทุน</th>
                      <th className="px-4 py-2.5 text-center">คงคลังคลัง</th>
                      <th className="px-4 py-2.5">สถานะ</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 bg-white">
                    {items.map((item, idx) => {
                      const isRowErr = item.errors.length > 0;
                      return (
                        <tr
                          key={idx}
                          className={`hover:bg-slate-50/50 ${
                            isRowErr ? "bg-rose-50/20 text-rose-700" : ""
                          }`}
                        >
                          <td className="px-4 py-2.5 font-mono font-semibold">{item.sku || "—"}</td>
                          <td className="px-4 py-2.5 font-semibold truncate max-w-[120px]">{item.name || "—"}</td>
                          <td className="px-4 py-2.5 text-right font-bold">฿{item.unitPrice}</td>
                          <td className="px-4 py-2.5 text-right text-slate-500">฿{item.costPrice}</td>
                          <td className="px-4 py-2.5 text-center font-bold">{item.stockQty} {item.unit}</td>
                          <td className="px-4 py-2.5">
                            {isRowErr ? (
                              <span className="font-bold text-rose-600 block max-w-[140px] truncate" title={item.errors.join(", ")}>
                                ❌ {item.errors[0]}
                              </span>
                            ) : (
                              <span className="text-emerald-600 font-bold">✓ พร้อมใช้งาน</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* Footer actions */}
        <div className="flex gap-3 pt-3 border-t border-slate-100 mt-4">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 py-2.5 rounded-2xl border border-slate-200 text-slate-500 hover:bg-slate-50 text-sm font-semibold transition-all active:scale-[0.98]"
          >
            ยกเลิก
          </button>
          <button
            type="button"
            onClick={handleImport}
            disabled={isPending || items.length === 0 || errorCount > 0}
            className="flex-1 py-2.5 rounded-2xl bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white text-sm font-semibold shadow-md shadow-indigo-100 transition-all active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {isPending ? "กำลังอัปโหลดกลุ่มข้อมูล..." : "บันทึกนำเข้าข้อมูลทั้งหมด"}
          </button>
        </div>
      </div>
    </div>
  );
}
