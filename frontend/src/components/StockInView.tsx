"use client";

import { useEffect, useState, useTransition } from "react";
import {
  getProducts,
  getSuppliers,
  createSupplier,
  stockIn,
  getProductVariants,
  findProductOrVariantByBarcode,
  DBProduct,
  DBSupplier,
  DBProductVariant,
} from "@/lib/dbActions";
import CameraScannerModal from "./CameraScannerModal";

export default function StockInView() {
  const [products, setProducts] = useState<DBProduct[]>([]);
  const [suppliers, setSuppliers] = useState<DBSupplier[]>([]);
  const [loading, setLoading] = useState(true);
  const [isPending, startTransition] = useTransition();
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");
  const [showScanner, setShowScanner] = useState(false);

  const [form, setForm] = useState({
    productId: "",
    variantId: "",
    qty: 1,
    costPrice: 0,
    lotNo: "",
    expiryDate: "",
    supplierId: "",
    note: "",
  });

  // Add Supplier inline
  const [showAddSupplier, setShowAddSupplier] = useState(false);
  const [newSupplier, setNewSupplier] = useState({ name: "", contactName: "", phone: "", email: "", address: "" });
  const [savingSupplier, setSavingSupplier] = useState(false);

  const selectedProduct = products.find((p) => p.id === form.productId);

  useEffect(() => {
    setLoading(true);
    Promise.all([
      getProducts("", undefined, "active"),
      getSuppliers(),
    ]).then(([prods, sups]) => {
      setProducts(prods);
      setSuppliers(sups);
      setLoading(false);
    });
  }, []);

  const [variants, setVariants] = useState<DBProductVariant[]>([]);
  const [loadingVariants, setLoadingVariants] = useState(false);

  // Auto-fill cost price and fetch variants when product selected
  useEffect(() => {
    if (selectedProduct) {
      setLoadingVariants(true);
      getProductVariants(selectedProduct.id).then((data) => {
        setVariants(data);
        setForm((f) => {
          const keepCurrent = f.variantId && data.some((v) => v.id === f.variantId);
          if (keepCurrent) {
            return f;
          }
          return {
            ...f,
            variantId: data[0]?.id || "",
            costPrice: data[0]?.costPrice ?? selectedProduct.costPrice ?? 0,
          };
        });
        setLoadingVariants(false);
      });
    } else {
      setVariants([]);
      setForm((f) => ({ ...f, variantId: "", costPrice: 0 }));
    }
  }, [form.productId]);

  const handleBarcodeScanned = async (code: string) => {
    setError("");
    try {
      const result = await findProductOrVariantByBarcode(code);
      if (!result) {
        setError(`ไม่พบสินค้าที่ตรงกับบาร์โค้ดหรือรหัส SKU: "${code}"`);
        return;
      }

      const { product, variant } = result;

      if (product.productType === "bundle") {
        setError("สินค้าประเภทจัดเซ็ตไม่สามารถรับเข้าสต็อกโดยตรงได้");
        return;
      }

      // Pre-set matching values
      if (variant) {
        // Fetch all variants so the dropdown shows them
        const productVariants = await getProductVariants(product.id);
        setVariants(productVariants);
        setForm((f) => ({
          ...f,
          productId: product.id,
          variantId: variant.id,
          costPrice: variant.costPrice,
        }));
      } else {
        const productVariants = await getProductVariants(product.id);
        setVariants(productVariants);
        setForm((f) => ({
          ...f,
          productId: product.id,
          variantId: productVariants[0]?.id || "",
          costPrice: productVariants[0]?.costPrice ?? product.costPrice ?? 0,
        }));
      }
    } catch (err) {
      console.error(err);
      setError("เกิดข้อผิดพลาดในการสแกนบาร์โค้ด");
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.productId || form.qty <= 0) { setError("กรุณาเลือกสินค้าและระบุจำนวนที่รับเข้า"); return; }
    setError("");
    startTransition(async () => {
      const ok = await stockIn({
        productId: form.productId,
        variantId: form.variantId || undefined,
        qty: Number(form.qty),
        costPrice: Number(form.costPrice) || undefined,
        lotNo: form.lotNo || undefined,
        expiryDate: form.expiryDate || undefined,
        supplierId: form.supplierId || undefined,
        note: form.note || undefined,
      });
      if (ok) {
        setSuccess(true);
        setForm({ productId: "", variantId: "", qty: 1, costPrice: 0, lotNo: "", expiryDate: "", supplierId: "", note: "" });
        setTimeout(() => setSuccess(false), 3000);
      } else {
        setError("ไม่สามารถบันทึกรายการรับสินค้าได้ กรุณาลองใหม่");
      }
    });
  };

  const handleAddSupplier = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSupplier.name.trim()) return;
    setSavingSupplier(true);
    const result = await createSupplier(newSupplier);
    if (result.success) {
      const sups = await getSuppliers();
      setSuppliers(sups);
      if (result.id) setForm((f) => ({ ...f, supplierId: result.id! }));
      setNewSupplier({ name: "", contactName: "", phone: "", email: "", address: "" });
      setShowAddSupplier(false);
    }
    setSavingSupplier(false);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-24">
        <svg className="animate-spin h-8 w-8 text-indigo-500" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
        </svg>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-800 tracking-tight flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600 border border-emerald-100">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 11l3-3m0 0l3 3m-3-3v8m0-13a9 9 0 110 18 9 9 0 010-18z" />
            </svg>
          </div>
          รับสินค้าเข้าคลัง
        </h1>
        <p className="text-slate-500 text-sm mt-1">บันทึกการรับสินค้าเข้า — ระบุ Lot, วันหมดอายุ และ Supplier ได้</p>
      </div>

      {/* Success */}
      {success && (
        <div className="flex items-center gap-3 rounded-2xl bg-emerald-50 border border-emerald-100 px-5 py-3.5 text-emerald-700 text-sm font-semibold animate-in slide-in-from-top-2 duration-300">
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          บันทึกรายการรับสินค้าสำเร็จ! สต็อกถูกอัปเดตแล้ว
        </div>
      )}

      {/* Form */}
      <form onSubmit={handleSubmit} className="rounded-3xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        <div className="p-6 space-y-5">
          {/* Product Select */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-600">เลือกสินค้า *</label>
            <div className="flex flex-col sm:flex-row gap-3">
              <button
                type="button"
                onClick={() => setShowScanner(true)}
                className="py-2.5 px-4 rounded-2xl border border-emerald-100 bg-emerald-50 hover:bg-emerald-100 text-emerald-600 text-sm font-semibold transition-all flex items-center justify-center gap-1.5 cursor-pointer active:scale-95 shadow-sm min-w-[120px]"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6.827 6.175A2.31 2.31 0 015.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 00-1.134-.175 2.31 2.31 0 01-1.64-1.055l-.822-1.316a2.192 2.192 0 00-1.736-1.039 48.774 48.774 0 00-5.232 0 2.192 2.192 0 00-1.736 1.039l-.821 1.316z" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 12.75a4.5 4.5 0 11-9 0 4.5 4.5 0 019 0zM18.75 10.5h.008v.008h-.008V10.5z" />
                </svg>
                สแกนกล้อง
              </button>
              <select
                required
                className="flex-1 px-4 py-3 rounded-2xl border border-slate-200 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
                value={form.productId}
                onChange={(e) => setForm({ ...form, productId: e.target.value })}
              >
                <option value="">— เลือกสินค้า —</option>
                {products.filter((p) => p.productType !== "bundle").map((p) => (
                  <option key={p.id} value={p.id}>{p.name} (SKU: {p.sku}) | สต็อก: {p.stockQty} {p.unit}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Variants Select */}
          {variants.length > 0 && (
            <div className="space-y-1.5 animate-in fade-in duration-200">
              <label className="text-xs font-bold text-slate-600">เลือกตัวเลือกย่อย *</label>
              <select
                required
                className="w-full px-4 py-3 rounded-2xl border border-slate-200 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all font-semibold text-slate-700"
                value={form.variantId}
                onChange={(e) => {
                  const selectedVar = variants.find((v) => v.id === e.target.value);
                  setForm({ ...form, variantId: e.target.value, costPrice: selectedVar?.costPrice ?? 0 });
                }}
              >
                {variants.map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.name} (SKU: {v.sku}) | สต็อกตัวเลือก: {v.stockQty} ชิ้น
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Selected Product Info */}
          {selectedProduct && (
            <div className="flex items-center gap-3 rounded-2xl bg-emerald-50 border border-emerald-100 px-4 py-3">
              <div className="flex-1">
                <p className="text-sm font-bold text-emerald-800">{selectedProduct.name}</p>
                <p className="text-xs text-emerald-600">สต็อกปัจจุบัน: <span className="font-bold">{selectedProduct.stockQty} {selectedProduct.unit}</span></p>
              </div>
              <div className="text-right">
                <p className="text-xs text-emerald-600">ราคาขาย</p>
                <p className="text-sm font-bold text-emerald-800">฿{selectedProduct.unitPrice}</p>
              </div>
            </div>
          )}

          {/* Qty + Cost */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-600">จำนวนรับเข้า *</label>
              <input
                required type="number" min="1"
                className="w-full px-4 py-3 rounded-2xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
                placeholder="จำนวน"
                value={form.qty}
                onChange={(e) => setForm({ ...form, qty: Number(e.target.value) })}
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-600">ราคาทุน / หน่วย (฿)</label>
              <input
                type="number" min="0" step="0.01"
                className="w-full px-4 py-3 rounded-2xl border border-indigo-100 bg-indigo-50/30 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                placeholder="0.00"
                value={form.costPrice}
                onChange={(e) => setForm({ ...form, costPrice: Number(e.target.value) })}
              />
            </div>
          </div>

          {/* Lot + Expiry */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-600">Lot Number</label>
              <input
                type="text"
                className="w-full px-4 py-3 rounded-2xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
                placeholder="LOT-2025-001 (optional)"
                value={form.lotNo}
                onChange={(e) => setForm({ ...form, lotNo: e.target.value })}
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-600">วันหมดอายุ</label>
              <input
                type="date"
                className="w-full px-4 py-3 rounded-2xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
                value={form.expiryDate}
                onChange={(e) => setForm({ ...form, expiryDate: e.target.value })}
              />
            </div>
          </div>

          {/* Supplier */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-600">Supplier (ผู้จัดจำหน่าย)</label>
              <button
                type="button"
                onClick={() => setShowAddSupplier(!showAddSupplier)}
                className="text-xs text-indigo-600 hover:text-indigo-800 font-semibold flex items-center gap-1"
              >
                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" /></svg>
                เพิ่ม Supplier ใหม่
              </button>
            </div>
            <select
              className="w-full px-4 py-3 rounded-2xl border border-slate-200 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
              value={form.supplierId}
              onChange={(e) => setForm({ ...form, supplierId: e.target.value })}
            >
              <option value="">— ไม่ระบุ Supplier —</option>
              {suppliers.map((s) => (
                <option key={s.id} value={s.id}>{s.name}{s.phone ? ` (${s.phone})` : ""}</option>
              ))}
            </select>

            {/* Add Supplier Inline Form */}
            {showAddSupplier && (
              <form onSubmit={handleAddSupplier} className="mt-2 rounded-2xl border border-indigo-100 bg-indigo-50/30 p-4 space-y-3 animate-in slide-in-from-top-2 duration-200">
                <p className="text-xs font-bold text-indigo-700">เพิ่ม Supplier ใหม่</p>
                <div className="grid grid-cols-2 gap-2">
                  <input required type="text" className="col-span-2 px-3 py-2 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-indigo-500/20 focus:outline-none bg-white" placeholder="ชื่อ Supplier *" value={newSupplier.name} onChange={(e) => setNewSupplier({ ...newSupplier, name: e.target.value })} />
                  <input type="text" className="px-3 py-2 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-indigo-500/20 focus:outline-none bg-white" placeholder="ชื่อผู้ติดต่อ" value={newSupplier.contactName} onChange={(e) => setNewSupplier({ ...newSupplier, contactName: e.target.value })} />
                  <input type="text" className="px-3 py-2 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-indigo-500/20 focus:outline-none bg-white" placeholder="เบอร์โทร" value={newSupplier.phone} onChange={(e) => setNewSupplier({ ...newSupplier, phone: e.target.value })} />
                  <input type="email" className="px-3 py-2 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-indigo-500/20 focus:outline-none bg-white" placeholder="อีเมล" value={newSupplier.email} onChange={(e) => setNewSupplier({ ...newSupplier, email: e.target.value })} />
                  <input type="text" className="px-3 py-2 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-indigo-500/20 focus:outline-none bg-white" placeholder="ที่อยู่" value={newSupplier.address} onChange={(e) => setNewSupplier({ ...newSupplier, address: e.target.value })} />
                </div>
                <div className="flex items-center gap-2 justify-end">
                  <button type="button" onClick={() => setShowAddSupplier(false)} className="text-xs text-slate-400 hover:text-slate-600">ยกเลิก</button>
                  <button type="submit" disabled={savingSupplier} className="py-1.5 px-4 rounded-xl bg-indigo-600 text-white text-xs font-semibold disabled:opacity-50">
                    {savingSupplier ? "กำลังบันทึก..." : "บันทึก Supplier"}
                  </button>
                </div>
              </form>
            )}
          </div>

          {/* Note */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-600">หมายเหตุ</label>
            <textarea
              rows={2}
              className="w-full px-4 py-3 rounded-2xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all resize-none"
              placeholder="หมายเหตุเพิ่มเติม (optional)"
              value={form.note}
              onChange={(e) => setForm({ ...form, note: e.target.value })}
            />
          </div>

          {/* Error */}
          {error && (
            <div className="flex items-center gap-2 rounded-xl bg-rose-50 border border-rose-100 px-4 py-2.5 text-rose-600 text-xs font-semibold">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
              {error}
            </div>
          )}
        </div>

        {/* Summary bar */}
        {selectedProduct && form.qty > 0 && (
          <div className="border-t border-slate-100 bg-slate-50 px-6 py-3 flex items-center justify-between text-xs">
            <span className="text-slate-500">สรุป: รับ <strong>{form.qty} {selectedProduct.unit}</strong> เข้า → สต็อกใหม่จะเป็น</span>
            <span className="font-bold text-emerald-700 text-sm">{selectedProduct.stockQty + Number(form.qty)} {selectedProduct.unit}</span>
          </div>
        )}

        <div className="px-6 pb-5 pt-3">
          <button
            type="submit"
            disabled={isPending}
            className="w-full py-3 rounded-2xl bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-500 hover:to-emerald-600 text-white font-bold text-sm shadow-lg shadow-emerald-500/20 transition-all active:scale-[0.98] disabled:opacity-60 flex items-center justify-center gap-2"
          >
            {isPending ? (
              <>
                <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" /></svg>
                กำลังบันทึก...
              </>
            ) : (
              <>
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M9 11l3-3m0 0l3 3m-3-3v8m0-13a9 9 0 110 18 9 9 0 010-18z" /></svg>
                บันทึกรับสินค้าเข้าคลัง
              </>
            )}
          </button>
        </div>
      </form>

      {showScanner && (
        <CameraScannerModal
          onClose={() => setShowScanner(false)}
          onScan={handleBarcodeScanned}
        />
      )}
    </div>
  );
}
