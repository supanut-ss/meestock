"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import JsBarcode from "jsbarcode";
import { useReactToPrint } from "react-to-print";
import * as XLSX from "xlsx";
import ImportExcelModal from "./ImportExcelModal";
import {
  getProducts,
  updateProductStock,
  createProduct,
  updateProduct,
  deleteProduct,
  getCategoriesFlat,
  getProductHistory,
  checkSkuExists,
  DBProduct,
  DBCategory,
  DBProductAuditLog,
  DBProductVariant,
  DBBundleComponent,
  getProductVariants,
  createProductVariant,
  updateProductVariant,
  deleteProductVariant,
  getBundleComponents,
  saveBundleComponents,
  findProductOrVariantByBarcode,
} from "@/lib/dbActions";
import CameraScannerModal from "./CameraScannerModal";

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  active: { label: "ใช้งาน", color: "bg-emerald-50 text-emerald-700 ring-emerald-600/10" },
  inactive: { label: "ปิดใช้งาน", color: "bg-slate-100 text-slate-500 ring-slate-500/10" },
  discontinued: { label: "ยกเลิก", color: "bg-rose-50 text-rose-700 ring-rose-600/10" },
};

const BLANK_PRODUCT = {
  sku: "", barcode: "", name: "", unitPrice: 99, costPrice: 0,
  stockQty: 10, lowStockThreshold: 3, unit: "ชิ้น", notes: "",
  categoryId: "" as string | null, imageUrl: "" as string | null,
};

type SortField = "sku" | "name" | "unitPrice" | "costPrice" | "stockQty";
type SortDirection = "asc" | "desc";

export default function ProductManagement({ isAdmin = true }: { isAdmin?: boolean }) {
  const [products, setProducts] = useState<DBProduct[]>([]);
  const [categories, setCategories] = useState<DBCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [scannerValue, setScannerValue] = useState("");
  const [adjustQty, setAdjustQty] = useState(1);
  const [selected, setSelected] = useState<DBProduct | null>(null);
  const [openBarcode, setOpenBarcode] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("active");
  const [showScanner, setShowScanner] = useState(false);
  const [scannerTarget, setScannerTarget] = useState<"stock_adjust" | "product_barcode" | "variant_barcode">("stock_adjust");

  // Advanced Filters
  const [stockLevelFilter, setStockLevelFilter] = useState<"all" | "normal" | "low" | "out">("all");
  const [priceMin, setPriceMin] = useState<string>("");
  const [priceMax, setPriceMax] = useState<string>("");

  // Sorting
  const [sortField, setSortField] = useState<SortField | null>(null);
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc");

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 20;

  // Add / Edit form
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingProduct, setEditingProduct] = useState<DBProduct | null>(null);
  const [isSavingProduct, setIsSavingProduct] = useState(false);
  const [skuExists, setSkuExists] = useState(false);
  const [newProduct, setNewProduct] = useState({ ...BLANK_PRODUCT });

  // Product History
  const [historyProduct, setHistoryProduct] = useState<DBProduct | null>(null);
  const [history, setHistory] = useState<DBProductAuditLog[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  // Excel Import/Export
  const [showImportModal, setShowImportModal] = useState(false);

  // Product Type selection
  const [newProductType, setNewProductType] = useState<"standard" | "bundle">("standard");

  // Variants Manager Modal
  const [selectedProductForVariants, setSelectedProductForVariants] = useState<DBProduct | null>(null);
  const [variantsList, setVariantsList] = useState<DBProductVariant[]>([]);
  const [variantForm, setVariantForm] = useState({ name: "", sku: "", barcode: "", costPrice: 0, unitPrice: 0, stockQty: 0, lowStockThreshold: 3 });
  const [showVariantForm, setShowVariantForm] = useState(false);
  const [editingVariantId, setEditingVariantId] = useState<string | null>(null);

  // Bundle Manager Modal
  const [selectedProductForBundle, setSelectedProductForBundle] = useState<DBProduct | null>(null);
  const [bundleComponents, setBundleComponents] = useState<DBBundleComponent[]>([]);
  const [addComponentId, setAddComponentId] = useState("");
  const [addComponentQty, setAddComponentQty] = useState(1);

  // Variant handlers
  const loadVariants = async (productId: string) => {
    const data = await getProductVariants(productId);
    setVariantsList(data);
  };

  const handleSaveVariant = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProductForVariants || !variantForm.sku || !variantForm.name) return;

    if (editingVariantId) {
      const success = await updateProductVariant(editingVariantId, {
        name: variantForm.name,
        sku: variantForm.sku,
        barcode: variantForm.barcode,
        costPrice: Number(variantForm.costPrice),
        unitPrice: Number(variantForm.unitPrice),
        stockQty: Number(variantForm.stockQty),
        lowStockThreshold: Number(variantForm.lowStockThreshold),
      });
      if (success) {
        setEditingVariantId(null);
        setShowVariantForm(false);
        await loadVariants(selectedProductForVariants.id);
        void loadProducts();
      } else {
        alert("ไม่สามารถบันทึกตัวเลือกได้");
      }
    } else {
      const success = await createProductVariant({
        productId: selectedProductForVariants.id,
        sku: variantForm.sku,
        barcode: variantForm.barcode,
        name: variantForm.name,
        costPrice: Number(variantForm.costPrice),
        unitPrice: Number(variantForm.unitPrice),
        stockQty: Number(variantForm.stockQty),
        lowStockThreshold: Number(variantForm.lowStockThreshold),
      });
      if (success) {
        setShowVariantForm(false);
        await loadVariants(selectedProductForVariants.id);
        void loadProducts();
      } else {
        alert("ไม่สามารถสร้างตัวเลือกใหม่ได้");
      }
    }
  };

  const handleDeleteVariant = async (variantId: string) => {
    if (!confirm("ต้องการลบตัวเลือกนี้หรือไม่?")) return;
    const success = await deleteProductVariant(variantId);
    if (success && selectedProductForVariants) {
      await loadVariants(selectedProductForVariants.id);
      void loadProducts();
    }
  };

  // Bundle handlers
  const loadBundleComponents = async (bundleId: string) => {
    const data = await getBundleComponents(bundleId);
    setBundleComponents(data);
  };

  const handleAddBundleComponent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProductForBundle || !addComponentId || addComponentQty < 1) return;

    const component = products.find((p) => p.id === addComponentId);
    if (!component) return;

    if (bundleComponents.some((bc) => bc.componentId === addComponentId)) {
      alert("สินค้านี้อยู่ในชุดเซ็ตแล้ว");
      return;
    }

    const updated = [
      ...bundleComponents,
      {
        id: "",
        componentId: addComponentId,
        name: component.name,
        sku: component.sku,
        qtyRequired: addComponentQty,
        stockQty: component.stockQty,
      },
    ];

    const success = await saveBundleComponents(
      selectedProductForBundle.id,
      updated.map((c) => ({ componentId: c.componentId, qtyRequired: c.qtyRequired }))
    );

    if (success) {
      setAddComponentId("");
      setAddComponentQty(1);
      await loadBundleComponents(selectedProductForBundle.id);
      void loadProducts();
    }
  };

  const handleRemoveBundleComponent = async (compComponentId: string) => {
    if (!selectedProductForBundle) return;
    const updated = bundleComponents.filter((bc) => bc.componentId !== compComponentId);

    const success = await saveBundleComponents(
      selectedProductForBundle.id,
      updated.map((c) => ({ componentId: c.componentId, qtyRequired: c.qtyRequired }))
    );

    if (success) {
      await loadBundleComponents(selectedProductForBundle.id);
      void loadProducts();
    }
  };

  const handleExportExcel = () => {
    const dataToExport = processedProducts.map((p) => {
      const row: any = {
        "SKU": p.sku,
        "บาร์โค้ด": p.barcode || "",
        "ชื่อสินค้า": p.name,
        "หมวดหมู่": p.categoryName || "",
        "ราคาขาย (฿)": p.unitPrice,
      };
      
      if (isAdmin) {
        row["ราคาทุน (฿)"] = p.costPrice;
      }
      
      row["คงเหลือ"] = p.stockQty;
      row["สต็อกขั้นต่ำ"] = p.lowStockThreshold;
      row["หน่วยนับ"] = p.unit;
      row["หมายเหตุ"] = p.notes || "";
      row["สถานะ"] = STATUS_LABELS[p.status]?.label || p.status;
      
      return row;
    });

    const worksheet = XLSX.utils.json_to_sheet(dataToExport);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "คลังสินค้า");
    XLSX.writeFile(workbook, `MeeStock_Products_Catalog_${new Date().toISOString().split("T")[0]}.xlsx`);
  };

  const barcodeSvgRef = useRef<SVGSVGElement>(null);
  const printRef = useRef<HTMLDivElement>(null);

  const printLabel = useReactToPrint({
    contentRef: printRef,
    documentTitle: selected?.sku ? `barcode-${selected.sku}` : "barcode-label",
  });

  const loadProducts = async () => {
    setLoading(true);
    try {
      const data = await getProducts(searchTerm, categoryFilter || undefined, statusFilter || "active");
      setProducts(data);
      setCurrentPage(1); // Reset page on query load
    } catch (err) {
      console.error("Failed to load products:", err);
    } finally {
      setLoading(false);
    }
  };

  const loadCategories = async () => {
    const cats = await getCategoriesFlat();
    setCategories(cats);
  };

  useEffect(() => {
    void loadCategories();
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => { void loadProducts(); }, 300);
    return () => clearTimeout(timer);
  }, [searchTerm, categoryFilter, statusFilter]);

  // Render Barcode in Modal
  useEffect(() => {
    if (!selected || !barcodeSvgRef.current || !openBarcode) return;
    try {
      JsBarcode(barcodeSvgRef.current, selected.barcode || selected.sku, {
        format: "CODE128", displayValue: true, width: 2, height: 64,
        margin: 8, fontSize: 14, lineColor: "#0f172a",
      });
    } catch (err) {
      console.error("Barcode generation error:", err);
    }
  }, [selected, openBarcode]);

  // Scanner
  useEffect(() => {
    if (!scannerValue.trim()) return;
    const timer = setTimeout(async () => {
      const code = scannerValue.trim();
      const match = products.find((p) => p.barcode === code || p.sku === code);
      if (match) {
        setScannerValue("");
        const success = await updateProductStock(match.id, adjustQty);
        if (success) void loadProducts();
        else alert("ไม่สามารถปรับสต็อกได้");
      }
    }, 250);
    return () => clearTimeout(timer);
  }, [scannerValue, adjustQty, products]);

  const handleBarcodeScanned = async (code: string) => {
    if (scannerTarget === "stock_adjust") {
      const match = products.find((p) => p.barcode === code || p.sku === code);
      if (match) {
        const success = await updateProductStock(match.id, adjustQty);
        if (success) void loadProducts();
        else alert("ไม่สามารถปรับสต็อกได้");
      } else {
        const result = await findProductOrVariantByBarcode(code);
        if (result) {
          const { product, variant } = result;
          if (variant) {
            const success = await updateProductVariant(variant.id, {
              name: variant.name,
              sku: variant.sku,
              barcode: variant.barcode || "",
              costPrice: variant.costPrice,
              unitPrice: variant.unitPrice,
              stockQty: variant.stockQty + adjustQty,
              lowStockThreshold: variant.lowStockThreshold,
            });
            if (success) {
              void loadProducts();
              if (selectedProductForVariants && selectedProductForVariants.id === product.id) {
                void loadVariants(product.id);
              }
            } else {
              alert("ไม่สามารถปรับสต็อกตัวเลือกย่อยได้");
            }
          } else {
            const success = await updateProductStock(product.id, adjustQty);
            if (success) void loadProducts();
            else alert("ไม่สามารถปรับสต็อกได้");
          }
        } else {
          alert(`ไม่พบสินค้าที่ตรงกับบาร์โค้ด "${code}"`);
        }
      }
    } else if (scannerTarget === "product_barcode") {
      setNewProduct((prev) => ({ ...prev, barcode: code }));
    } else if (scannerTarget === "variant_barcode") {
      setVariantForm((prev) => ({ ...prev, barcode: code }));
    }
  };

  const handleUpdateStock = async (id: string, amount: number) => {
    const success = await updateProductStock(id, amount);
    if (success) void loadProducts();
    else alert("ไม่สามารถปรับปรุงสต็อกได้");
  };

  // SKU real-time check (debounced)
  useEffect(() => {
    if (!newProduct.sku.trim()) { setSkuExists(false); return; }
    const timer = setTimeout(async () => {
      const exists = await checkSkuExists(newProduct.sku, editingProduct?.id);
      setSkuExists(exists);
    }, 300);
    return () => clearTimeout(timer);
  }, [newProduct.sku, editingProduct?.id]);

  const openEditModal = (p: DBProduct) => {
    setEditingProduct(p);
    setNewProduct({
      sku: p.sku, barcode: p.barcode, name: p.name,
      unitPrice: p.unitPrice, costPrice: p.costPrice,
      stockQty: p.stockQty, lowStockThreshold: p.lowStockThreshold,
      unit: p.unit, notes: p.notes, categoryId: p.categoryId,
      imageUrl: p.imageUrl,
    });
    setShowAddForm(true);
  };

  const handleSaveProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProduct.name || !newProduct.sku) return;
    if (skuExists) { alert("รหัส SKU นี้มีอยู่แล้วในระบบ"); return; }
    setIsSavingProduct(true);
    try {
      if (editingProduct) {
        // Update mode
        const success = await updateProduct(editingProduct.id, {
          name: newProduct.name,
          unitPrice: Number(newProduct.unitPrice),
          costPrice: Number(newProduct.costPrice),
          lowStockThreshold: Number(newProduct.lowStockThreshold),
          unit: newProduct.unit,
          notes: newProduct.notes,
          categoryId: newProduct.categoryId || null,
          imageUrl: newProduct.imageUrl || null,
        });
        if (success) {
          setShowAddForm(false);
          setEditingProduct(null);
          setNewProduct({ ...BLANK_PRODUCT });
          void loadProducts();
        } else {
          alert("ไม่สามารถบันทึกสินค้าได้");
        }
      } else {
        // Create mode
        const success = await createProduct({
          sku: newProduct.sku,
          barcode: newProduct.barcode || `885${Math.floor(1000000000 + Math.random() * 9000000000)}`,
          name: newProduct.name,
          unitPrice: Number(newProduct.unitPrice),
          costPrice: Number(newProduct.costPrice),
          stockQty: Number(newProduct.stockQty),
          lowStockThreshold: Number(newProduct.lowStockThreshold),
          unit: newProduct.unit || "ชิ้น",
          notes: newProduct.notes || "",
          categoryId: newProduct.categoryId || null,
          imageUrl: newProduct.imageUrl || null,
          productType: newProductType,
        });
        if (success) {
          setNewProduct({ ...BLANK_PRODUCT });
          setShowAddForm(false);
          void loadProducts();
        } else {
          alert("ไม่สามารถบันทึกสินค้าใหม่ได้");
        }
      }
    } catch (err) {
      console.error(err);
      alert("เกิดข้อผิดพลาดในการบันทึก");
    } finally {
      setIsSavingProduct(false);
    }
  };

  const handleDeleteProduct = async (p: DBProduct) => {
    if (!confirm(`ปิดสินค้า "${p.name}"? สินค้าจะถูก soft-delete (ไม่ลบข้อมูลจริง)`)) return;
    const result = await deleteProduct(p.id);
    if (result.success) {
      void loadProducts();
    } else {
      alert(result.error || "ไม่สามารถปิดสินค้าได้");
    }
  };

  const openHistoryModal = async (p: DBProduct) => {
    setHistoryProduct(p);
    setHistoryLoading(true);
    const logs = await getProductHistory(p.id);
    setHistory(logs);
    setHistoryLoading(false);
  };

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDirection("asc");
    }
    setCurrentPage(1);
  };

  // Filter & Sort Logic
  const processedProducts = useMemo(() => {
    let result = [...products];

    // Filter by Stock Level
    if (stockLevelFilter !== "all") {
      result = result.filter((p) => {
        if (stockLevelFilter === "normal") return p.stockQty > p.lowStockThreshold;
        if (stockLevelFilter === "low") return p.stockQty <= p.lowStockThreshold && p.stockQty > 0;
        if (stockLevelFilter === "out") return p.stockQty === 0;
        return true;
      });
    }

    // Filter by Price range
    if (priceMin.trim() !== "") {
      result = result.filter((p) => p.unitPrice >= Number(priceMin));
    }
    if (priceMax.trim() !== "") {
      result = result.filter((p) => p.unitPrice <= Number(priceMax));
    }

    // Sorting
    if (sortField) {
      result.sort((a, b) => {
        let valA = a[sortField];
        let valB = b[sortField];

        if (typeof valA === "string" && typeof valB === "string") {
          return sortDirection === "asc"
            ? valA.localeCompare(valB, "th")
            : valB.localeCompare(valA, "th");
        } else {
          // Numbers or nulls
          valA = valA ?? 0;
          valB = valB ?? 0;
          return sortDirection === "asc"
            ? (valA as number) - (valB as number)
            : (valB as number) - (valA as number);
        }
      });
    }

    return result;
  }, [products, stockLevelFilter, priceMin, priceMax, sortField, sortDirection]);

  // Paginated Products
  const paginatedProducts = useMemo(() => {
    const startIdx = (currentPage - 1) * itemsPerPage;
    return processedProducts.slice(startIdx, startIdx + itemsPerPage);
  }, [processedProducts, currentPage]);

  const totalPages = Math.ceil(processedProducts.length / itemsPerPage);

  const lowStockCount = useMemo(() => products.filter((p) => p.stockQty <= p.lowStockThreshold).length, [products]);

  const fieldLabel: Record<string, string> = {
    name: "ชื่อสินค้า", unit_price: "ราคาขาย", cost_price: "ราคาทุน", status: "สถานะ",
  };

  const getSortIcon = (field: SortField) => {
    if (sortField !== field) return "↕";
    return sortDirection === "asc" ? "▲" : "▼";
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 tracking-tight">คลังสินค้าและการจัดการสต็อก</h1>
          <p className="text-slate-500 text-sm">จัดการรายการสินค้า ปรับปรุงสต็อก และพิมพ์บาร์โค้ดสินค้าแบบเรียลไทม์</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 rounded-2xl bg-white border border-slate-200 px-4 py-2.5 shadow-sm">
            <span className="h-2 w-2 rounded-full bg-indigo-500"></span>
            <span className="text-xs font-semibold text-slate-600">ทั้งหมด: {products.length} รายการ</span>
          </div>
          <div className={`flex items-center gap-2 rounded-2xl border px-4 py-2.5 shadow-sm transition-all ${lowStockCount > 0 ? "bg-rose-50 border-rose-100 text-rose-700 animate-pulse" : "bg-emerald-50 border-emerald-100 text-emerald-700"}`}>
            <span className={`h-2 w-2 rounded-full ${lowStockCount > 0 ? "bg-rose-500" : "bg-emerald-500"}`}></span>
            <span className="text-xs font-semibold">สต็อกต่ำ: {lowStockCount} รายการ</span>
          </div>
        </div>
      </div>

      {/* Operations */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Scanner */}
        <div className="lg:col-span-2 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <h3 className="font-bold text-slate-800 text-sm tracking-tight flex items-center gap-2">
              <svg className="w-5 h-5 text-indigo-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
              </svg>
              จำลองการสแกนบาร์โค้ด
            </h3>
            <span className="text-[10px] font-medium text-slate-400 bg-slate-50 px-2 py-1 rounded-md">Scanner Ready</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-[1fr_auto_180px] gap-4">
            <div className="relative">
              <input
                type="text"
                className="w-full pl-11 pr-4 py-3 rounded-2xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-sm transition-all"
                placeholder="วาง Barcode/SKU เพื่อสแกน..."
                value={scannerValue}
                onChange={(e) => setScannerValue(e.target.value)}
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
            <button
              type="button"
              onClick={() => {
                setScannerTarget("stock_adjust");
                setShowScanner(true);
              }}
              className="py-2.5 px-4 rounded-2xl border border-indigo-100 bg-indigo-50 hover:bg-indigo-100 text-indigo-600 text-sm font-semibold transition-all flex items-center justify-center gap-1.5 cursor-pointer active:scale-95 shadow-sm"
              title="สแกนด้วยกล้องถ่ายภาพ"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6.827 6.175A2.31 2.31 0 015.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 00-1.134-.175 2.31 2.31 0 01-1.64-1.055l-.822-1.316a2.192 2.192 0 00-1.736-1.039 48.774 48.774 0 00-5.232 0 2.192 2.192 0 00-1.736 1.039l-.821 1.316z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 12.75a4.5 4.5 0 11-9 0 4.5 4.5 0 019 0zM18.75 10.5h.008v.008h-.008V10.5z" />
              </svg>
              สแกนกล้อง
            </button>
            <div className="flex items-center border border-slate-200 rounded-2xl px-2 py-1 bg-slate-50">
              <button onClick={() => setAdjustQty(Math.max(1, adjustQty - 1))} className="w-8 h-8 flex items-center justify-center rounded-xl bg-white hover:bg-slate-100 border border-slate-200 text-slate-600 transition-colors">-</button>
              <input type="number" className="w-full text-center bg-transparent border-none text-sm font-semibold focus:outline-none" value={adjustQty} onChange={(e) => setAdjustQty(Number(e.target.value) || 1)} />
              <button onClick={() => setAdjustQty(adjustQty + 1)} className="w-8 h-8 flex items-center justify-center rounded-xl bg-white hover:bg-slate-100 border border-slate-200 text-slate-600 transition-colors">+</button>
            </div>
          </div>
        </div>

        {/* Search & Filters */}
        <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm space-y-4">
          <div className="space-y-3">
            <h3 className="font-bold text-slate-800 text-sm">ค้นหา & กรอง</h3>
            
            <input
              type="text"
              className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-xs"
              placeholder="ค้นหาชื่อสินค้า, SKU, บาร์โค้ด..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />

            <div className="grid grid-cols-2 gap-2">
              <select
                className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/20 bg-white"
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
              >
                <option value="">ทุกหมวดหมู่</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>{c.parentId ? `└ ${c.name}` : c.name}</option>
                ))}
              </select>

              <select
                className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/20 bg-white"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
              >
                <option value="active">ใช้งาน</option>
                <option value="inactive">ปิดใช้งาน</option>
                <option value="discontinued">ยกเลิก</option>
                <option value="all">สถานะทั้งหมด</option>
              </select>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <select
                className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/20 bg-white"
                value={stockLevelFilter}
                onChange={(e: any) => setStockLevelFilter(e.target.value)}
              >
                <option value="all">ระดับสต็อกทั้งหมด</option>
                <option value="normal">สต็อกปกติ</option>
                <option value="low">สต็อกต่ำกว่าเกณฑ์</option>
                <option value="out">สินค้าหมด</option>
              </select>

              <div className="flex gap-1.5 items-center">
                <input
                  type="number"
                  placeholder="Min ฿"
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                  value={priceMin}
                  onChange={(e) => setPriceMin(e.target.value)}
                />
                <span className="text-slate-300 text-xs">-</span>
                <input
                  type="number"
                  placeholder="Max ฿"
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                  value={priceMax}
                  onChange={(e) => setPriceMax(e.target.value)}
                />
              </div>
            </div>
          </div>

          <button
            onClick={() => { setEditingProduct(null); setNewProduct({ ...BLANK_PRODUCT }); setShowAddForm(!showAddForm); }}
            className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-indigo-600 to-indigo-700 text-white text-xs font-semibold hover:shadow-md transition-all flex items-center justify-center gap-1.5 cursor-pointer"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
            </svg>
            เพิ่มสินค้าใหม่
          </button>

          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={handleExportExcel}
              type="button"
              className="py-2 px-3 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-semibold transition-all flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <svg className="w-3.5 h-3.5 text-indigo-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 10v6m0 0l-3-3m3 3l3-3M3 17V7a2 2 0 012-2h6l2 2h7a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
              </svg>
              ส่งออก Excel
            </button>
            <button
              onClick={() => setShowImportModal(true)}
              type="button"
              className="py-2 px-3 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-semibold transition-all flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <svg className="w-3.5 h-3.5 text-indigo-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
              </svg>
              นำเข้า Excel
            </button>
          </div>
        </div>
      </div>

      {/* Add / Edit Form */}
      {showAddForm && (
        <form onSubmit={handleSaveProduct} className="rounded-3xl border border-slate-200 bg-white p-5 shadow-md animate-in slide-in-from-top-4 duration-300 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <h3 className="font-bold text-slate-800 text-sm">
              {editingProduct ? `แก้ไขสินค้า: ${editingProduct.name}` : "เพิ่มสินค้าใหม่"}
            </h3>
            <button type="button" onClick={() => { setShowAddForm(false); setEditingProduct(null); }} className="text-slate-400 hover:text-slate-600 text-xs">ยกเลิก</button>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
            {/* Product Type Selection */}
            {!editingProduct && (
              <div className="space-y-1">
                <label className="text-[10px] font-semibold text-slate-500">ประเภทสินค้า</label>
                <select className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-indigo-500/20 focus:outline-none bg-white font-semibold text-slate-700" value={newProductType} onChange={(e: any) => setNewProductType(e.target.value)}>
                  <option value="standard">📦 สินค้าทั่วไป</option>
                  <option value="bundle">🎁 จัดชุดเซ็ต / Combo</option>
                </select>
              </div>
            )}
            {/* Name */}
            <div className={`space-y-1 ${editingProduct ? "col-span-2" : "col-span-1 sm:col-span-2"}`}>
              <label className="text-[10px] font-semibold text-slate-500">ชื่อสินค้า *</label>
              <input required type="text" className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-indigo-500/20 focus:outline-none" placeholder="ชื่อสินค้า" value={newProduct.name} onChange={(e) => setNewProduct({ ...newProduct, name: e.target.value })} />
            </div>
            {/* SKU */}
            <div className="space-y-1">
              <label className="text-[10px] font-semibold text-slate-500">SKU * {!editingProduct && skuExists && <span className="text-rose-500">(ซ้ำ!)</span>}</label>
              <input required type="text" disabled={!!editingProduct} className={`w-full px-3 py-2 rounded-xl border text-xs focus:ring-2 focus:outline-none transition-all ${skuExists ? "border-rose-400 focus:ring-rose-500/20" : "border-slate-200 focus:ring-indigo-500/20"} ${editingProduct ? "bg-slate-50 cursor-not-allowed" : ""}`} placeholder="SKU-001" value={newProduct.sku} onChange={(e) => setNewProduct({ ...newProduct, sku: e.target.value })} />
            </div>
            {/* Barcode */}
            <div className="space-y-1">
              <label className="text-[10px] font-semibold text-slate-500">บาร์โค้ด</label>
              <div className="flex gap-1">
                <input type="text" className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-indigo-500/20 focus:outline-none" placeholder="Auto-generate" value={newProduct.barcode} onChange={(e) => setNewProduct({ ...newProduct, barcode: e.target.value })} />
                <button
                  type="button"
                  onClick={() => {
                    setScannerTarget("product_barcode");
                    setShowScanner(true);
                  }}
                  className="px-2.5 rounded-xl border border-slate-200 hover:bg-slate-100 text-slate-500 flex items-center justify-center transition-colors cursor-pointer active:scale-95"
                  title="สแกนด้วยกล้อง"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6.827 6.175A2.31 2.31 0 015.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 00-1.134-.175 2.31 2.31 0 01-1.64-1.055l-.822-1.316a2.192 2.192 0 00-1.736-1.039 48.774 48.774 0 00-5.232 0 2.192 2.192 0 00-1.736 1.039l-.821 1.316z" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 12.75a4.5 4.5 0 11-9 0 4.5 4.5 0 019 0zM18.75 10.5h.008v.008h-.008V10.5z" />
                  </svg>
                </button>
              </div>
            </div>
            {/* Category */}
            <div className="space-y-1">
              <label className="text-[10px] font-semibold text-slate-500">หมวดหมู่</label>
              <select className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-indigo-500/20 focus:outline-none bg-white" value={newProduct.categoryId ?? ""} onChange={(e) => setNewProduct({ ...newProduct, categoryId: e.target.value || null })}>
                <option value="">ไม่ระบุ</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>{c.parentId ? `└ ${c.name}` : c.name}</option>
                ))}
              </select>
            </div>
            {/* Unit */}
            <div className="space-y-1">
              <label className="text-[10px] font-semibold text-slate-500">หน่วยนับ</label>
              <input type="text" className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-indigo-500/20 focus:outline-none" placeholder="ชิ้น" value={newProduct.unit} onChange={(e) => setNewProduct({ ...newProduct, unit: e.target.value })} />
            </div>
            {/* Unit Price */}
            <div className="space-y-1">
              <label className="text-[10px] font-semibold text-slate-500">ราคาขาย (฿)</label>
              <input type="number" min="0" className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-indigo-500/20 focus:outline-none" value={newProduct.unitPrice} onChange={(e) => setNewProduct({ ...newProduct, unitPrice: Number(e.target.value) })} />
            </div>
            {/* Cost Price (Admin only) */}
            {isAdmin && (
              <div className="space-y-1">
                <label className="text-[10px] font-semibold text-slate-500">ราคาทุน (฿) <span className="text-indigo-400">Admin</span></label>
                <input type="number" min="0" className="w-full px-3 py-2 rounded-xl border border-indigo-100 bg-indigo-50/30 text-xs focus:ring-2 focus:ring-indigo-500/20 focus:outline-none" value={newProduct.costPrice} onChange={(e) => setNewProduct({ ...newProduct, costPrice: Number(e.target.value) })} />
              </div>
            )}
            {/* Stock */}
            {!editingProduct && (
              <div className="space-y-1">
                <label className="text-[10px] font-semibold text-slate-500">สต็อกเริ่มต้น</label>
                <input type="number" min="0" className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-indigo-500/20 focus:outline-none" value={newProduct.stockQty} onChange={(e) => setNewProduct({ ...newProduct, stockQty: Number(e.target.value) })} />
              </div>
            )}
            {/* Min Stock */}
            <div className="space-y-1">
              <label className="text-[10px] font-semibold text-slate-500">สต็อกขั้นต่ำ</label>
              <input type="number" min="0" className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-indigo-500/20 focus:outline-none" value={newProduct.lowStockThreshold} onChange={(e) => setNewProduct({ ...newProduct, lowStockThreshold: Number(e.target.value) })} />
            </div>
            {/* Notes */}
            <div className="space-y-1 col-span-2 md:col-span-2">
              <label className="text-[10px] font-semibold text-slate-500">หมายเหตุ</label>
              <input type="text" className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-indigo-500/20 focus:outline-none" placeholder="หมายเหตุ/คำอธิบายเพิ่มเติม" value={newProduct.notes} onChange={(e) => setNewProduct({ ...newProduct, notes: e.target.value })} />
            </div>
          </div>
          <div className="flex justify-end gap-3">
            <button type="button" onClick={() => { setShowAddForm(false); setEditingProduct(null); }} className="py-2 px-4 rounded-xl border border-slate-200 text-xs font-semibold text-slate-500 hover:bg-slate-50 transition-all">ยกเลิก</button>
            <button type="submit" disabled={isSavingProduct || skuExists} className="py-2 px-5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs shadow-sm transition-all disabled:opacity-50">
              {isSavingProduct ? "กำลังบันทึก..." : editingProduct ? "บันทึกการแก้ไข" : "บันทึกสินค้า"}
            </button>
          </div>
        </form>
      )}

      {/* Products Table */}
      <div className="rounded-3xl border border-slate-200 bg-white overflow-hidden shadow-sm">
        {loading ? (
          <div className="p-16 flex flex-col items-center justify-center gap-3">
            <svg className="animate-spin h-8 w-8 text-indigo-600" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
            <p className="text-xs font-semibold text-slate-400">กำลังดึงรายการสินค้า...</p>
          </div>
        ) : (
          <>
            {/* Desktop Table */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full border-collapse text-left">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50/70 text-slate-500 text-[10px] font-bold uppercase tracking-wider">
                    <th onClick={() => handleSort("sku")} className="px-5 py-4 cursor-pointer hover:bg-slate-100 select-none">
                      SKU / บาร์โค้ด <span className="font-sans ml-1 text-slate-400">{getSortIcon("sku")}</span>
                    </th>
                    <th onClick={() => handleSort("name")} className="px-5 py-4 cursor-pointer hover:bg-slate-100 select-none">
                      ชื่อสินค้า <span className="font-sans ml-1 text-slate-400">{getSortIcon("name")}</span>
                    </th>
                    <th className="px-5 py-4">หมวดหมู่</th>
                    <th onClick={() => handleSort("unitPrice")} className="px-5 py-4 cursor-pointer hover:bg-slate-100 select-none text-right">
                      ราคาขาย <span className="font-sans ml-1 text-slate-400">{getSortIcon("unitPrice")}</span>
                    </th>
                    {isAdmin && (
                      <th onClick={() => handleSort("costPrice")} className="px-5 py-4 cursor-pointer hover:bg-slate-100 select-none text-right">
                        ราคาทุน <span className="font-sans ml-1 text-slate-400">{getSortIcon("costPrice")}</span>
                      </th>
                    )}
                    <th className="px-5 py-4 text-center">สถานะ</th>
                    <th onClick={() => handleSort("stockQty")} className="px-5 py-4 cursor-pointer hover:bg-slate-100 select-none text-center">
                      สต็อก / ปรับ <span className="font-sans ml-1 text-slate-400">{getSortIcon("stockQty")}</span>
                    </th>
                    <th className="px-5 py-4 text-center">จัดการ</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700 text-sm">
                  {paginatedProducts.length === 0 ? (
                    <tr>
                      <td colSpan={isAdmin ? 8 : 7} className="px-6 py-12 text-center text-slate-400 text-xs">ไม่พบรายการสินค้า</td>
                    </tr>
                  ) : (
                    paginatedProducts.map((p) => {
                      const isLow = p.stockQty <= p.lowStockThreshold;
                      const st = STATUS_LABELS[p.status] ?? STATUS_LABELS.active;
                      return (
                        <tr key={p.id} className={`transition-colors ${isLow ? "bg-rose-50/30" : "hover:bg-slate-50/40"}`}>
                          <td className="px-5 py-4">
                            <p className="font-mono text-xs font-semibold text-slate-600">{p.sku}</p>
                            <p className="font-mono text-[10px] text-slate-400">{p.barcode}</p>
                          </td>
                          <td className="px-5 py-4">
                            <div className="flex items-center gap-1.5">
                              <p className="font-semibold text-slate-800">{p.name}</p>
                              {p.productType === "bundle" && (
                                <span className="inline-flex items-center rounded-md bg-purple-50 px-1.5 py-0.5 text-[9px] font-bold text-purple-700 ring-1 ring-inset ring-purple-700/10">
                                  Combo Set
                                </span>
                              )}
                            </div>
                            {p.notes && <p className="text-[10px] text-slate-400 truncate max-w-[160px]">{p.notes}</p>}
                          </td>
                          <td className="px-5 py-4">
                            {p.categoryName ? (
                              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-indigo-50 text-indigo-600">
                                {p.categoryName}
                              </span>
                            ) : (
                              <span className="text-slate-300 text-xs">—</span>
                            )}
                          </td>
                          <td className="px-5 py-4 text-right font-semibold">฿{p.unitPrice.toLocaleString()}</td>
                          {isAdmin && (
                            <td className="px-5 py-4 text-right text-xs font-mono text-indigo-600">
                              ฿{p.costPrice.toLocaleString()}
                            </td>
                          )}
                          <td className="px-5 py-4 text-center">
                            <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold ring-1 ring-inset ${st.color}`}>{st.label}</span>
                          </td>
                          <td className="px-5 py-4">
                            <div className="flex flex-col items-center gap-1.5">
                              <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold ${isLow ? "bg-rose-50 text-rose-700 ring-1 ring-rose-600/10 animate-pulse" : "bg-slate-50 text-slate-700 ring-1 ring-slate-600/10"}`}>
                                <span className={`h-1.5 w-1.5 rounded-full ${isLow ? "bg-rose-500" : "bg-emerald-500"}`}></span>
                                {p.stockQty} {p.unit}
                              </span>
                              <div className="flex items-center gap-1">
                                <button onClick={() => handleUpdateStock(p.id, -1)} className="w-5 h-5 flex items-center justify-center rounded bg-slate-100 hover:bg-slate-200 text-slate-600 text-[10px] transition-all font-bold">-</button>
                                <button onClick={() => handleUpdateStock(p.id, 1)} className="w-5 h-5 flex items-center justify-center rounded bg-indigo-50 hover:bg-indigo-100 text-indigo-600 text-[10px] transition-all font-bold">+</button>
                              </div>
                            </div>
                          </td>
                          <td className="px-5 py-4">
                            <div className="flex items-center justify-center gap-1.5">
                              {/* Edit */}
                              <button onClick={() => openEditModal(p)} className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-indigo-50 text-slate-400 hover:text-indigo-600 transition-all shadow-sm cursor-pointer" title="แก้ไข">
                                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                                </svg>
                              </button>
                              {/* Variants Manager */}
                              {p.productType === "standard" && (
                                <button onClick={() => { setSelectedProductForVariants(p); void loadVariants(p.id); }} className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-violet-50 text-slate-400 hover:text-violet-600 transition-all shadow-sm cursor-pointer" title="จัดการตัวเลือกย่อย">
                                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
                                  </svg>
                                </button>
                              )}
                              {/* Bundle Components */}
                              {p.productType === "bundle" && (
                                <button onClick={() => { setSelectedProductForBundle(p); void loadBundleComponents(p.id); }} className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-cyan-50 text-slate-400 hover:text-cyan-600 transition-all shadow-sm cursor-pointer" title="จัดชุดสินค้า">
                                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                                  </svg>
                                </button>
                              )}
                              {/* Barcode */}
                              <button onClick={() => { setSelected(p); setOpenBarcode(true); }} className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-400 hover:text-slate-700 transition-all shadow-sm" title="บาร์โค้ด">
                                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
                                </svg>
                              </button>
                              {/* History */}
                              <button onClick={() => openHistoryModal(p)} className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-amber-50 text-slate-400 hover:text-amber-600 transition-all shadow-sm" title="ประวัติการแก้ไข">
                                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                              </button>
                              {/* Delete */}
                              <button onClick={() => handleDeleteProduct(p)} className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-rose-50 text-slate-400 hover:text-rose-600 transition-all shadow-sm" title="ปิดสินค้า">
                                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
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
              {paginatedProducts.map((p) => {
                const isLow = p.stockQty <= p.lowStockThreshold;
                const st = STATUS_LABELS[p.status] ?? STATUS_LABELS.active;
                return (
                  <div key={p.id} className={`rounded-2xl bg-white border p-4 shadow-sm space-y-3 ${isLow ? "border-rose-100" : "border-slate-100"}`}>
                    <div className="flex items-start justify-between">
                      <div>
                        <h4 className="font-bold text-slate-800 text-sm">{p.name}</h4>
                        <p className="text-[10px] font-mono text-slate-400">SKU: {p.sku}</p>
                      </div>
                      <div className="text-right space-y-1">
                        <p className="text-sm font-bold text-slate-800">฿{p.unitPrice}</p>
                        <span className={`inline-flex items-center rounded-full px-1.5 py-0.5 text-[9px] font-semibold ring-1 ring-inset ${st.color}`}>{st.label}</span>
                      </div>
                    </div>
                    <div className="flex items-center justify-between border-t border-b border-slate-100/70 py-2">
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${isLow ? "text-rose-600 bg-rose-50 animate-pulse" : "text-emerald-600 bg-emerald-50"}`}>
                        {isLow ? "⚠️ ต่ำกว่าเกณฑ์" : "✅ ปกติ"}
                      </span>
                      <span className="text-sm font-bold text-slate-800">{p.stockQty} {p.unit}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <button onClick={() => openEditModal(p)} className="flex-1 py-2 rounded-xl border border-slate-200 text-[10px] font-semibold text-slate-600 hover:bg-slate-50">แก้ไข</button>
                      <button onClick={() => { setSelected(p); setOpenBarcode(true); }} className="flex-1 py-2 rounded-xl bg-indigo-50 text-indigo-700 text-[10px] font-semibold">บาร์โค้ด</button>
                      <button onClick={() => handleUpdateStock(p.id, -1)} className="w-9 h-9 flex items-center justify-center rounded-xl border border-slate-200 font-bold text-slate-600 hover:bg-slate-100">-</button>
                      <button onClick={() => handleUpdateStock(p.id, 1)} className="w-9 h-9 flex items-center justify-center rounded-xl bg-indigo-600 text-white font-bold shadow-sm">+</button>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Pagination Controls */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between border-t border-slate-100 px-6 py-4 bg-slate-50/50">
                <p className="text-xs text-slate-500 font-medium">
                  แสดง <strong className="text-slate-700">{(currentPage - 1) * itemsPerPage + 1}</strong> ถึง{" "}
                  <strong className="text-slate-700">
                    {Math.min(currentPage * itemsPerPage, processedProducts.length)}
                  </strong>{" "}
                  จาก <strong className="text-slate-700">{processedProducts.length}</strong> รายการ
                </p>
                <div className="flex items-center gap-2">
                  <button
                    disabled={currentPage === 1}
                    onClick={() => setCurrentPage(currentPage - 1)}
                    className="py-1.5 px-3 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 text-xs font-semibold shadow-sm transition-all disabled:opacity-50 flex items-center gap-1"
                  >
                    ก่อนหน้า
                  </button>
                  <span className="text-xs text-slate-500 font-bold px-2">
                    หน้า {currentPage} / {totalPages}
                  </span>
                  <button
                    disabled={currentPage === totalPages}
                    onClick={() => setCurrentPage(currentPage + 1)}
                    className="py-1.5 px-3 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 text-xs font-semibold shadow-sm transition-all disabled:opacity-50 flex items-center gap-1"
                  >
                    ถัดไป
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Barcode Modal */}
      {openBarcode && selected && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div onClick={() => setOpenBarcode(false)} className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" />
          <div className="relative w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl border border-slate-100 flex flex-col gap-5 animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base font-bold text-slate-800">แท็กป้ายบาร์โค้ด</h3>
              <button onClick={() => setOpenBarcode(false)} className="text-slate-400 hover:text-slate-600 rounded-lg p-1 hover:bg-slate-100 transition-colors">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="flex flex-col items-center border border-slate-200 rounded-2xl p-4 bg-slate-50">
              <div className="bg-white border border-slate-300 rounded-lg p-3 text-center shadow-sm w-[260px] flex flex-col items-center">
                <p className="text-xs font-bold text-slate-800 mb-1 truncate w-full">{selected.name}</p>
                <svg ref={barcodeSvgRef} className="max-w-full my-1.5" />
                <p className="text-[10px] font-mono text-slate-500">SKU: {selected.sku}</p>
              </div>
            </div>
            <div style={{ position: "absolute", left: -9999, top: -9999 }}>
              <div ref={printRef} style={{ width: "80mm", height: "30mm", padding: "4mm 6mm", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", background: "white" }}>
                <p style={{ margin: "0 0 1mm 0", fontSize: "11px", fontWeight: "bold", width: "100%", textAlign: "center" }}>{selected.name}</p>
                <svg ref={barcodeSvgRef} style={{ width: "100%", height: "16mm" }} />
                <p style={{ margin: "1mm 0 0 0", fontSize: "9px", fontFamily: "monospace", width: "100%", textAlign: "center" }}>SKU: {selected.sku}</p>
              </div>
            </div>
            <div className="flex items-center justify-end gap-3 border-t border-slate-100 pt-3">
              <button onClick={() => setOpenBarcode(false)} className="py-2 px-4 rounded-xl border border-slate-200 text-xs font-semibold text-slate-500 hover:bg-slate-50">ปิด</button>
              <button onClick={printLabel} className="py-2 px-5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-md flex items-center gap-1.5">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                </svg>
                สั่งพิมพ์
              </button>
            </div>
          </div>
        </div>
      )}

      {/* History Modal */}
      {historyProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div onClick={() => setHistoryProduct(null)} className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" />
          <div className="relative w-full max-w-lg rounded-3xl bg-white p-6 shadow-2xl border border-slate-100 flex flex-col gap-4 max-h-[80vh] animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base font-bold text-slate-800">ประวัติการแก้ไข: {historyProduct.name}</h3>
              <button onClick={() => setHistoryProduct(null)} className="text-slate-400 hover:text-slate-600 rounded-lg p-1 hover:bg-slate-100">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="overflow-y-auto flex-1 space-y-2 pr-1">
              {historyLoading ? (
                <p className="text-center py-8 text-slate-400 text-xs">กำลังโหลด...</p>
              ) : history.length === 0 ? (
                <p className="text-center py-8 text-slate-400 text-xs">ยังไม่มีประวัติการแก้ไข</p>
              ) : (
                history.map((log) => (
                  <div key={log.id} className="bg-slate-50 rounded-xl p-3 border border-slate-100 text-xs space-y-1">
                    <div className="flex justify-between items-center">
                      <span className="font-bold text-slate-700">{fieldLabel[log.fieldName ?? ""] ?? log.fieldName ?? log.action}</span>
                      <span className="text-slate-400 text-[10px]">{log.createdAt}</span>
                    </div>
                    {log.valueBefore && log.valueAfter && (
                      <div className="flex items-center gap-2 text-[10px]">
                        <span className="bg-rose-50 text-rose-600 px-2 py-0.5 rounded line-through">{log.valueBefore}</span>
                        <svg className="w-3.5 h-3.5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" /></svg>
                        <span className="bg-emerald-50 text-emerald-600 px-2 py-0.5 rounded font-semibold">{log.valueAfter}</span>
                      </div>
                    )}
                    <p className="text-slate-400">โดย: {log.changedBy}</p>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* Import Excel Modal */}
      {showImportModal && (
        <ImportExcelModal
          onClose={() => setShowImportModal(false)}
          onSuccess={loadProducts}
        />
      )}

      {/* Variants Manager Modal */}
      {selectedProductForVariants && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div onClick={() => setSelectedProductForVariants(null)} className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" />
          <div className="relative w-full max-w-2xl rounded-3xl bg-white p-6 shadow-2xl border border-slate-100 flex flex-col gap-4 max-h-[85vh] animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-base font-bold text-slate-800">จัดการตัวเลือกสินค้า: {selectedProductForVariants.name}</h3>
                <p className="text-slate-400 text-xxs mt-0.5">สินค้าแม่ SKU: {selectedProductForVariants.sku} | กำหนดขนาด, สี หรือตัวย่อยอื่นๆ</p>
              </div>
              <button onClick={() => setSelectedProductForVariants(null)} className="text-slate-400 hover:text-slate-600 rounded-lg p-1 hover:bg-slate-100">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Add/Edit Variant Form */}
            {showVariantForm ? (
              <form onSubmit={handleSaveVariant} className="bg-slate-50 border border-slate-200 rounded-2xl p-4 text-xs space-y-3 animate-in slide-in-from-top duration-200">
                <h4 className="font-bold text-slate-700">{editingVariantId ? "แก้ไขตัวเลือก" : "เพิ่มตัวเลือกย่อยใหม่"}</h4>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="text-[10px] font-semibold text-slate-500">ชื่อตัวเลือก (เช่น สีแดง, XL) *</label>
                    <input required type="text" className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/20 bg-white" placeholder="แดง / M" value={variantForm.name} onChange={(e) => setVariantForm({ ...variantForm, name: e.target.value })} />
                  </div>
                  <div>
                    <label className="text-[10px] font-semibold text-slate-500">SKU ตัวเลือก *</label>
                    <input required type="text" className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/20 bg-white" placeholder="SKU-RED-M" value={variantForm.sku} onChange={(e) => setVariantForm({ ...variantForm, sku: e.target.value })} />
                  </div>
                  <div>
                    <label className="text-[10px] font-semibold text-slate-500">บาร์โค้ด</label>
                    <div className="flex gap-1">
                      <input type="text" className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/20 bg-white" placeholder="เว้นว่างได้" value={variantForm.barcode} onChange={(e) => setVariantForm({ ...variantForm, barcode: e.target.value })} />
                      <button
                        type="button"
                        onClick={() => {
                          setScannerTarget("variant_barcode");
                          setShowScanner(true);
                        }}
                        className="px-2 rounded-xl border border-slate-200 hover:bg-slate-100 text-slate-500 flex items-center justify-center transition-colors cursor-pointer active:scale-95 bg-white"
                        title="สแกนด้วยกล้อง"
                      >
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M6.827 6.175A2.31 2.31 0 015.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 00-1.134-.175 2.31 2.31 0 01-1.64-1.055l-.822-1.316a2.192 2.192 0 00-1.736-1.039 48.774 48.774 0 00-5.232 0 2.192 2.192 0 00-1.736 1.039l-.821 1.316z" />
                          <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 12.75a4.5 4.5 0 11-9 0 4.5 4.5 0 019 0zM18.75 10.5h.008v.008h-.008V10.5z" />
                        </svg>
                      </button>
                    </div>
                  </div>
                  <div>
                    <label className="text-[10px] font-semibold text-slate-500">ราคาขาย (฿)</label>
                    <input required type="number" min="0" className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/20 bg-white" value={variantForm.unitPrice} onChange={(e) => setVariantForm({ ...variantForm, unitPrice: Number(e.target.value) })} />
                  </div>
                  {isAdmin && (
                    <div>
                      <label className="text-[10px] font-semibold text-slate-500">ราคาทุน (฿)</label>
                      <input type="number" min="0" className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/20 bg-white" value={variantForm.costPrice} onChange={(e) => setVariantForm({ ...variantForm, costPrice: Number(e.target.value) })} />
                    </div>
                  )}
                  <div>
                    <label className="text-[10px] font-semibold text-slate-500">สต็อกเริ่มต้น</label>
                    <input required type="number" min="0" className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/20 bg-white" value={variantForm.stockQty} onChange={(e) => setVariantForm({ ...variantForm, stockQty: Number(e.target.value) })} />
                  </div>
                </div>
                <div className="flex justify-end gap-2">
                  <button type="button" onClick={() => setShowVariantForm(false)} className="py-1.5 px-3 rounded-lg border border-slate-200 text-[10px] font-semibold text-slate-500 hover:bg-white transition-all">ยกเลิก</button>
                  <button type="submit" className="py-1.5 px-4 rounded-lg bg-indigo-600 text-white font-semibold text-[10px] shadow-sm hover:bg-indigo-700 cursor-pointer">บันทึกตัวเลือก</button>
                </div>
              </form>
            ) : (
              <button
                type="button"
                onClick={() => {
                  setEditingVariantId(null);
                  setVariantForm({
                    name: "",
                    sku: `${selectedProductForVariants.sku}-VAR`,
                    barcode: "",
                    costPrice: selectedProductForVariants.costPrice,
                    unitPrice: selectedProductForVariants.unitPrice,
                    stockQty: 0,
                    lowStockThreshold: 3
                  });
                  setShowVariantForm(true);
                }}
                className="py-2 px-4 rounded-xl border border-dashed border-indigo-200 bg-indigo-50/20 hover:bg-indigo-50 text-indigo-600 text-xs font-semibold transition-all flex items-center justify-center gap-1 cursor-pointer"
              >
                + เพิ่มตัวเลือกใหม่
              </button>
            )}

            {/* Variants List Table */}
            <div className="flex-grow overflow-y-auto border border-slate-100 rounded-2xl">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-50 text-slate-500 font-bold border-b border-slate-100">
                    <th className="px-4 py-2.5">ตัวเลือก</th>
                    <th className="px-4 py-2.5">SKU / บาร์โค้ด</th>
                    <th className="px-4 py-2.5 text-right">ราคาขาย</th>
                    {isAdmin && <th className="px-4 py-2.5 text-right">ราคาทุน</th>}
                    <th className="px-4 py-2.5 text-center">คงคลัง</th>
                    <th className="px-4 py-2.5 text-center">จัดการ</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white text-slate-700">
                  {variantsList.length === 0 ? (
                    <tr>
                      <td colSpan={isAdmin ? 6 : 5} className="px-4 py-8 text-center text-slate-400 text-xxs">ยังไม่มีตัวเลือกย่อยของสินค้านี้</td>
                    </tr>
                  ) : (
                    variantsList.map((v) => (
                      <tr key={v.id} className="hover:bg-slate-50/30 font-sans">
                        <td className="px-4 py-2.5 font-bold text-slate-800">{v.name}</td>
                        <td className="px-4 py-2.5 font-mono text-[10px]">
                          <div>{v.sku}</div>
                          <div className="text-slate-400">{v.barcode || "—"}</div>
                        </td>
                        <td className="px-4 py-2.5 text-right font-semibold">฿{v.unitPrice}</td>
                        {isAdmin && <td className="px-4 py-2.5 text-right text-indigo-600 font-mono text-[10px]">฿{v.costPrice}</td>}
                        <td className="px-4 py-2.5 text-center font-bold">{v.stockQty}</td>
                        <td className="px-4 py-2.5">
                          <div className="flex items-center justify-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => {
                                setEditingVariantId(v.id);
                                setVariantForm({
                                  name: v.name,
                                  sku: v.sku,
                                  barcode: v.barcode || "",
                                  costPrice: v.costPrice,
                                  unitPrice: v.unitPrice,
                                  stockQty: v.stockQty,
                                  lowStockThreshold: v.lowStockThreshold
                                });
                                setShowVariantForm(true);
                              }}
                              className="p-1 rounded bg-slate-50 border border-slate-200 text-slate-400 hover:text-indigo-600 cursor-pointer"
                              title="แก้ไข"
                            >
                              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteVariant(v.id)}
                              className="p-1 rounded bg-slate-50 border border-slate-200 text-slate-400 hover:text-rose-600 cursor-pointer"
                              title="ลบ"
                            >
                              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            <div className="flex items-center justify-end pt-3 border-t border-slate-100">
              <button onClick={() => setSelectedProductForVariants(null)} className="py-2 px-5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-all cursor-pointer">เสร็จสิ้น</button>
            </div>
          </div>
        </div>
      )}

      {/* Bundle Components Modal */}
      {selectedProductForBundle && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div onClick={() => setSelectedProductForBundle(null)} className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" />
          <div className="relative w-full max-w-2xl rounded-3xl bg-white p-6 shadow-2xl border border-slate-100 flex flex-col gap-4 max-h-[85vh] animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-base font-bold text-slate-800">จัดส่วนประกอบของเซ็ต: {selectedProductForBundle.name}</h3>
                <p className="text-slate-400 text-xxs mt-0.5">สต็อกรวมของเซ็ตนี้จะอิงจากชิ้นส่วนเดี่ยวที่คงเหลือต่ำสุดโดยอัตโนมัติ</p>
              </div>
              <button onClick={() => setSelectedProductForBundle(null)} className="text-slate-400 hover:text-slate-600 rounded-lg p-1 hover:bg-slate-100">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Add Component Form */}
            <form onSubmit={handleAddBundleComponent} className="bg-slate-50 border border-slate-200 rounded-2xl p-4 text-xs flex flex-col sm:flex-row gap-3 items-end">
              <div className="flex-1 space-y-1">
                <label className="text-[10px] font-semibold text-slate-500">เลือกสินค้าเข้ามาในเซ็ต</label>
                <select
                  required
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/20 bg-white"
                  value={addComponentId}
                  onChange={(e) => setAddComponentId(e.target.value)}
                >
                  <option value="">เลือกสินค้าเดี่ยว...</option>
                  {products
                    .filter((p) => p.productType === "standard" && p.id !== selectedProductForBundle.id)
                    .map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name} ({p.sku}) — คงคลัง {p.stockQty} {p.unit}
                      </option>
                    ))}
                </select>
              </div>
              <div className="w-24 space-y-1">
                <label className="text-[10px] font-semibold text-slate-500">จำนวนที่ใช้ *</label>
                <input
                  required
                  type="number"
                  min="1"
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/20 bg-white text-center"
                  value={addComponentQty}
                  onChange={(e) => setAddComponentQty(Math.max(1, Number(e.target.value)))}
                />
              </div>
              <button type="submit" className="py-2 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs transition-all shadow-sm cursor-pointer flex-shrink-0">
                + เพิ่มเข้าเซ็ต
              </button>
            </form>

            {/* Component List */}
            <div className="flex-grow overflow-y-auto border border-slate-100 rounded-2xl">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-50 text-slate-500 font-bold border-b border-slate-100">
                    <th className="px-4 py-2.5">ชื่อสินค้า</th>
                    <th className="px-4 py-2.5">SKU ชิ้นส่วน</th>
                    <th className="px-4 py-2.5 text-center">ต้องใช้ (ต่อ 1 เซ็ต)</th>
                    <th className="px-4 py-2.5 text-center">คลังเดี่ยวที่เหลือ</th>
                    <th className="px-4 py-2.5 text-center">คำนวณเซ็ตได้สูงสุด</th>
                    <th className="px-4 py-2.5 text-center">ลบ</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white text-slate-700">
                  {bundleComponents.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-4 py-8 text-center text-slate-400 text-xxs">ยังไม่มีสินค้าองค์ประกอบมัดรวมในเซ็ตนี้</td>
                    </tr>
                  ) : (
                    bundleComponents.map((bc) => {
                      const possibleSets = Math.floor(bc.stockQty / bc.qtyRequired);
                      return (
                        <tr key={bc.componentId} className="hover:bg-slate-50/30">
                          <td className="px-4 py-2.5 font-semibold text-slate-800">{bc.name}</td>
                          <td className="px-4 py-2.5 font-mono text-[10px]">{bc.sku}</td>
                          <td className="px-4 py-2.5 text-center font-bold text-slate-900">{bc.qtyRequired}</td>
                          <td className="px-4 py-2.5 text-center">{bc.stockQty}</td>
                          <td className="px-4 py-2.5 text-center font-bold text-indigo-600">{possibleSets} เซ็ต</td>
                          <td className="px-4 py-2.5 text-center">
                            <button
                              type="button"
                              onClick={() => handleRemoveBundleComponent(bc.componentId)}
                              className="p-1 rounded bg-slate-50 border border-slate-200 text-slate-400 hover:text-rose-600 cursor-pointer"
                            >
                              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            <div className="flex items-center justify-end pt-3 border-t border-slate-100">
              <button onClick={() => setSelectedProductForBundle(null)} className="py-2 px-5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-all cursor-pointer">ปิดหน้าต่าง</button>
            </div>
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
