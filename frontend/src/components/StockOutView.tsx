"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useReactToPrint } from "react-to-print";
import { getProducts, createSaleOrder, getProductVariants, findProductOrVariantByBarcode, DBProduct, DBProductVariant } from "@/lib/dbActions";
import CameraScannerModal from "./CameraScannerModal";

type CartItem = {
  product: DBProduct;
  variant?: DBProductVariant | null;
  qty: number;
  unitPrice: number;
};

type InvoiceData = {
  orderNo: string;
  createdAt: string;
  items: CartItem[];
  discount: number;
  total: number;
};

export default function StockOutView() {
  const [products, setProducts] = useState<DBProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [addProductId, setAddProductId] = useState("");
  const [discount, setDiscount] = useState(0);
  const [note, setNote] = useState("");
  const [isPending, startTransition] = useTransition();
  const [invoice, setInvoice] = useState<InvoiceData | null>(null);
  const [error, setError] = useState("");
  const [showScanner, setShowScanner] = useState(false);

  const printRef = useRef<HTMLDivElement>(null);
  const printInvoice = useReactToPrint({
    contentRef: printRef,
    documentTitle: invoice ? `Invoice-${invoice.orderNo}` : "Invoice",
  });

  const [variants, setVariants] = useState<DBProductVariant[]>([]);
  const [selectedVariantId, setSelectedVariantId] = useState("");
  const [loadingVariants, setLoadingVariants] = useState(false);

  useEffect(() => {
    getProducts("", undefined, "active").then((data) => {
      setProducts(data.filter((p) => p.stockQty > 0));
      setLoading(false);
    });
  }, []);

  useEffect(() => {
    if (addProductId) {
      setLoadingVariants(true);
      getProductVariants(addProductId).then((data) => {
        setVariants(data);
        setSelectedVariantId(data[0]?.id || "");
        setLoadingVariants(false);
      });
    } else {
      setVariants([]);
      setSelectedVariantId("");
    }
  }, [addProductId]);

  const addProductToCart = (product: DBProduct, variant: DBProductVariant | null) => {
    const cartKey = variant ? `${product.id}-${variant.id}` : product.id;
    const existingIndex = cart.findIndex((i) => {
      const itemKey = i.variant ? `${i.product.id}-${i.variant.id}` : i.product.id;
      return itemKey === cartKey;
    });

    const maxStock = variant ? variant.stockQty : product.stockQty;
    if (maxStock <= 0) {
      setError(`สินค้า ${product.name}${variant ? ` (${variant.name})` : ""} หมดสต็อกแล้ว`);
      return;
    }

    if (existingIndex > -1) {
      const updatedCart = [...cart];
      updatedCart[existingIndex].qty = Math.min(updatedCart[existingIndex].qty + 1, maxStock);
      setCart(updatedCart);
    } else {
      setCart([
        ...cart,
        {
          product,
          variant,
          qty: 1,
          unitPrice: variant ? variant.unitPrice : product.unitPrice,
        },
      ]);
    }
    setError("");
  };

  const handleBarcodeScanned = async (code: string) => {
    setError("");
    try {
      const result = await findProductOrVariantByBarcode(code);
      if (!result) {
        setError(`ไม่พบสินค้าที่ตรงกับบาร์โค้ดหรือรหัส SKU: "${code}"`);
        return;
      }

      const { product, variant } = result;

      if (!variant) {
        const productVariants = await getProductVariants(product.id);
        if (productVariants.length > 0) {
          setAddProductId(product.id);
          setVariants(productVariants);
          setSelectedVariantId(productVariants[0].id);
          setError("บาร์โค้ดนี้ตรงกับสินค้าหลัก กรุณาเลือกตัวเลือกย่อยด้านล่าง");
          return;
        }
      }

      addProductToCart(product, variant);
    } catch (err) {
      console.error(err);
      setError("เกิดข้อผิดพลาดในการสแกนบาร์โค้ด");
    }
  };

  const addToCart = () => {
    if (!addProductId) return;
    const product = products.find((p) => p.id === addProductId);
    if (!product) return;

    const variant = variants.find((v) => v.id === selectedVariantId) || null;
    addProductToCart(product, variant);
    setAddProductId("");
  };

  const removeFromCart = (cartKey: string) => {
    setCart(cart.filter((i) => {
      const itemKey = i.variant ? `${i.product.id}-${i.variant.id}` : i.product.id;
      return itemKey !== cartKey;
    }));
  };

  const updateQty = (cartKey: string, qty: number) => {
    if (qty <= 0) {
      removeFromCart(cartKey);
      return;
    }
    setCart(
      cart.map((i) => {
        const itemKey = i.variant ? `${i.product.id}-${i.variant.id}` : i.product.id;
        if (itemKey === cartKey) {
          const maxStock = i.variant ? i.variant.stockQty : i.product.stockQty;
          return { ...i, qty: Math.min(qty, maxStock) };
        }
        return i;
      })
    );
  };

  const updatePrice = (cartKey: string, price: number) => {
    setCart(
      cart.map((i) => {
        const itemKey = i.variant ? `${i.product.id}-${i.variant.id}` : i.product.id;
        if (itemKey === cartKey) {
          return { ...i, unitPrice: Math.max(0, price) };
        }
        return i;
      })
    );
  };

  const subtotal = cart.reduce((sum, i) => sum + i.unitPrice * i.qty, 0);
  const total = Math.max(0, subtotal - discount);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (cart.length === 0) { setError("กรุณาเพิ่มสินค้าอย่างน้อย 1 รายการ"); return; }
    setError("");
    startTransition(async () => {
      const result = await createSaleOrder({
        items: cart.map((i) => ({
          productId: i.product.id,
          variantId: i.variant?.id || null,
          qty: i.qty,
          unitPrice: i.unitPrice,
          costPrice: i.variant ? i.variant.costPrice : i.product.costPrice,
        })),
        note,
        discount,
      });

      if (result.success) {
        setInvoice({
          orderNo: result.orderNo!,
          createdAt: new Date().toLocaleString("th-TH"),
          items: [...cart],
          discount,
          total,
        });
        // Reload products stock
        const updated = await getProducts("", undefined, "active");
        setProducts(updated.filter((p) => p.stockQty > 0));
        setCart([]);
        setDiscount(0);
        setNote("");
      } else {
        setError(result.error ?? "เกิดข้อผิดพลาดในการบันทึกการขาย");
      }
    });
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
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-800 tracking-tight flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-violet-50 text-violet-600 border border-violet-100">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
          </div>
          บันทึกการขาย / จ่ายสินค้าออก
        </h1>
        <p className="text-slate-500 text-sm mt-1">เพิ่มสินค้าหลายรายการ ระบุราคาขาย และออก Invoice ได้ทันที</p>
      </div>

      {/* Invoice Success */}
      {invoice && (
        <div className="rounded-3xl border border-emerald-200 bg-emerald-50 p-6 space-y-4 animate-in slide-in-from-top-2 duration-300">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-2xl bg-emerald-100 flex items-center justify-center text-emerald-600">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
              </div>
              <div>
                <p className="font-bold text-emerald-800">บันทึกการขายสำเร็จ!</p>
                <p className="text-xs text-emerald-600">เลขที่: <strong>{invoice.orderNo}</strong></p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setInvoice(null)}
                className="text-xs text-emerald-600 hover:text-emerald-800 underline"
              >
                ปิด
              </button>
              <button
                onClick={printInvoice}
                className="py-2 px-4 rounded-xl bg-emerald-600 text-white text-xs font-semibold flex items-center gap-1.5 hover:bg-emerald-700 transition-all"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" /></svg>
                พิมพ์ Invoice
              </button>
            </div>
          </div>
          <div className="border-t border-emerald-200 pt-3 flex items-center justify-between text-sm">
            <span className="text-emerald-700">{invoice.createdAt}</span>
            <span className="font-bold text-emerald-800 text-lg">ยอดรวม ฿{invoice.total.toLocaleString()}</span>
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="grid lg:grid-cols-[1fr_360px] gap-6">
        {/* Left: Cart */}
        <div className="space-y-4">
          {/* Add Item */}
          <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm space-y-3">
            <h3 className="text-sm font-bold text-slate-700">เพิ่มสินค้าในรายการ</h3>
            <div className="flex flex-col sm:flex-row gap-3">
              <button
                type="button"
                onClick={() => setShowScanner(true)}
                className="py-2.5 px-4 rounded-2xl border border-violet-100 bg-violet-50 hover:bg-violet-100 text-violet-600 text-sm font-semibold transition-all flex items-center justify-center gap-1.5 cursor-pointer active:scale-95 shadow-sm min-w-[120px]"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6.827 6.175A2.31 2.31 0 015.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 00-1.134-.175 2.31 2.31 0 01-1.64-1.055l-.822-1.316a2.192 2.192 0 00-1.736-1.039 48.774 48.774 0 00-5.232 0 2.192 2.192 0 00-1.736 1.039l-.821 1.316z" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 12.75a4.5 4.5 0 11-9 0 4.5 4.5 0 019 0zM18.75 10.5h.008v.008h-.008V10.5z" />
                </svg>
                สแกนกล้อง
              </button>
              <select
                className="flex-1 px-4 py-2.5 rounded-2xl border border-slate-200 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500 transition-all font-semibold text-slate-700"
                value={addProductId}
                onChange={(e) => setAddProductId(e.target.value)}
              >
                <option value="">— เลือกสินค้า —</option>
                {products.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} (คงเหลือ: {p.stockQty} {p.unit})
                  </option>
                ))}
              </select>
              <button
                type="button"
                onClick={addToCart}
                disabled={!addProductId || (variants.length > 0 && !selectedVariantId)}
                className="py-2.5 px-5 rounded-2xl bg-violet-600 hover:bg-violet-700 text-white text-sm font-semibold transition-all disabled:opacity-40 flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" /></svg>
                เพิ่ม
              </button>
            </div>

            {/* Variants Select */}
            {variants.length > 0 && (
              <div className="space-y-1 animate-in fade-in duration-200 mt-2">
                <label className="text-[10px] font-bold text-slate-500">เลือกตัวเลือกย่อย *</label>
                <select
                  required
                  className="w-full px-4 py-2.5 rounded-2xl border border-slate-200 text-xs bg-white focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500 transition-all font-semibold text-slate-700"
                  value={selectedVariantId}
                  onChange={(e) => setSelectedVariantId(e.target.value)}
                >
                  {variants.map((v) => (
                    <option key={v.id} value={v.id}>
                      {v.name} (คงเหลือ: {v.stockQty} ชิ้น) | ราคา: ฿{v.unitPrice}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>

          {/* Cart Items */}
          {cart.length > 0 ? (
            <div className="rounded-3xl border border-slate-200 bg-white overflow-hidden shadow-sm">
              <div className="px-5 py-3 border-b border-slate-100 bg-slate-50/60">
                <p className="text-xs font-bold text-slate-600">{cart.length} รายการ</p>
              </div>
              <div className="divide-y divide-slate-100">
                {cart.map((item) => {
                  const itemKey = item.variant ? `${item.product.id}-${item.variant.id}` : item.product.id;
                  const maxStock = item.variant ? item.variant.stockQty : item.product.stockQty;
                  return (
                    <div key={itemKey} className="p-4 flex items-center gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5">
                          <p className="font-semibold text-slate-800 text-sm truncate">{item.product.name}</p>
                          {item.variant && (
                            <span className="inline-flex items-center rounded-md bg-indigo-50 px-1.5 py-0.5 text-[9px] font-bold text-indigo-700 ring-1 ring-inset ring-indigo-700/10">
                              {item.variant.name}
                            </span>
                          )}
                        </div>
                        <p className="text-[10px] text-slate-400 font-mono">
                          SKU: {item.variant ? item.variant.sku : item.product.sku}
                        </p>
                      </div>
                      {/* Qty */}
                      <div className="flex items-center gap-1 border border-slate-200 rounded-xl px-1 py-0.5 bg-slate-50">
                        <button type="button" onClick={() => updateQty(itemKey, item.qty - 1)} className="w-6 h-6 rounded-lg bg-white text-slate-600 hover:bg-slate-100 text-xs font-bold border border-slate-200 transition-all">-</button>
                        <input
                          type="number" min="1" max={maxStock}
                          className="w-10 text-center bg-transparent text-sm font-bold border-none focus:outline-none"
                          value={item.qty}
                          onChange={(e) => updateQty(itemKey, Number(e.target.value))}
                        />
                        <button type="button" onClick={() => updateQty(itemKey, item.qty + 1)} className="w-6 h-6 rounded-lg bg-white text-slate-600 hover:bg-slate-100 text-xs font-bold border border-slate-200 transition-all">+</button>
                      </div>
                      {/* Price */}
                      <div className="flex items-center gap-1 text-sm">
                        <span className="text-slate-400 text-xs">฿</span>
                        <input
                          type="number" min="0" step="1"
                          className="w-20 text-right font-bold text-slate-800 bg-transparent border-b border-slate-200 focus:outline-none focus:border-violet-500 text-sm py-0.5 transition-all"
                          value={item.unitPrice}
                          onChange={(e) => updatePrice(itemKey, Number(e.target.value))}
                        />
                      </div>
                      {/* Line total */}
                      <span className="text-sm font-bold text-violet-700 w-20 text-right">
                        ฿{(item.qty * item.unitPrice).toLocaleString()}
                      </span>
                      {/* Remove */}
                      <button type="button" onClick={() => removeFromCart(itemKey)} className="text-slate-300 hover:text-rose-500 transition-colors p-1">
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            <div className="rounded-3xl border border-dashed border-slate-200 bg-slate-50/50 p-12 flex flex-col items-center gap-3 text-slate-400">
              <svg className="w-10 h-10 text-slate-200" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
              <p className="text-sm font-medium">ยังไม่มีสินค้าในรายการ</p>
              <p className="text-xs">เลือกสินค้าจาก dropdown ด้านบน</p>
            </div>
          )}
        </div>

        {/* Right: Summary + Submit */}
        <div className="space-y-4">
          <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm space-y-4 sticky top-20">
            <h3 className="font-bold text-slate-700 text-sm border-b border-slate-100 pb-3">สรุปยอดขาย</h3>

            <div className="space-y-2 text-sm">
              <div className="flex justify-between text-slate-600">
                <span>รวมก่อนส่วนลด</span>
                <span className="font-semibold">฿{subtotal.toLocaleString()}</span>
              </div>
              <div className="flex items-center justify-between gap-3">
                <span className="text-slate-500">ส่วนลด (฿)</span>
                <input
                  type="number" min="0"
                  className="w-24 text-right px-2 py-1 rounded-lg border border-slate-200 text-sm focus:outline-none focus:border-violet-400 transition-all"
                  value={discount}
                  onChange={(e) => setDiscount(Number(e.target.value))}
                />
              </div>
            </div>

            <div className="border-t border-slate-100 pt-3 flex justify-between items-center">
              <span className="font-bold text-slate-700">ยอดรวมสุทธิ</span>
              <span className="text-2xl font-extrabold text-violet-600">฿{total.toLocaleString()}</span>
            </div>

            {/* Note */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-500">หมายเหตุ</label>
              <textarea
                rows={2}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:outline-none focus:border-violet-400 resize-none"
                placeholder="หมายเหตุ/ข้อมูลลูกค้า"
                value={note}
                onChange={(e) => setNote(e.target.value)}
              />
            </div>

            {/* Error */}
            {error && (
              <div className="flex items-center gap-2 rounded-xl bg-rose-50 border border-rose-100 px-3 py-2 text-rose-600 text-xs">
                <svg className="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                {error}
              </div>
            )}

            {/* Submit */}
            <button
              type="submit"
              disabled={isPending || cart.length === 0}
              className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white font-bold text-sm shadow-lg shadow-violet-500/20 transition-all active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {isPending ? (
                <>
                  <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" /></svg>
                  กำลังบันทึก...
                </>
              ) : (
                <>
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" /></svg>
                  บันทึกการขาย
                </>
              )}
            </button>

            {cart.length > 0 && (
              <p className="text-center text-[10px] text-slate-400">{cart.reduce((s, i) => s + i.qty, 0)} ชิ้น ใน {cart.length} รายการสินค้า</p>
            )}
          </div>
        </div>
      </form>

      {/* Printable Invoice (hidden) */}
      {invoice && (
        <div style={{ position: "absolute", left: -9999, top: -9999 }}>
          <div ref={printRef} style={{ width: "210mm", padding: "20mm", fontFamily: "sans-serif", background: "white", color: "#000" }}>
            <div style={{ borderBottom: "2px solid #000", paddingBottom: "8mm", marginBottom: "8mm" }}>
              <h1 style={{ fontSize: "24px", fontWeight: "bold", margin: 0 }}>INVOICE</h1>
              <p style={{ margin: "2mm 0 0 0", fontSize: "11px", color: "#555" }}>เลขที่: {invoice.orderNo}</p>
              <p style={{ margin: "1mm 0 0 0", fontSize: "11px", color: "#555" }}>วันที่: {invoice.createdAt}</p>
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
                {invoice.items.map((item, i) => (
                  <tr key={i} style={{ borderBottom: "0.5px solid #ddd" }}>
                    <td style={{ padding: "2mm" }}>{item.product.name}</td>
                    <td style={{ padding: "2mm", textAlign: "center" }}>{item.qty} {item.product.unit}</td>
                    <td style={{ padding: "2mm", textAlign: "right" }}>฿{item.unitPrice.toLocaleString()}</td>
                    <td style={{ padding: "2mm", textAlign: "right" }}>฿{(item.qty * item.unitPrice).toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div style={{ borderTop: "2px solid #000", marginTop: "4mm", paddingTop: "4mm", textAlign: "right" }}>
              {invoice.discount > 0 && <p style={{ margin: "1mm 0", fontSize: "12px" }}>ส่วนลด: -฿{invoice.discount.toLocaleString()}</p>}
              <p style={{ margin: "2mm 0 0 0", fontSize: "18px", fontWeight: "bold" }}>ยอดรวม: ฿{invoice.total.toLocaleString()}</p>
            </div>
            <p style={{ marginTop: "12mm", fontSize: "10px", color: "#888", textAlign: "center" }}>ขอบคุณที่ใช้บริการ — MeeStock Pro</p>
          </div>
        </div>
      )}

      {showScanner && (
        <CameraScannerModal
          onClose={() => setShowScanner(false)}
          onScan={handleBarcodeScanned}
        />
      )}
    </div>
  );
}
