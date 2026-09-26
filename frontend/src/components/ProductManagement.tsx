"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
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
import MeeDataGrid from "@/components/ui/MeeDataGrid";
import StatusBadge from "@/components/ui/StatusBadge";
import ConfirmDialog from "@/components/ui/ConfirmDialog";
import { useNotification } from "@/components/ui/NotificationProvider";
import { GridColDef, GridRenderCellParams } from "@mui/x-data-grid";
import { Box, Tooltip, IconButton } from "@mui/material";
import EditOutlinedIcon from "@mui/icons-material/EditOutlined";
import DeleteOutlineOutlinedIcon from "@mui/icons-material/DeleteOutlineOutlined";
import QrCode2OutlinedIcon from "@mui/icons-material/QrCode2Outlined";
import HistoryOutlinedIcon from "@mui/icons-material/HistoryOutlined";
import AccountTreeOutlinedIcon from "@mui/icons-material/AccountTreeOutlined";
import Inventory2OutlinedIcon from "@mui/icons-material/Inventory2Outlined";

const STATUS_LABELS: Record<string, { label: string; color: string; dot: string }> = {
  active: { label: "ใช้งาน", color: "text-emerald-600", dot: "bg-emerald-500" },
  inactive: { label: "ปิดใช้งาน", color: "text-slate-400", dot: "bg-slate-400" },
  discontinued: { label: "ยกเลิก", color: "text-rose-600", dot: "bg-rose-500" },
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
      const row: Record<string, string | number> = {
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
  const printBarcodeSvgRef = useRef<SVGSVGElement>(null);
  const printRef = useRef<HTMLDivElement>(null);

  const printLabel = useReactToPrint({
    contentRef: printRef,
    documentTitle: selected?.sku ? `barcode-${selected.sku}` : "barcode-label",
  });

  const loadProducts = useCallback(async () => {
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
  }, [searchTerm, categoryFilter, statusFilter]);

  const loadCategories = useCallback(async () => {
    const cats = await getCategoriesFlat();
    setTimeout(() => {
      setCategories(cats);
    }, 0);
  }, []);

  useEffect(() => {
    void loadCategories();
  }, [loadCategories]);

  useEffect(() => {
    const timer = setTimeout(() => { void loadProducts(); }, 300);
    return () => clearTimeout(timer);
  }, [loadProducts]);

  // Render Barcode in Modal
  useEffect(() => {
    if (!selected || !openBarcode) return;
    try {
      if (barcodeSvgRef.current) {
        JsBarcode(barcodeSvgRef.current, selected.barcode || selected.sku, {
          format: "CODE128", displayValue: true, width: 2, height: 64,
          margin: 8, fontSize: 14, lineColor: "#0f172a",
        });
      }
      if (printBarcodeSvgRef.current) {
        JsBarcode(printBarcodeSvgRef.current, selected.barcode || selected.sku, {
          format: "CODE128", displayValue: true, width: 2, height: 64,
          margin: 8, fontSize: 14, lineColor: "#0f172a",
        });
      }
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
  }, [scannerValue, adjustQty, products, loadProducts]);

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
    if (!newProduct.sku.trim()) {
      const timer = setTimeout(() => {
        setSkuExists(false);
      }, 0);
      return () => clearTimeout(timer);
    }
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

  const { notifySuccess, notifyError, notifyWarning } = useNotification();
  const [deleteTarget, setDeleteTarget] = useState<DBProduct | null>(null);

  const confirmDeleteProduct = async () => {
    if (!deleteTarget) return;
    try {
      const result = await deleteProduct(deleteTarget.id);
      if (result.success) {
        notifySuccess(`ปิดสินค้า "${deleteTarget.name}" เรียบร้อยแล้ว`);
        setDeleteTarget(null);
        void loadProducts();
      } else {
        notifyError(result.error || "ไม่สามารถปิดสินค้าได้");
      }
    } catch (err) {
      notifyError("เกิดข้อผิดพลาดในการปิดสินค้า");
    }
  };

  const openHistoryModal = async (p: DBProduct) => {
    setHistoryProduct(p);
    setHistoryLoading(true);
    const logs = await getProductHistory(p.id);
    setHistory(logs);
    setHistoryLoading(false);
  };

  // Filter products by additional criteria before passing to DataGrid
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

    return result;
  }, [products, stockLevelFilter, priceMin, priceMax]);

  const columns = useMemo<GridColDef<DBProduct>[]>(() => {
    const cols: GridColDef<DBProduct>[] = [
      {
        field: "sku",
        headerName: "SKU / บาร์โค้ด",
        minWidth: 160,
        flex: 1.1,
        renderCell: (params: GridRenderCellParams<DBProduct, string>) => (
          <div className="flex flex-col justify-center min-w-0 py-0.5">
            <span className="font-mono text-xs font-bold text-slate-800 tracking-tight leading-snug">
              {params.value || "-"}
            </span>
            {params.row.barcode ? (
              <div className="flex items-center gap-1.5 mt-0.5 text-slate-400">
                <svg className="w-3.5 h-3 text-slate-400 shrink-0" viewBox="0 0 24 16" fill="currentColor">
                  <rect x="0" y="0" width="2.5" height="16" />
                  <rect x="4" y="0" width="1.5" height="16" />
                  <rect x="7" y="0" width="3" height="16" />
                  <rect x="11.5" y="0" width="1.5" height="16" />
                  <rect x="14.5" y="0" width="2.5" height="16" />
                  <rect x="18.5" y="0" width="1.5" height="16" />
                  <rect x="21.5" y="0" width="2.5" height="16" />
                </svg>
                <span className="font-mono text-[11px] text-slate-500 leading-none">
                  {params.row.barcode}
                </span>
              </div>
            ) : (
              <span className="text-[10px] text-slate-300 leading-none mt-0.5 font-mono">—</span>
            )}
          </div>
        ),
      },
      {
        field: "name",
        headerName: "ชื่อสินค้า",
        minWidth: 260,
        flex: 2.2,
        renderCell: (params: GridRenderCellParams<DBProduct, string>) => (
          <div className="flex items-center gap-2.5 min-w-0 py-1 overflow-hidden">
            <div className="w-8 h-8 rounded-xl bg-slate-100 flex items-center justify-center text-slate-600 font-bold text-xs shrink-0 border border-slate-200/60 shadow-2xs">
              {params.row.productType === "bundle" ? "🎁" : "📦"}
            </div>
            <div className="flex flex-col justify-center min-w-0">
              <div className="flex items-center gap-1.5 min-w-0">
                <span className="font-semibold text-slate-900 text-xs truncate leading-normal" title={params.value}>
                  {params.value}
                </span>
                {params.row.productType === "bundle" && (
                  <span className="inline-flex items-center rounded-md bg-purple-50 px-1.5 py-0.5 text-[9px] font-bold text-purple-700 ring-1 ring-inset ring-purple-700/10 shrink-0">
                    Combo Set
                  </span>
                )}
              </div>
              {params.row.notes ? (
                <span className="text-[11px] text-slate-400 truncate leading-normal mt-0.5" title={params.row.notes}>
                  {params.row.notes}
                </span>
              ) : null}
            </div>
          </div>
        ),
      },
      {
        field: "categoryName",
        headerName: "หมวดหมู่",
        minWidth: 130,
        flex: 1,
        renderCell: (params: GridRenderCellParams<DBProduct, string>) => {
          const cat = categories.find((c) => c.name === params.value);
          const dotColor = cat?.color || "#6366f1";
          return params.value ? (
            <span
              className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium border"
              style={{
                backgroundColor: `${dotColor}12`,
                borderColor: `${dotColor}35`,
                color: dotColor,
              }}
            >
              <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: dotColor }} />
              <span className="truncate max-w-[95px]">{params.value}</span>
            </span>
          ) : (
            <span className="text-slate-300 text-xs">—</span>
          );
        },
      },
      {
        field: "unitPrice",
        headerName: "ราคาขาย",
        type: "number",
        minWidth: 100,
        headerAlign: "right",
        align: "right",
        renderCell: (params: GridRenderCellParams<DBProduct, number>) => (
          <div className="text-right w-full font-mono">
            <span className="text-slate-400 text-xs mr-0.5 font-normal">฿</span>
            <span className="font-bold text-slate-900 text-xs">
              {(params.value ?? 0).toLocaleString()}
            </span>
          </div>
        ),
      },
    ];

    if (isAdmin) {
      cols.push({
        field: "costPrice",
        headerName: "ราคาทุน",
        type: "number",
        minWidth: 100,
        headerAlign: "right",
        align: "right",
        renderCell: (params: GridRenderCellParams<DBProduct, number>) => (
          <div className="text-right w-full font-mono">
            <span className="text-slate-400 text-xs mr-0.5 font-normal">฿</span>
            <span className="text-xs text-slate-500 font-medium">
              {(params.value ?? 0).toLocaleString()}
            </span>
          </div>
        ),
      });
    }

    cols.push(
      {
        field: "status",
        headerName: "สถานะ",
        minWidth: 100,
        headerAlign: "center",
        align: "center",
        renderCell: (params: GridRenderCellParams<DBProduct, string>) => {
          const st = STATUS_LABELS[params.value || "active"] ?? STATUS_LABELS.active;
          const variantMap: Record<string, "success" | "default" | "error"> = {
            active: "success",
            inactive: "default",
            discontinued: "error",
          };
          return (
            <StatusBadge
              label={st.label}
              variant={variantMap[params.value || "active"] || "default"}
            />
          );
        },
      },
      {
        field: "stockQty",
        headerName: "คงเหลือ / ปรับสต็อก",
        minWidth: 155,
        headerAlign: "center",
        align: "center",
        renderCell: (params: GridRenderCellParams<DBProduct, number>) => {
          const p = params.row;
          const isLow = p.stockQty <= p.lowStockThreshold;
          const isOut = p.stockQty === 0;
          return (
            <div className="flex items-center justify-between gap-2 w-full max-w-[145px] mx-auto py-0.5">
              {/* Stock Quantity & Unit */}
              <div className="flex flex-col justify-center min-w-0 text-left">
                <div className="flex items-baseline gap-1">
                  <span
                    className={`font-mono text-sm font-bold leading-none ${
                      isOut
                        ? "text-rose-600"
                        : isLow
                        ? "text-amber-600"
                        : "text-slate-800"
                    }`}
                  >
                    {p.stockQty}
                  </span>
                  <span className="text-[11px] text-slate-400 font-medium leading-none">
                    {p.unit}
                  </span>
                </div>
                {isLow && (
                  <span className="text-[9.5px] font-semibold text-amber-600 leading-none mt-1">
                    {isOut ? "สินค้าหมด" : "สต็อกต่ำ"}
                  </span>
                )}
              </div>

              {/* Quick Increment/Decrement Buttons */}
              <div className="inline-flex items-center rounded-lg border border-slate-200 bg-white shadow-2xs shrink-0 overflow-hidden">
                <button
                  type="button"
                  onClick={() => handleUpdateStock(p.id, -1)}
                  disabled={p.stockQty <= 0}
                  className="w-6 h-6 flex items-center justify-center text-slate-500 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer border-r border-slate-100 disabled:opacity-25 disabled:cursor-not-allowed"
                  title="ลดสต็อก 1 ชิ้น"
                >
                  <span className="text-xs font-bold leading-none">−</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleUpdateStock(p.id, 1)}
                  className="w-6 h-6 flex items-center justify-center text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 transition-colors cursor-pointer"
                  title="เพิ่มสต็อก 1 ชิ้น"
                >
                  <span className="text-xs font-bold leading-none">+</span>
                </button>
              </div>
            </div>
          );
        },
      },
      {
        field: "actions",
        headerName: "จัดการ",
        sortable: false,
        filterable: false,
        minWidth: 175,
        headerAlign: "center",
        align: "center",
        renderCell: (params: GridRenderCellParams<DBProduct>) => {
          const p = params.row;
          return (
            <div className="flex items-center justify-center gap-1">
              <Tooltip title="แก้ไขข้อมูล">
                <button
                  type="button"
                  onClick={() => openEditModal(p)}
                  className="w-7 h-7 flex items-center justify-center rounded-lg border border-slate-200 bg-white hover:bg-indigo-50 hover:border-indigo-200 text-slate-500 hover:text-indigo-600 transition-all cursor-pointer shadow-2xs"
                >
                  <EditOutlinedIcon sx={{ fontSize: 14 }} />
                </button>
              </Tooltip>

              {p.productType === "standard" && (
                <Tooltip title="จัดการตัวเลือกย่อย">
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedProductForVariants(p);
                      void loadVariants(p.id);
                    }}
                    className="w-7 h-7 flex items-center justify-center rounded-lg border border-slate-200 bg-white hover:bg-purple-50 hover:border-purple-200 text-slate-500 hover:text-purple-600 transition-all cursor-pointer shadow-2xs"
                  >
                    <AccountTreeOutlinedIcon sx={{ fontSize: 14 }} />
                  </button>
                </Tooltip>
              )}

              {p.productType === "bundle" && (
                <Tooltip title="จัดชุดสินค้า Combo">
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedProductForBundle(p);
                      void loadBundleComponents(p.id);
                    }}
                    className="w-7 h-7 flex items-center justify-center rounded-lg border border-slate-200 bg-white hover:bg-cyan-50 hover:border-cyan-200 text-slate-500 hover:text-cyan-600 transition-all cursor-pointer shadow-2xs"
                  >
                    <Inventory2OutlinedIcon sx={{ fontSize: 14 }} />
                  </button>
                </Tooltip>
              )}

              <Tooltip title="พิมพ์บาร์โค้ด">
                <button
                  type="button"
                  onClick={() => {
                    setSelected(p);
                    setOpenBarcode(true);
                  }}
                  className="w-7 h-7 flex items-center justify-center rounded-lg border border-slate-200 bg-white hover:bg-slate-100 hover:border-slate-300 text-slate-500 hover:text-slate-800 transition-all cursor-pointer shadow-2xs"
                >
                  <QrCode2OutlinedIcon sx={{ fontSize: 14 }} />
                </button>
              </Tooltip>

              <Tooltip title="ประวัติการแก้ไข">
                <button
                  type="button"
                  onClick={() => openHistoryModal(p)}
                  className="w-7 h-7 flex items-center justify-center rounded-lg border border-slate-200 bg-white hover:bg-amber-50 hover:border-amber-200 text-slate-500 hover:text-amber-600 transition-all cursor-pointer shadow-2xs"
                >
                  <HistoryOutlinedIcon sx={{ fontSize: 14 }} />
                </button>
              </Tooltip>

              <Tooltip title="ลบสินค้า">
                <button
                  type="button"
                  onClick={() => setDeleteTarget(p)}
                  className="w-7 h-7 flex items-center justify-center rounded-lg border border-slate-200 bg-white hover:bg-rose-50 hover:border-rose-200 text-slate-400 hover:text-rose-600 transition-all cursor-pointer shadow-2xs"
                >
                  <DeleteOutlineOutlinedIcon sx={{ fontSize: 14 }} />
                </button>
              </Tooltip>
            </div>
          );
        },
      }
    );

    return cols;
  }, [isAdmin, categories]);

  const lowStockCount = useMemo(() => products.filter((p) => p.stockQty <= p.lowStockThreshold).length, [products]);

  const fieldLabel: Record<string, string> = {
    name: "ชื่อสินค้า",
    unit_price: "ราคาขาย",
    cost_price: "ราคาทุน",
    status: "สถานะ",
  };

  // History Columns
  const historyColumns = useMemo<GridColDef<DBProductAuditLog>[]>(
    () => [
      {
        field: "createdAt",
        headerName: "วัน-เวลา",
        minWidth: 140,
        renderCell: (params) => (
          <span className="text-xs text-slate-500 font-mono">{params.value}</span>
        ),
      },
      {
        field: "fieldName",
        headerName: "ฟิลด์ที่เปลี่ยน",
        minWidth: 120,
        renderCell: (params) => (
          <span className="font-bold text-xs text-slate-700">
            {fieldLabel[params.value ?? ""] ?? params.value ?? params.row.action}
          </span>
        ),
      },
      {
        field: "valueBefore",
        headerName: "ค่าเดิม -> ค่าใหม่",
        minWidth: 180,
        flex: 1,
        renderCell: (params) =>
          params.row.valueBefore && params.row.valueAfter ? (
            <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
              <span className="bg-rose-50 text-rose-600 px-2 py-0.5 rounded text-[11px] line-through">
                {params.row.valueBefore}
              </span>
              <span className="text-slate-400 text-xs">→</span>
              <span className="bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded text-[11px] font-bold">
                {params.row.valueAfter}
              </span>
            </Box>
          ) : (
            <span className="text-slate-400 text-xs">—</span>
          ),
      },
      {
        field: "changedBy",
        headerName: "ผู้แก้ไข",
        minWidth: 100,
        renderCell: (params) => (
          <span className="text-xs text-slate-600 font-medium">{params.value}</span>
        ),
      },
    ],
    []
  );

  // Variant Columns
  const variantColumns = useMemo<GridColDef<DBProductVariant>[]>(() => {
    const cols: GridColDef<DBProductVariant>[] = [
      {
        field: "name",
        headerName: "ตัวเลือก",
        minWidth: 110,
        flex: 1,
        renderCell: (params) => (
          <span className="font-bold text-slate-800 text-xs">{params.value}</span>
        ),
      },
      {
        field: "sku",
        headerName: "SKU / บาร์โค้ด",
        minWidth: 140,
        flex: 1,
        renderCell: (params) => (
          <Box sx={{ display: "flex", flexDirection: "column" }}>
            <span className="font-mono text-xs font-semibold text-slate-700">{params.value}</span>
            {params.row.barcode && (
              <span className="font-mono text-[10px] text-slate-400">{params.row.barcode}</span>
            )}
          </Box>
        ),
      },
      {
        field: "unitPrice",
        headerName: "ราคาขาย",
        type: "number",
        minWidth: 90,
        headerAlign: "right",
        align: "right",
        renderCell: (params) => (
          <span className="font-bold text-slate-800 text-xs">฿{(params.value || 0).toLocaleString()}</span>
        ),
      },
    ];

    if (isAdmin) {
      cols.push({
        field: "costPrice",
        headerName: "ราคาทุน",
        type: "number",
        minWidth: 90,
        headerAlign: "right",
        align: "right",
        renderCell: (params) => (
          <span className="text-slate-500 font-mono text-xs">฿{(params.value || 0).toLocaleString()}</span>
        ),
      });
    }

    cols.push(
      {
        field: "stockQty",
        headerName: "คงคลัง",
        type: "number",
        minWidth: 80,
        headerAlign: "center",
        align: "center",
        renderCell: (params) => (
          <span className="font-bold text-slate-700 text-xs bg-slate-100 px-2 py-0.5 rounded-full">
            {params.value}
          </span>
        ),
      },
      {
        field: "actions",
        headerName: "จัดการ",
        sortable: false,
        filterable: false,
        minWidth: 90,
        headerAlign: "center",
        align: "center",
        renderCell: (params) => {
          const v = params.row;
          return (
            <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
              <Tooltip title="แก้ไข">
                <IconButton
                  size="small"
                  onClick={() => {
                    setEditingVariantId(v.id);
                    setVariantForm({
                      name: v.name,
                      sku: v.sku,
                      barcode: v.barcode || "",
                      costPrice: v.costPrice,
                      unitPrice: v.unitPrice,
                      stockQty: v.stockQty,
                      lowStockThreshold: v.lowStockThreshold,
                    });
                    setShowVariantForm(true);
                  }}
                  sx={{ color: "#64748b", "&:hover": { color: "#4f46e5" } }}
                >
                  <EditOutlinedIcon sx={{ fontSize: 15 }} />
                </IconButton>
              </Tooltip>
              <Tooltip title="ลบตัวเลือก">
                <IconButton
                  size="small"
                  onClick={() => handleDeleteVariant(v.id)}
                  sx={{ color: "#64748b", "&:hover": { color: "#dc2626" } }}
                >
                  <DeleteOutlineOutlinedIcon sx={{ fontSize: 15 }} />
                </IconButton>
              </Tooltip>
            </Box>
          );
        },
      }
    );

    return cols;
  }, [isAdmin]);

  // Bundle Component Columns
  const bundleComponentColumns = useMemo<GridColDef<DBBundleComponent>[]>(
    () => [
      {
        field: "name",
        headerName: "ชื่อสินค้า",
        minWidth: 140,
        flex: 1.5,
        renderCell: (params) => (
          <span className="font-semibold text-slate-800 text-xs">{params.value}</span>
        ),
      },
      {
        field: "sku",
        headerName: "SKU",
        minWidth: 110,
        renderCell: (params) => (
          <span className="font-mono text-xs text-slate-600">{params.value}</span>
        ),
      },
      {
        field: "qtyRequired",
        headerName: "ต้องใช้ / เซ็ต",
        type: "number",
        minWidth: 100,
        headerAlign: "center",
        align: "center",
        renderCell: (params) => (
          <span className="font-bold text-xs text-slate-900">{params.value}</span>
        ),
      },
      {
        field: "stockQty",
        headerName: "คลังเดี่ยว",
        type: "number",
        minWidth: 90,
        headerAlign: "center",
        align: "center",
        renderCell: (params) => (
          <span className="text-xs text-slate-600 font-mono">{params.value}</span>
        ),
      },
      {
        field: "possibleSets",
        headerName: "จัดได้สูงสุด",
        type: "number",
        minWidth: 100,
        headerAlign: "center",
        align: "center",
        valueGetter: (_value, row) => Math.floor(row.stockQty / row.qtyRequired),
        renderCell: (params) => (
          <span className="font-bold text-indigo-600 text-xs bg-indigo-50 px-2 py-0.5 rounded-full">
            {params.value} เซ็ต
          </span>
        ),
      },
      {
        field: "actions",
        headerName: "ลบ",
        sortable: false,
        filterable: false,
        minWidth: 60,
        headerAlign: "center",
        align: "center",
        renderCell: (params) => (
          <IconButton
            size="small"
            onClick={() => handleRemoveBundleComponent(params.row.componentId)}
            sx={{ color: "#94a3b8", "&:hover": { color: "#dc2626" } }}
          >
            <DeleteOutlineOutlinedIcon sx={{ fontSize: 15 }} />
          </IconButton>
        ),
      },
    ],
    []
  );

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
                onChange={(e) => setStockLevelFilter(e.target.value as "all" | "normal" | "low" | "out")}
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
                <select className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-indigo-500/20 focus:outline-none bg-white font-semibold text-slate-700" value={newProductType} onChange={(e) => setNewProductType(e.target.value as "standard" | "bundle")}>
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

      {/* Products DataGrid */}
      <MeeDataGrid
        rows={processedProducts}
        columns={columns}
        loading={loading}
        quickFilterPlaceholder="ค้นหาชื่อสินค้า, SKU, บาร์โค้ด, หมวดหมู่..."
        autoHeight
      />

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
                <svg ref={printBarcodeSvgRef} style={{ width: "100%", height: "16mm" }} />
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
          <div className="relative w-full max-w-2xl rounded-3xl bg-white p-6 shadow-2xl border border-slate-100 flex flex-col gap-4 max-h-[85vh] animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base font-bold text-slate-800">ประวัติการแก้ไข: {historyProduct.name}</h3>
              <button onClick={() => setHistoryProduct(null)} className="text-slate-400 hover:text-slate-600 rounded-lg p-1 hover:bg-slate-100">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="flex-1 w-full">
              <MeeDataGrid
                rows={history}
                columns={historyColumns}
                loading={historyLoading}
                height={340}
                pageSize={5}
                disableExport
              />
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

            {/* Variants List DataGrid */}
            <div className="flex-1 w-full">
              <MeeDataGrid
                rows={variantsList}
                columns={variantColumns}
                height={280}
                pageSize={5}
                disableExport
              />
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

            {/* Component List DataGrid */}
            <div className="flex-1 w-full">
              <MeeDataGrid
                rows={bundleComponents}
                getRowId={(r) => r.componentId}
                columns={bundleComponentColumns}
                height={280}
                pageSize={5}
                disableExport
              />
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

      {/* Confirm Product Deactivation Dialog */}
      <ConfirmDialog
        open={Boolean(deleteTarget)}
        title="ยืนยันการปิดสินค้า"
        message={`คุณต้องการปิดสินค้า "${deleteTarget?.name}" หรือไม่? สินค้าจะถูกเปลี่ยนสถานะเป็นปิดใช้งาน (ไม่ลบข้อมูลจริงออกจากฐานข้อมูล)`}
        confirmText="ปิดใช้งานสินค้า"
        cancelText="ยกเลิก"
        isDestructive
        onConfirm={confirmDeleteProduct}
        onClose={() => setDeleteTarget(null)}
      />
    </div>
  );
}
