"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import JsBarcode from "jsbarcode";
import { useReactToPrint } from "react-to-print";
import {
  getProducts,
  updateProductStock,
  createProduct,
  deleteProduct,
  DBProduct
} from "@/lib/dbActions";

export default function ProductManagement() {
  const [products, setProducts] = useState<DBProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [scannerValue, setScannerValue] = useState("");
  const [adjustQty, setAdjustQty] = useState(1);
  const [selected, setSelected] = useState<DBProduct | null>(null);
  const [openBarcode, setOpenBarcode] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");

  // Add Product Form State
  const [showAddForm, setShowAddForm] = useState(false);
  const [isSavingProduct, setIsSavingProduct] = useState(false);
  const [newProduct, setNewProduct] = useState({
    sku: "",
    barcode: "",
    name: "",
    unitPrice: 99,
    stockQty: 10,
    lowStockThreshold: 3,
  });

  const barcodeSvgRef = useRef<SVGSVGElement>(null);
  const printRef = useRef<HTMLDivElement>(null);

  const printLabel = useReactToPrint({
    contentRef: printRef,
    documentTitle: selected?.sku ? `barcode-${selected.sku}` : "barcode-label",
  });

  // Load products from Database
  const loadProducts = async () => {
    setLoading(true);
    try {
      const data = await getProducts(searchTerm);
      setProducts(data);
    } catch (err) {
      console.error("Failed to load products from database:", err);
    } finally {
      setLoading(false);
    }
  };

  // Debounced load on search
  useEffect(() => {
    const timer = setTimeout(() => {
      void loadProducts();
    }, 300);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  // Render Barcode in Modal
  useEffect(() => {
    if (!selected || !barcodeSvgRef.current || !openBarcode) return;
    try {
      JsBarcode(barcodeSvgRef.current, selected.barcode || selected.sku, {
        format: "CODE128",
        displayValue: true,
        width: 2,
        height: 64,
        margin: 8,
        fontSize: 14,
        lineColor: "#0f172a",
      });
    } catch (err) {
      console.error("Barcode generation error: ", err);
    }
  }, [selected, openBarcode]);

  // Real-time Barcode Scanner Simulation with Database stocks adjustment
  useEffect(() => {
    if (!scannerValue.trim()) return;
    const timer = setTimeout(async () => {
      const code = scannerValue.trim();
      const match = products.find((p) => p.barcode === code || p.sku === code);
      if (match) {
        setScannerValue("");
        const success = await updateProductStock(match.id, adjustQty);
        if (success) {
          void loadProducts();
        } else {
          alert("ไม่สามารถจำลองการปรับสต็อกผ่านเครื่องสแกนบาร์โค้ดลงฐานข้อมูลได้");
        }
      }
    }, 250);

    return () => clearTimeout(timer);
  }, [scannerValue, adjustQty, products]);

  // Increment/Decrement helper for database products
  const handleUpdateStock = async (id: string, amount: number) => {
    const success = await updateProductStock(id, amount);
    if (success) {
      void loadProducts();
    } else {
      alert("ไม่สามารถปรับปรุงสต็อกสินค้าลงฐานข้อมูลได้");
    }
  };

  // Add Product Handler
  const handleAddProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProduct.name || !newProduct.sku) return;
    setIsSavingProduct(true);
    try {
      const productToAdd = {
        sku: newProduct.sku,
        barcode: newProduct.barcode || `885000000${Math.floor(100 + Math.random() * 900)}`,
        name: newProduct.name,
        unitPrice: Number(newProduct.unitPrice),
        stockQty: Number(newProduct.stockQty),
        lowStockThreshold: Number(newProduct.lowStockThreshold),
      };

      const success = await createProduct(productToAdd);
      if (success) {
        setNewProduct({
          sku: "",
          barcode: "",
          name: "",
          unitPrice: 99,
          stockQty: 10,
          lowStockThreshold: 3,
        });
        setShowAddForm(false);
        void loadProducts();
      } else {
        alert("ไม่สามารถบันทึกสินค้าใหม่ลงฐานข้อมูลได้");
      }
    } catch (err) {
      console.error(err);
      alert("เกิดข้อผิดพลาดในการบันทึกข้อมูล");
    } finally {
      setIsSavingProduct(false);
    }
  };

  // Delete Product Handler
  const handleDeleteProduct = async (id: string, name: string) => {
    if (!confirm(`คุณแน่ใจหรือไม่ที่จะลบสินค้า "${name}"? ข้อมูลจะถูกปิดใช้งานในคลังสินค้าถาวร`)) return;
    try {
      const success = await deleteProduct(id);
      if (success) {
        void loadProducts();
      } else {
        alert("ไม่สามารถลบสินค้าออกจากระบบได้");
      }
    } catch (err) {
      console.error(err);
    }
  };

  const lowStockCount = useMemo(() => products.filter((p) => p.stockQty <= p.lowStockThreshold).length, [products]);

  return (
    <div className="space-y-6">
      {/* Header and Quick Stats */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 tracking-tight">คลังสินค้าและการจัดการสต็อก</h1>
          <p className="text-slate-500 text-sm">
            จัดการรายการสินค้าคงคลัง ปรับปรุงสต็อกผ่าน SQL Server และพิมพ์บาร์โค้ดสินค้าได้เรียลไทม์
          </p>
        </div>
        
        {/* Status indicator badges */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 rounded-2xl bg-white border border-slate-200 px-4 py-2.5 shadow-sm">
            <span className="h-2 w-2 rounded-full bg-indigo-500"></span>
            <span className="text-xs font-semibold text-slate-600">ทั้งหมด: {products.length} รายการ</span>
          </div>
          <div className={`flex items-center gap-2 rounded-2xl border px-4 py-2.5 shadow-sm transition-all ${
            lowStockCount > 0 
              ? "bg-rose-50 border-rose-100 text-rose-700 font-semibold animate-pulse" 
              : "bg-emerald-50 border-emerald-100 text-emerald-700"
          }`}>
            <span className={`h-2 w-2 rounded-full ${lowStockCount > 0 ? "bg-rose-500" : "bg-emerald-500"}`}></span>
            <span className="text-xs">สต็อกต่ำกว่าเกณฑ์: {lowStockCount} รายการ</span>
          </div>
        </div>
      </div>

      {/* Main Operations Control Box */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Real-time Scanner / Simulation panel */}
        <div className="lg:col-span-2 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <h3 className="font-bold text-slate-800 text-sm tracking-tight flex items-center gap-2">
              <svg className="w-5 h-5 text-indigo-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
              </svg>
              เครื่องจำลองการสแกนบาร์โค้ด
            </h3>
            <span className="text-xxs font-medium text-slate-400 bg-slate-50 px-2 py-1 rounded-md">Real-time Scanner Ready</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-[1fr_180px] gap-4">
            <div className="relative">
              <input
                type="text"
                className="w-full pl-11 pr-4 py-3 rounded-2xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-sm transition-all"
                placeholder="คลิกที่นี่แล้วจำลองการสแกนโดยคัดลอก Barcode/SKU มาวาง..."
                value={scannerValue}
                onChange={(e) => setScannerValue(e.target.value)}
                autoFocus
              />
              <div className="absolute left-4 top-3.5 text-slate-400">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
              {scannerValue && (
                <div className="absolute right-3 top-3">
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-indigo-500"></span>
                  </span>
                </div>
              )}
            </div>

            <div className="flex items-center border border-slate-200 rounded-2xl px-2 py-1 bg-slate-50">
              <button 
                onClick={() => setAdjustQty(Math.max(1, adjustQty - 1))}
                className="w-8 h-8 flex items-center justify-center rounded-xl bg-white hover:bg-slate-100 border border-slate-200 text-slate-600 transition-colors"
              >
                -
              </button>
              <input 
                type="number" 
                className="w-full text-center bg-transparent border-none text-sm font-semibold focus:outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                value={adjustQty}
                onChange={(e) => setAdjustQty(Number(e.target.value) || 1)}
              />
              <button 
                onClick={() => setAdjustQty(adjustQty + 1)}
                className="w-8 h-8 flex items-center justify-center rounded-xl bg-white hover:bg-slate-100 border border-slate-200 text-slate-600 transition-colors"
              >
                +
              </button>
            </div>
          </div>
          <p className="text-xxs text-slate-400 leading-relaxed pl-1">
            💡 **คำแนะนำ**: ตั้งค่าปรับจำลองจำนวนสินค้า (เช่น 1 หรือ 5) จากนั้นลองนำบาร์โค้ดสินค้าหรือ SKU มาวางในช่องสแกน สต็อกสินค้าในตารางจะปรับตัวโดยอัตโนมัติ!
          </p>
        </div>

        {/* Global Search & Quick Add button */}
        <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm flex flex-col justify-between gap-4">
          <div className="space-y-3">
            <h3 className="font-bold text-slate-800 text-sm tracking-tight">ค้นหาสินค้า & เมนูลัด</h3>
            <input
              type="text"
              className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-xs"
              placeholder="ค้นหาด้วยชื่อสินค้า SKU หรือ บาร์โค้ด..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <button 
            onClick={() => setShowAddForm(!showAddForm)}
            className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-indigo-600 to-indigo-700 text-white text-xs font-semibold hover:shadow-md hover:from-indigo-700 hover:to-indigo-800 transition-all flex items-center justify-center gap-1.5"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
            </svg>
            เพิ่มสินค้าใหม่ในระบบ
          </button>
        </div>
      </div>

      {/* Add New Product Form Dropdown */}
      {showAddForm && (
        <form onSubmit={handleAddProduct} className="rounded-3xl border border-slate-200 bg-white p-5 shadow-md animate-in slide-in-from-top-4 duration-300 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <h3 className="font-bold text-slate-800 text-sm">รายละเอียดสินค้าใหม่</h3>
            <button 
              type="button" 
              onClick={() => setShowAddForm(false)}
              className="text-slate-400 hover:text-slate-600 text-xs"
            >
              ยกเลิก
            </button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4">
            <div className="space-y-1">
              <label className="text-xxs font-semibold text-slate-500">ชื่อสินค้า *</label>
              <input 
                required
                type="text" 
                className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-indigo-500/20 focus:outline-none"
                placeholder="แก้วมัคสกรีนลาย"
                value={newProduct.name}
                onChange={(e) => setNewProduct({...newProduct, name: e.target.value})}
              />
            </div>
            <div className="space-y-1">
              <label className="text-xxs font-semibold text-slate-500">SKU *</label>
              <input 
                required
                type="text" 
                className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-indigo-500/20 focus:outline-none"
                placeholder="SKU-MC-006"
                value={newProduct.sku}
                onChange={(e) => setNewProduct({...newProduct, sku: e.target.value})}
              />
            </div>
            <div className="space-y-1">
              <label className="text-xxs font-semibold text-slate-500">บาร์โค้ด (ทางเลือก)</label>
              <input 
                type="text" 
                className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-indigo-500/20 focus:outline-none"
                placeholder="885000000006"
                value={newProduct.barcode}
                onChange={(e) => setNewProduct({...newProduct, barcode: e.target.value})}
              />
            </div>
            <div className="space-y-1">
              <label className="text-xxs font-semibold text-slate-500">ราคาสินค้า (THB)</label>
              <input 
                type="number" 
                className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-indigo-500/20 focus:outline-none"
                value={newProduct.unitPrice}
                onChange={(e) => setNewProduct({...newProduct, unitPrice: Number(e.target.value) || 0})}
              />
            </div>
            <div className="space-y-1">
              <label className="text-xxs font-semibold text-slate-500">จำนวนเริ่มต้น</label>
              <input 
                type="number" 
                className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-indigo-500/20 focus:outline-none"
                value={newProduct.stockQty}
                onChange={(e) => setNewProduct({...newProduct, stockQty: Number(e.target.value) || 0})}
              />
            </div>
            <div className="space-y-1">
              <label className="text-xxs font-semibold text-slate-500">สต็อกเตือนขั้นต่ำ</label>
              <input 
                type="number" 
                className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-indigo-500/20 focus:outline-none"
                value={newProduct.lowStockThreshold}
                onChange={(e) => setNewProduct({...newProduct, lowStockThreshold: Number(e.target.value) || 0})}
              />
            </div>
          </div>
          <div className="flex justify-end">
            <button 
              type="submit" 
              disabled={isSavingProduct}
              className="py-2 px-5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs shadow-sm transition-all"
            >
              {isSavingProduct ? "กำลังบันทึก..." : "บันทึกสินค้า"}
            </button>
          </div>
        </form>
      )}

      {/* Main Stock Products Presentation View */}
      <div className="rounded-3xl border border-slate-200 bg-white overflow-hidden shadow-sm">
        {loading ? (
          <div className="p-16 flex flex-col items-center justify-center gap-3">
            <svg className="animate-spin h-8 w-8 text-indigo-600" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
            <p className="text-xs font-semibold text-slate-400">กำลังดึงรายการสินค้าจากฐานข้อมูล SQL Server...</p>
          </div>
        ) : (
          <>
            {/* Desktop Custom Table (Shown only on md and larger) */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full border-collapse text-left">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50/70 text-slate-500 text-xxs font-bold uppercase tracking-wider">
                    <th className="px-6 py-4">รหัส SKU</th>
                    <th className="px-6 py-4">บาร์โค้ดสินค้า</th>
                    <th className="px-6 py-4">ชื่อสินค้า</th>
                    <th className="px-6 py-4 text-right">ราคาจำหน่าย</th>
                    <th className="px-6 py-4 text-center">ระดับแจ้งเตือน</th>
                    <th className="px-6 py-4 text-center">สถานะคงคลัง / ปรับสต็อก</th>
                    <th className="px-6 py-4 text-center">พิมพ์บาร์โค้ด / ลบ</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700 text-sm">
                  {products.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-6 py-12 text-center text-slate-400 text-xs">
                        ไม่พบรายการสินค้าในคลังข้อมูล
                      </td>
                    </tr>
                  ) : (
                    products.map((p) => {
                      const isLow = p.stockQty <= p.lowStockThreshold;
                      return (
                        <tr key={p.id} className="hover:bg-slate-50/40 transition-colors">
                          <td className="px-6 py-4 font-mono text-xs font-semibold text-slate-600">{p.sku}</td>
                          <td className="px-6 py-4 font-mono text-xs text-slate-500">{p.barcode}</td>
                          <td className="px-6 py-4 font-medium text-slate-800">{p.name}</td>
                          <td className="px-6 py-4 text-right font-semibold">฿{p.unitPrice.toLocaleString()}</td>
                          <td className="px-6 py-4 text-center text-slate-500 text-xs">{p.lowStockThreshold} ชิ้น</td>
                          <td className="px-6 py-4">
                            <div className="flex flex-col items-center gap-1.5">
                              <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                                isLow 
                                  ? "bg-rose-50 text-rose-700 ring-1 ring-rose-600/10 animate-pulse" 
                                  : "bg-slate-50 text-slate-700 ring-1 ring-slate-600/10"
                              }`}>
                                <span className={`h-1.5 w-1.5 rounded-full ${isLow ? "bg-rose-500" : "bg-emerald-500"}`}></span>
                                {p.stockQty} ชิ้น
                              </span>
                              
                              {/* Easy Micro stock tuner */}
                              <div className="flex items-center gap-1">
                                <button 
                                  onClick={() => handleUpdateStock(p.id, -1)}
                                  className="w-5 h-5 flex items-center justify-center rounded bg-slate-100 hover:bg-slate-200 active:scale-95 text-slate-600 text-xxs transition-all font-bold"
                                >
                                  -
                                </button>
                                <button 
                                  onClick={() => handleUpdateStock(p.id, 1)}
                                  className="w-5 h-5 flex items-center justify-center rounded bg-indigo-50 hover:bg-indigo-100 text-indigo-600 text-xxs transition-all font-bold"
                                >
                                  +
                                </button>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex items-center justify-center gap-2">
                              <button
                                onClick={() => {
                                  setSelected(p);
                                  setOpenBarcode(true);
                                }}
                                className="inline-flex items-center gap-1 py-1.5 px-3 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 active:scale-95 text-slate-600 text-xs transition-all shadow-sm"
                              >
                                <svg className="w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
                                </svg>
                                แท็กบาร์โค้ด
                              </button>

                              <button
                                onClick={() => handleDeleteProduct(p.id, p.name)}
                                className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-rose-50 text-slate-400 hover:text-rose-600 transition-all shadow-sm"
                                title="ลบสินค้า"
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

            {/* Mobile Modern Product Cards Layout (Shown only on small screens < md) */}
            <div className="block md:hidden p-4 space-y-4 bg-slate-50/50">
              {products.length === 0 ? (
                <p className="text-center text-slate-400 text-xs py-8">ไม่พบรายการสินค้า</p>
              ) : (
                products.map((p) => {
                  const isLow = p.stockQty <= p.lowStockThreshold;
                  return (
                    <div 
                      key={p.id} 
                      className={`rounded-2xl bg-white border p-4 shadow-sm space-y-3 transition-all ${
                        isLow ? "border-rose-100 bg-rose-50/10" : "border-slate-100"
                      }`}
                    >
                      <div className="flex items-start justify-between">
                        <div>
                          <h4 className="font-bold text-slate-800 text-sm">{p.name}</h4>
                          <p className="text-xxs font-mono text-slate-400 mt-0.5">SKU: {p.sku} | Bar: {p.barcode}</p>
                        </div>
                        <span className="text-sm font-bold text-slate-800">฿{p.unitPrice}</span>
                      </div>

                      {/* Stock status indicator details */}
                      <div className="flex items-center justify-between border-t border-b border-slate-100/70 py-2.5 my-1">
                        <div className="space-y-0.5">
                          <p className="text-xxs text-slate-400">สถานะสต็อก</p>
                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xxs font-bold ${
                            isLow ? "text-rose-600 bg-rose-50 animate-pulse" : "text-emerald-600 bg-emerald-50"
                          }`}>
                            {isLow ? "⚠️ ต่ำกว่าเกณฑ์" : "✅ ปกติ"}
                          </span>
                        </div>

                        <div className="text-right">
                          <p className="text-xxs text-slate-400">สต็อกคงเหลือ</p>
                          <span className="text-sm font-bold text-slate-800">{p.stockQty} ชิ้น</span>
                        </div>
                      </div>

                      {/* Operational Interactive controllers */}
                      <div className="flex items-center justify-between gap-3 pt-0.5">
                        <button
                          onClick={() => {
                            setSelected(p);
                            setOpenBarcode(true);
                          }}
                          className="py-2 px-3 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 text-xs font-semibold transition-all flex items-center justify-center gap-1.5 flex-1 shadow-sm"
                        >
                          <svg className="w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
                          </svg>
                          บาร์โค้ด
                        </button>

                        <div className="flex items-center gap-1 border border-slate-200 rounded-xl p-1 bg-slate-50/50">
                          <button 
                            onClick={() => handleUpdateStock(p.id, -1)}
                            className="w-8 h-8 flex items-center justify-center rounded-lg bg-white border border-slate-200 text-slate-600 text-sm active:scale-95 font-bold transition-all"
                          >
                            -
                          </button>
                          <span className="w-8 text-center text-xs font-bold text-slate-800">{p.stockQty}</span>
                          <button 
                            onClick={() => handleUpdateStock(p.id, 1)}
                            className="w-8 h-8 flex items-center justify-center rounded-lg bg-indigo-600 text-white text-sm active:scale-95 font-bold transition-all shadow-sm shadow-indigo-200"
                          >
                            +
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </>
        )}
      </div>

      {/* Premium minimal Barcode Modal */}
      {openBarcode && selected && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Backdrop */}
          <div 
            onClick={() => setOpenBarcode(false)}
            className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm transition-opacity"
          ></div>

          {/* Modal Content */}
          <div className="relative w-full max-w-md transform rounded-3xl bg-white p-6 text-left shadow-2xl transition-all border border-slate-100 flex flex-col gap-5 animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base font-bold text-slate-800">แท็กป้ายบาร์โค้ด (Barcode Label)</h3>
              <button 
                onClick={() => setOpenBarcode(false)}
                className="text-slate-400 hover:text-slate-600 rounded-lg p-1 hover:bg-slate-100 transition-colors"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Label Print Frame Preview */}
            <div className="flex flex-col items-center justify-center border border-slate-200 rounded-2xl p-4 bg-slate-50 shadow-inner">
              <div className="bg-white border border-slate-300 rounded-lg p-3 text-center shadow-sm w-[260px] flex flex-col items-center justify-center">
                <p className="text-xs font-bold text-slate-800 leading-tight mb-1 truncate w-full">{selected.name}</p>
                <svg ref={barcodeSvgRef} className="max-w-full my-1.5" />
                <p className="text-xxs font-mono text-slate-500 leading-none">SKU: {selected.sku}</p>
              </div>
            </div>

            {/* Invisible printer wrapper */}
            <div style={{ position: "absolute", left: -9999, top: -9999 }}>
              <div 
                ref={printRef} 
                style={{ 
                  width: "80mm", 
                  height: "30mm", 
                  padding: "4mm 6mm", 
                  display: "flex", 
                  flexDirection: "column", 
                  alignItems: "center", 
                  justifyContent: "center",
                  background: "white",
                  color: "black",
                  fontFamily: "sans-serif"
                }}
              >
                <p style={{ margin: "0 0 1mm 0", fontSize: "11px", fontWeight: "bold", width: "100%", textAlign: "center", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{selected.name}</p>
                <svg ref={barcodeSvgRef} style={{ width: "100%", height: "16mm" }} />
                <p style={{ margin: "1mm 0 0 0", fontSize: "9px", fontFamily: "monospace", width: "100%", textAlign: "center" }}>SKU: {selected.sku}</p>
              </div>
            </div>

            {/* Modal actions */}
            <div className="flex items-center justify-end gap-3 border-t border-slate-100 pt-3">
              <button 
                onClick={() => setOpenBarcode(false)}
                className="py-2 px-4 rounded-xl border border-slate-200 text-xs font-semibold text-slate-500 hover:bg-slate-50 active:scale-95 transition-all"
              >
                ปิดหน้าต่าง
              </button>
              <button 
                onClick={printLabel}
                className="py-2 px-5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-md shadow-indigo-100 hover:shadow-lg active:scale-95 transition-all flex items-center gap-1.5"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                </svg>
                สั่งพิมพ์สติกเกอร์
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
