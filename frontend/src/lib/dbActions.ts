"use server";

import { getPool, getDemoMerchantId } from "./db";
import mssql from "mssql";

// ================================================================
// TYPES
// ================================================================

export type DBProduct = {
  id: string;
  sku: string;
  barcode: string;
  name: string;
  unitPrice: number;
  costPrice: number;
  stockQty: number;
  lowStockThreshold: number;
  unit: string;
  notes: string;
  status: "active" | "inactive" | "discontinued";
  categoryId: string | null;
  categoryName: string | null;
  imageUrl: string | null;
  productType: "standard" | "bundle";
};

export type DBProductVariant = {
  id: string;
  productId: string;
  sku: string;
  barcode: string | null;
  name: string;
  costPrice: number;
  unitPrice: number;
  stockQty: number;
  lowStockThreshold: number;
};

export type DBBundleComponent = {
  id: string;
  componentId: string;
  name: string;
  sku: string;
  qtyRequired: number;
  stockQty: number;
};

export type DBCategory = {
  id: string;
  parentId: string | null;
  name: string;
  code: string | null;
  color: string;
  sortOrder: number;
  productCount: number;
  children?: DBCategory[];
};

export type DBSupplier = {
  id: string;
  name: string;
  contactName: string | null;
  phone: string | null;
  email: string | null;
  address: string | null;
};

export type DBStockMovement = {
  id: string;
  sku: string;
  barcode: string;
  productName: string;
  movementType: "In" | "Out" | "Return";
  qty: number;
  reason: string;
  refType: string;
  lotNo: string | null;
  expiryDate: string | null;
  supplierName: string | null;
  costPrice: number | null;
  note: string | null;
  createdAt: string;
};

export type DBShipmentOrder = {
  id: string;
  orderNo: string;
  createdAt: string;
  senderName: string;
  senderAddress: string;
  receiverName: string;
  receiverPhone: string;
  receiverAddress: string;
  trackingNo?: string;
  status: "Confirmed" | "Shipped" | "Cancelled";
  totalAmount: number;
};

export type DBSaleOrder = {
  id: string;
  orderNo: string;
  invoiceNo: string | null;
  createdAt: string;
  status: string;
  totalAmount: number;
  costTotal: number;
  note: string | null;
  items: { productId: string; productName: string; qty: number; unitPrice: number; lineAmount: number; costPrice: number }[];
};

export type DBProductAuditLog = {
  id: string;
  action: string;
  fieldName: string | null;
  valueBefore: string | null;
  valueAfter: string | null;
  changedBy: string;
  createdAt: string;
};

export type DBProfitReportRow = {
  sku: string;
  productName: string;
  qtySold: number;
  salesTotal: number;
  costTotal: number;
  profit: number;
};

export type DBSlowMovingRow = {
  id: string;
  sku: string;
  name: string;
  stockQty: number;
  unit: string;
  unitPrice: number;
  costPrice: number;
  lastMovement: string | null;
};

export type DBExpiringRow = {
  lotNo: string | null;
  expiryDate: string;
  sku: string;
  productName: string;
  qty: number;
  supplierName: string | null;
};

export type DBAlert = {
  id: string;
  type: "low_stock" | "expiry";
  productId: string;
  productName: string;
  message: string;
  isRead: boolean;
  createdAt: string;
};

// ================================================================
// 1. PRODUCT OPERATIONS
// ================================================================

export async function getProducts(search = "", categoryId?: string, status = "active"): Promise<DBProduct[]> {
  try {
    const merchantId = await getDemoMerchantId();
    const pool = await getPool();
    const request = pool.request();

    let query = `
      SELECT p.id, p.sku, p.barcode, p.name, p.unit_price, p.cost_price, p.unit, p.notes, p.status, p.category_id, p.image_url,
             p.product_type, p.low_stock_threshold,
             c.name as category_name,
             (SELECT COUNT(*) FROM dbo.product_variants pv WHERE pv.product_id = p.id AND pv.is_active = 1) as variant_count,
             CASE
               WHEN p.product_type = N'bundle' THEN
                 COALESCE((
                   SELECT MIN(comp.stock_qty / pb.qty_required)
                   FROM dbo.product_bundles pb
                   INNER JOIN dbo.products comp ON pb.component_id = comp.id
                   WHERE pb.bundle_id = p.id AND comp.is_active = 1
                 ), 0)
               WHEN (SELECT COUNT(*) FROM dbo.product_variants pv WHERE pv.product_id = p.id AND pv.is_active = 1) > 0 THEN
                 COALESCE((SELECT SUM(stock_qty) FROM dbo.product_variants pv WHERE pv.product_id = p.id AND pv.is_active = 1), 0)
               ELSE
                 p.stock_qty
             END as calculated_stock_qty
      FROM dbo.products p
      LEFT JOIN dbo.categories c ON p.category_id = c.id
      WHERE p.merchant_id = @merchantId AND p.is_active = 1
    `;

    request.input("merchantId", mssql.UniqueIdentifier, merchantId);

    if (status && status !== "all") {
      query += ` AND p.status = @status`;
      request.input("status", mssql.NVarChar, status);
    }

    if (categoryId) {
      query += ` AND p.category_id = @categoryId`;
      request.input("categoryId", mssql.UniqueIdentifier, categoryId);
    }

    if (search.trim()) {
      query += ` AND (p.name LIKE @search OR p.sku LIKE @search OR p.barcode LIKE @search)`;
      request.input("search", mssql.NVarChar, `%${search}%`);
    }

    query += ` ORDER BY p.created_at DESC`;

    const result = await request.query(query);

    return result.recordset.map((row) => ({
      id: row.id.toString(),
      sku: row.sku,
      barcode: row.barcode,
      name: row.name,
      unitPrice: Number(row.unit_price),
      costPrice: Number(row.cost_price ?? 0),
      stockQty: Number(row.calculated_stock_qty),
      lowStockThreshold: Number(row.low_stock_threshold),
      unit: row.unit ?? "ชิ้น",
      notes: row.notes ?? "",
      status: row.status ?? "active",
      categoryId: row.category_id?.toString() ?? null,
      categoryName: row.category_name ?? null,
      imageUrl: row.image_url ?? null,
      productType: row.product_type ?? "standard",
    }));
  } catch (err) {
    console.error("getProducts failed:", err);
    return [];
  }
}

export async function checkSkuExists(sku: string, excludeId?: string): Promise<boolean> {
  try {
    const merchantId = await getDemoMerchantId();
    const pool = await getPool();
    const request = pool.request()
      .input("merchantId", mssql.UniqueIdentifier, merchantId)
      .input("sku", mssql.NVarChar, sku.trim());

    let query = "SELECT COUNT(*) as cnt FROM dbo.products WHERE merchant_id = @merchantId AND sku = @sku";
    if (excludeId) {
      query += " AND id != @excludeId";
      request.input("excludeId", mssql.UniqueIdentifier, excludeId);
    }

    const result = await request.query(query);
    return result.recordset[0].cnt > 0;
  } catch {
    return false;
  }
}

export async function createProduct(product: {
  sku: string;
  barcode: string;
  name: string;
  unitPrice: number;
  costPrice: number;
  stockQty: number;
  lowStockThreshold: number;
  unit: string;
  notes: string;
  categoryId: string | null;
  imageUrl: string | null;
  productType?: "standard" | "bundle";
}): Promise<boolean> {
  try {
    const merchantId = await getDemoMerchantId();
    const pool = await getPool();

    await pool.request()
      .input("merchantId", mssql.UniqueIdentifier, merchantId)
      .input("sku", mssql.NVarChar, product.sku.trim())
      .input("barcode", mssql.NVarChar, product.barcode.trim())
      .input("name", mssql.NVarChar, product.name.trim())
      .input("unitPrice", mssql.Decimal(18, 2), product.unitPrice)
      .input("costPrice", mssql.Decimal(18, 2), product.costPrice)
      .input("stockQty", mssql.Int, product.stockQty)
      .input("lowStockThreshold", mssql.Int, product.lowStockThreshold)
      .input("unit", mssql.NVarChar, product.unit || "ชิ้น")
      .input("notes", mssql.NVarChar, product.notes || "")
      .input("categoryId", mssql.UniqueIdentifier, product.categoryId || null)
      .input("imageUrl", mssql.NVarChar, product.imageUrl || null)
      .input("productType", mssql.NVarChar, product.productType || "standard")
      .query(`
        INSERT INTO dbo.products
          (merchant_id, sku, barcode, name, unit_price, cost_price, stock_qty, low_stock_threshold, unit, notes, category_id, image_url, is_active, status, product_type)
        VALUES
          (@merchantId, @sku, @barcode, @name, @unitPrice, @costPrice, @stockQty, @lowStockThreshold, @unit, @notes, @categoryId, @imageUrl, 1, N'active', @productType)
      `);

    return true;
  } catch (err) {
    console.error("createProduct failed:", err);
    return false;
  }
}

export async function updateProduct(
  id: string,
  product: Partial<{
    name: string;
    unitPrice: number;
    costPrice: number;
    lowStockThreshold: number;
    unit: string;
    notes: string;
    categoryId: string | null;
    imageUrl: string | null;
    status: string;
  }>,
  changedBy = "system"
): Promise<boolean> {
  try {
    const merchantId = await getDemoMerchantId();
    const pool = await getPool();

    // Get current values for audit
    const current = await pool.request()
      .input("id", mssql.UniqueIdentifier, id)
      .input("merchantId", mssql.UniqueIdentifier, merchantId)
      .query("SELECT name, unit_price, cost_price, low_stock_threshold, unit, notes, status FROM dbo.products WHERE id = @id AND merchant_id = @merchantId");

    if (current.recordset.length === 0) return false;
    const prev = current.recordset[0];

    const transaction = new mssql.Transaction(pool);
    await transaction.begin();

    try {
      await transaction.request()
        .input("id", mssql.UniqueIdentifier, id)
        .input("merchantId", mssql.UniqueIdentifier, merchantId)
        .input("name", mssql.NVarChar, product.name ?? prev.name)
        .input("unitPrice", mssql.Decimal(18, 2), product.unitPrice ?? Number(prev.unit_price))
        .input("costPrice", mssql.Decimal(18, 2), product.costPrice ?? Number(prev.cost_price))
        .input("lowStockThreshold", mssql.Int, product.lowStockThreshold ?? prev.low_stock_threshold)
        .input("unit", mssql.NVarChar, product.unit ?? prev.unit)
        .input("notes", mssql.NVarChar, product.notes ?? prev.notes ?? "")
        .input("categoryId", mssql.UniqueIdentifier, product.categoryId ?? null)
        .input("imageUrl", mssql.NVarChar, product.imageUrl ?? null)
        .input("status", mssql.NVarChar, product.status ?? prev.status ?? "active")
        .query(`
          UPDATE dbo.products
          SET name = @name, unit_price = @unitPrice, cost_price = @costPrice,
              low_stock_threshold = @lowStockThreshold, unit = @unit, notes = @notes,
              category_id = @categoryId, image_url = @imageUrl, status = @status,
              updated_at = SYSUTCDATETIME()
          WHERE id = @id AND merchant_id = @merchantId
        `);

      // Audit log — record each changed field
      const fieldsToAudit = [
        { field: "name", before: prev.name, after: product.name },
        { field: "unit_price", before: String(prev.unit_price), after: product.unitPrice !== undefined ? String(product.unitPrice) : undefined },
        { field: "cost_price", before: String(prev.cost_price), after: product.costPrice !== undefined ? String(product.costPrice) : undefined },
        { field: "status", before: prev.status, after: product.status },
      ];

      for (const f of fieldsToAudit) {
        if (f.after !== undefined && String(f.before) !== String(f.after)) {
          await transaction.request()
            .input("merchantId", mssql.UniqueIdentifier, merchantId)
            .input("productId", mssql.UniqueIdentifier, id)
            .input("action", mssql.NVarChar, "updated")
            .input("fieldName", mssql.NVarChar, f.field)
            .input("valueBefore", mssql.NVarChar, String(f.before ?? ""))
            .input("valueAfter", mssql.NVarChar, String(f.after ?? ""))
            .input("changedBy", mssql.NVarChar, changedBy)
            .query(`
              INSERT INTO dbo.product_audit_log (merchant_id, product_id, action, field_name, value_before, value_after, changed_by)
              VALUES (@merchantId, @productId, @action, @fieldName, @valueBefore, @valueAfter, @changedBy)
            `);
        }
      }

      await transaction.commit();
      return true;
    } catch (err) {
      await transaction.rollback();
      throw err;
    }
  } catch (err) {
    console.error("updateProduct failed:", err);
    return false;
  }
}

export async function deleteProduct(id: string): Promise<{ success: boolean; error?: string }> {
  try {
    const merchantId = await getDemoMerchantId();
    const pool = await getPool();

    // Check stock = 0 before deactivating
    const stockCheck = await pool.request()
      .input("id", mssql.UniqueIdentifier, id)
      .input("merchantId", mssql.UniqueIdentifier, merchantId)
      .query("SELECT stock_qty FROM dbo.products WHERE id = @id AND merchant_id = @merchantId");

    if (stockCheck.recordset.length === 0) return { success: false, error: "ไม่พบสินค้า" };

    const stockQty = Number(stockCheck.recordset[0].stock_qty);
    if (stockQty > 0) {
      return { success: false, error: `ไม่สามารถปิดสินค้าได้ เนื่องจากยังมีสต็อกคงเหลือ ${stockQty} ชิ้น กรุณาปรับสต็อกเป็น 0 ก่อน` };
    }

    // Soft-delete: set inactive + discontinued
    await pool.request()
      .input("id", mssql.UniqueIdentifier, id)
      .input("merchantId", mssql.UniqueIdentifier, merchantId)
      .query("UPDATE dbo.products SET is_active = 0, status = N'inactive', updated_at = SYSUTCDATETIME() WHERE id = @id AND merchant_id = @merchantId");

    return { success: true };
  } catch (err) {
    console.error("deleteProduct failed:", err);
    return { success: false, error: "เกิดข้อผิดพลาดในการปิดสินค้า" };
  }
}

export async function updateProductStock(id: string, qtyChange: number): Promise<boolean> {
  try {
    const merchantId = await getDemoMerchantId();
    const pool = await getPool();
    const transaction = new mssql.Transaction(pool);
    await transaction.begin();

    try {
      const updateResult = await transaction.request()
        .input("id", mssql.UniqueIdentifier, id)
        .input("merchantId", mssql.UniqueIdentifier, merchantId)
        .input("qtyChange", mssql.Int, qtyChange)
        .query(`
          UPDATE dbo.products
          SET stock_qty = CASE WHEN (stock_qty + @qtyChange) < 0 THEN 0 ELSE (stock_qty + @qtyChange) END,
              updated_at = SYSUTCDATETIME()
          OUTPUT inserted.id, inserted.stock_qty, inserted.low_stock_threshold
          WHERE id = @id AND merchant_id = @merchantId
        `);

      if (updateResult.recordset.length === 0) { await transaction.rollback(); return false; }

      const product = updateResult.recordset[0];
      const newStock = product.stock_qty;
      const threshold = product.low_stock_threshold;
      const movementType = qtyChange > 0 ? "In" : "Out";

      await transaction.request()
        .input("merchantId", mssql.UniqueIdentifier, merchantId)
        .input("productId", mssql.UniqueIdentifier, id)
        .input("movementType", mssql.NVarChar, movementType)
        .input("qty", mssql.Int, qtyChange)
        .input("reason", mssql.NVarChar, "manual_adjust")
        .input("refType", mssql.NVarChar, "manual")
        .query(`
          INSERT INTO dbo.stock_movements (merchant_id, product_id, movement_type, qty, reason, ref_type)
          VALUES (@merchantId, @productId, @movementType, @qty, @reason, @refType)
        `);

      if (newStock <= threshold) {
        await transaction.request()
          .input("merchantId", mssql.UniqueIdentifier, merchantId)
          .input("productId", mssql.UniqueIdentifier, id)
          .input("stockQty", mssql.Int, newStock)
          .input("threshold", mssql.Int, threshold)
          .query(`
            IF NOT EXISTS (SELECT 1 FROM dbo.low_stock_alerts WHERE product_id = @productId AND is_read = 0)
            BEGIN
              INSERT INTO dbo.low_stock_alerts (merchant_id, product_id, stock_qty, low_stock_threshold, is_read)
              VALUES (@merchantId, @productId, @stockQty, @threshold, 0)
            END
          `);
      }

      await transaction.commit();
      return true;
    } catch (err) {
      await transaction.rollback();
      throw err;
    }
  } catch (err) {
    console.error("updateProductStock failed:", err);
    return false;
  }
}

export async function getProductHistory(productId: string): Promise<DBProductAuditLog[]> {
  try {
    const pool = await getPool();
    const result = await pool.request()
      .input("productId", mssql.UniqueIdentifier, productId)
      .query(`
        SELECT id, action, field_name, value_before, value_after, changed_by, created_at
        FROM dbo.product_audit_log
        WHERE product_id = @productId
        ORDER BY created_at DESC
      `);
    return result.recordset.map((row) => ({
      id: row.id.toString(),
      action: row.action,
      fieldName: row.field_name,
      valueBefore: row.value_before,
      valueAfter: row.value_after,
      changedBy: row.changed_by,
      createdAt: new Date(row.created_at).toLocaleString("th-TH"),
    }));
  } catch (err) {
    console.error("getProductHistory failed:", err);
    return [];
  }
}

// ================================================================
// 2. CATEGORY OPERATIONS
// ================================================================

export async function getCategories(): Promise<DBCategory[]> {
  try {
    const merchantId = await getDemoMerchantId();
    const pool = await getPool();
    const result = await pool.request()
      .input("merchantId", mssql.UniqueIdentifier, merchantId)
      .query(`
        SELECT c.id, c.parent_id, c.name, c.code, c.color, c.sort_order,
               COUNT(p.id) as product_count
        FROM dbo.categories c
        LEFT JOIN dbo.products p ON p.category_id = c.id AND p.is_active = 1
        WHERE c.merchant_id = @merchantId AND c.is_active = 1
        GROUP BY c.id, c.parent_id, c.name, c.code, c.color, c.sort_order
        ORDER BY c.sort_order, c.name
      `);

    const flat: DBCategory[] = result.recordset.map((row) => ({
      id: row.id.toString(),
      parentId: row.parent_id?.toString() ?? null,
      name: row.name,
      code: row.code ?? null,
      color: row.color ?? "#6366f1",
      sortOrder: row.sort_order,
      productCount: Number(row.product_count),
      children: [],
    }));

    // Build tree
    const map = new Map(flat.map((c) => [c.id, c]));
    const roots: DBCategory[] = [];
    for (const cat of flat) {
      if (cat.parentId && map.has(cat.parentId)) {
        map.get(cat.parentId)!.children!.push(cat);
      } else {
        roots.push(cat);
      }
    }
    return roots;
  } catch (err) {
    console.error("getCategories failed:", err);
    return [];
  }
}

export async function getCategoriesFlat(): Promise<DBCategory[]> {
  try {
    const merchantId = await getDemoMerchantId();
    const pool = await getPool();
    const result = await pool.request()
      .input("merchantId", mssql.UniqueIdentifier, merchantId)
      .query(`
        SELECT id, parent_id, name, code, color, sort_order, 0 as product_count
        FROM dbo.categories
        WHERE merchant_id = @merchantId AND is_active = 1
        ORDER BY sort_order, name
      `);
    return result.recordset.map((row) => ({
      id: row.id.toString(),
      parentId: row.parent_id?.toString() ?? null,
      name: row.name,
      code: row.code ?? null,
      color: row.color ?? "#6366f1",
      sortOrder: row.sort_order,
      productCount: 0,
    }));
  } catch (err) {
    console.error("getCategoriesFlat failed:", err);
    return [];
  }
}

export async function createCategory(data: {
  name: string;
  parentId: string | null;
  code: string;
  color: string;
}): Promise<boolean> {
  try {
    const merchantId = await getDemoMerchantId();
    const pool = await getPool();
    await pool.request()
      .input("merchantId", mssql.UniqueIdentifier, merchantId)
      .input("name", mssql.NVarChar, data.name.trim())
      .input("parentId", mssql.UniqueIdentifier, data.parentId || null)
      .input("code", mssql.NVarChar, data.code?.trim() || null)
      .input("color", mssql.NVarChar, data.color || "#6366f1")
      .query(`
        INSERT INTO dbo.categories (merchant_id, parent_id, name, code, color, sort_order)
        VALUES (@merchantId, @parentId, @name, @code, @color, 0)
      `);
    return true;
  } catch (err) {
    console.error("createCategory failed:", err);
    return false;
  }
}

export async function updateCategory(id: string, data: { name: string; code: string; color: string }): Promise<boolean> {
  try {
    const merchantId = await getDemoMerchantId();
    const pool = await getPool();
    await pool.request()
      .input("id", mssql.UniqueIdentifier, id)
      .input("merchantId", mssql.UniqueIdentifier, merchantId)
      .input("name", mssql.NVarChar, data.name.trim())
      .input("code", mssql.NVarChar, data.code?.trim() || null)
      .input("color", mssql.NVarChar, data.color || "#6366f1")
      .query("UPDATE dbo.categories SET name = @name, code = @code, color = @color WHERE id = @id AND merchant_id = @merchantId");
    return true;
  } catch (err) {
    console.error("updateCategory failed:", err);
    return false;
  }
}

export async function deleteCategory(id: string): Promise<{ success: boolean; error?: string }> {
  try {
    const merchantId = await getDemoMerchantId();
    const pool = await getPool();

    // Check children
    const childCheck = await pool.request()
      .input("id", mssql.UniqueIdentifier, id)
      .query("SELECT COUNT(*) as cnt FROM dbo.categories WHERE parent_id = @id AND is_active = 1");
    if (childCheck.recordset[0].cnt > 0) return { success: false, error: "ไม่สามารถลบได้ เนื่องจากยังมีหมวดหมู่ย่อยอยู่" };

    // Check products
    const productCheck = await pool.request()
      .input("id", mssql.UniqueIdentifier, id)
      .input("merchantId", mssql.UniqueIdentifier, merchantId)
      .query("SELECT COUNT(*) as cnt FROM dbo.products WHERE category_id = @id AND merchant_id = @merchantId AND is_active = 1");
    if (productCheck.recordset[0].cnt > 0) return { success: false, error: "ไม่สามารถลบได้ เนื่องจากยังมีสินค้าในหมวดหมู่นี้" };

    await pool.request()
      .input("id", mssql.UniqueIdentifier, id)
      .input("merchantId", mssql.UniqueIdentifier, merchantId)
      .query("UPDATE dbo.categories SET is_active = 0 WHERE id = @id AND merchant_id = @merchantId");

    return { success: true };
  } catch (err) {
    console.error("deleteCategory failed:", err);
    return { success: false, error: "เกิดข้อผิดพลาด" };
  }
}

// ================================================================
// 3. SUPPLIER OPERATIONS
// ================================================================

export async function getSuppliers(): Promise<DBSupplier[]> {
  try {
    const merchantId = await getDemoMerchantId();
    const pool = await getPool();
    const result = await pool.request()
      .input("merchantId", mssql.UniqueIdentifier, merchantId)
      .query("SELECT id, name, contact_name, phone, email, address FROM dbo.suppliers WHERE merchant_id = @merchantId AND is_active = 1 ORDER BY name");
    return result.recordset.map((row) => ({
      id: row.id.toString(),
      name: row.name,
      contactName: row.contact_name ?? null,
      phone: row.phone ?? null,
      email: row.email ?? null,
      address: row.address ?? null,
    }));
  } catch (err) {
    console.error("getSuppliers failed:", err);
    return [];
  }
}

export async function createSupplier(data: {
  name: string;
  contactName: string;
  phone: string;
  email: string;
  address: string;
}): Promise<{ success: boolean; id?: string }> {
  try {
    const merchantId = await getDemoMerchantId();
    const pool = await getPool();
    const result = await pool.request()
      .input("merchantId", mssql.UniqueIdentifier, merchantId)
      .input("name", mssql.NVarChar, data.name.trim())
      .input("contactName", mssql.NVarChar, data.contactName?.trim() || null)
      .input("phone", mssql.NVarChar, data.phone?.trim() || null)
      .input("email", mssql.NVarChar, data.email?.trim() || null)
      .input("address", mssql.NVarChar, data.address?.trim() || null)
      .query(`
        INSERT INTO dbo.suppliers (merchant_id, name, contact_name, phone, email, address)
        OUTPUT inserted.id
        VALUES (@merchantId, @name, @contactName, @phone, @email, @address)
      `);
    return { success: true, id: result.recordset[0].id.toString() };
  } catch (err) {
    console.error("createSupplier failed:", err);
    return { success: false };
  }
}

// ================================================================
// 4. STOCK IN / STOCK OUT
// ================================================================

export async function stockIn(data: {
  productId: string;
  variantId?: string | null;
  qty: number;
  lotNo?: string;
  expiryDate?: string;
  supplierId?: string;
  costPrice?: number;
  note?: string;
}, createdBy = "system"): Promise<boolean> {
  try {
    const merchantId = await getDemoMerchantId();
    const pool = await getPool();
    const transaction = new mssql.Transaction(pool);
    await transaction.begin();

    try {
      if (data.variantId) {
        await transaction.request()
          .input("id", mssql.UniqueIdentifier, data.variantId)
          .input("merchantId", mssql.UniqueIdentifier, merchantId)
          .input("qty", mssql.Int, data.qty)
          .query(`
            UPDATE dbo.product_variants
            SET stock_qty = stock_qty + @qty
            WHERE id = @id AND merchant_id = @merchantId
          `);
      } else {
        await transaction.request()
          .input("id", mssql.UniqueIdentifier, data.productId)
          .input("merchantId", mssql.UniqueIdentifier, merchantId)
          .input("qty", mssql.Int, data.qty)
          .query(`
            UPDATE dbo.products
            SET stock_qty = stock_qty + @qty, updated_at = SYSUTCDATETIME()
            WHERE id = @id AND merchant_id = @merchantId
          `);
      }

      await transaction.request()
        .input("merchantId", mssql.UniqueIdentifier, merchantId)
        .input("productId", mssql.UniqueIdentifier, data.productId)
        .input("qty", mssql.Int, data.qty)
        .input("lotNo", mssql.NVarChar, data.lotNo || null)
        .input("expiryDate", mssql.Date, data.expiryDate ? new Date(data.expiryDate) : null)
        .input("supplierId", mssql.UniqueIdentifier, data.supplierId || null)
        .input("costPrice", mssql.Decimal(18, 2), data.costPrice ?? null)
        .input("note", mssql.NVarChar, data.note || null)
        .input("createdBy", mssql.NVarChar, createdBy)
        .query(`
          INSERT INTO dbo.stock_movements
            (merchant_id, product_id, movement_type, qty, reason, ref_type, lot_no, expiry_date, supplier_id, cost_price, note, created_by)
          VALUES
            (@merchantId, @productId, N'In', @qty, N'stock_in', N'stock_in', @lotNo, @expiryDate, @supplierId, @costPrice, @note, @createdBy)
        `);

      await transaction.commit();
      return true;
    } catch (err) {
      await transaction.rollback();
      throw err;
    }
  } catch (err) {
    console.error("stockIn failed:", err);
    return false;
  }
}

export async function createSaleOrder(data: {
  items: { productId: string; variantId?: string | null; qty: number; unitPrice: number; costPrice: number }[];
  note?: string;
  discount?: number;
  }, createdBy = "system"): Promise<{ success: boolean; orderNo?: string; error?: string }> {
  try {
    const merchantId = await getDemoMerchantId();
    const pool = await getPool();
    const transaction = new mssql.Transaction(pool);
    await transaction.begin();

    try {
      // Get or create demo customer
      const custResult = await transaction.request()
        .input("merchantId", mssql.UniqueIdentifier, merchantId)
        .query("SELECT TOP 1 id FROM dbo.customers WHERE merchant_id = @merchantId");

      const customerId = custResult.recordset[0]?.id.toString() ?? null;
      if (!customerId) throw new Error("ไม่พบข้อมูลลูกค้า");

      const orderNo = `INV-${Date.now()}`;
      const invoiceNo = `IV${new Date().getFullYear()}${String(Date.now()).slice(-6)}`;
      const totalAmount = data.items.reduce((sum, i) => sum + i.unitPrice * i.qty, 0) - (data.discount ?? 0);
      const costTotal = data.items.reduce((sum, i) => sum + i.costPrice * i.qty, 0);

      const orderResult = await transaction.request()
        .input("merchantId", mssql.UniqueIdentifier, merchantId)
        .input("orderNo", mssql.NVarChar, orderNo)
        .input("invoiceNo", mssql.NVarChar, invoiceNo)
        .input("customerId", mssql.UniqueIdentifier, customerId)
        .input("totalAmount", mssql.Decimal(18, 2), totalAmount)
        .input("costTotal", mssql.Decimal(18, 2), costTotal)
        .input("discount", mssql.Decimal(18, 2), data.discount ?? 0)
        .input("note", mssql.NVarChar, data.note || null)
        .input("createdBy", mssql.NVarChar, createdBy)
        .query(`
          INSERT INTO dbo.orders
            (merchant_id, order_no, invoice_no, customer_id, status, total_amount, cost_total, discount_amount, note, order_type, created_by)
          OUTPUT inserted.id
          VALUES
            (@merchantId, @orderNo, @invoiceNo, @customerId, N'Confirmed', @totalAmount, @costTotal, @discount, @note, N'sale', @createdBy)
        `);

      const orderId = orderResult.recordset[0].id.toString();

      for (const item of data.items) {
        // Insert order item
        await transaction.request()
          .input("merchantId", mssql.UniqueIdentifier, merchantId)
          .input("orderId", mssql.UniqueIdentifier, orderId)
          .input("productId", mssql.UniqueIdentifier, item.productId)
          .input("qty", mssql.Int, item.qty)
          .input("unitPrice", mssql.Decimal(18, 2), item.unitPrice)
          .input("lineAmount", mssql.Decimal(18, 2), item.unitPrice * item.qty)
          .input("costPrice", mssql.Decimal(18, 2), item.costPrice)
          .query(`
            INSERT INTO dbo.order_items (merchant_id, order_id, product_id, qty, unit_price, line_amount, cost_price)
            VALUES (@merchantId, @orderId, @productId, @qty, @unitPrice, @lineAmount, @costPrice)
          `);

        // Deduct stock
        if (item.variantId) {
          await transaction.request()
            .input("id", mssql.UniqueIdentifier, item.variantId)
            .input("merchantId", mssql.UniqueIdentifier, merchantId)
            .input("qty", mssql.Int, item.qty)
            .query(`
              UPDATE dbo.product_variants
              SET stock_qty = CASE WHEN stock_qty - @qty < 0 THEN 0 ELSE stock_qty - @qty END
              WHERE id = @id AND merchant_id = @merchantId
            `);
        } else {
          // Check if bundle
          const isBundleResult = await transaction.request()
            .input("productId", mssql.UniqueIdentifier, item.productId)
            .query("SELECT product_type FROM dbo.products WHERE id = @productId");

          const isBundle = isBundleResult.recordset[0]?.product_type === "bundle";
          if (isBundle) {
            const componentsResult = await transaction.request()
              .input("bundleId", mssql.UniqueIdentifier, item.productId)
              .query("SELECT component_id, qty_required FROM dbo.product_bundles WHERE bundle_id = @bundleId");

            for (const comp of componentsResult.recordset) {
              const compId = comp.component_id.toString();
              const deductQty = Number(comp.qty_required) * item.qty;

              await transaction.request()
                .input("compProductId", mssql.UniqueIdentifier, compId)
                .input("merchantId", mssql.UniqueIdentifier, merchantId)
                .input("deductQty", mssql.Int, deductQty)
                .query(`
                  UPDATE dbo.products
                  SET stock_qty = CASE WHEN stock_qty - @deductQty < 0 THEN 0 ELSE stock_qty - @deductQty END,
                      updated_at = SYSUTCDATETIME()
                  WHERE id = @compProductId AND merchant_id = @merchantId
                `);

              await transaction.request()
                .input("merchantId", mssql.UniqueIdentifier, merchantId)
                .input("productId", mssql.UniqueIdentifier, compId)
                .input("qty", mssql.Int, -deductQty)
                .input("orderId", mssql.UniqueIdentifier, orderId)
                .input("createdBy", mssql.NVarChar, createdBy)
                .query(`
                  INSERT INTO dbo.stock_movements (merchant_id, product_id, movement_type, qty, reason, ref_type, ref_id, created_by, note)
                  VALUES (@merchantId, @productId, N'Out', @qty, N'sale', N'order', @orderId, @createdBy, N'Deducted as bundle component')
                `);
            }
          } else {
            await transaction.request()
              .input("id", mssql.UniqueIdentifier, item.productId)
              .input("merchantId", mssql.UniqueIdentifier, merchantId)
              .input("qty", mssql.Int, item.qty)
              .query(`
                UPDATE dbo.products
                SET stock_qty = CASE WHEN stock_qty - @qty < 0 THEN 0 ELSE stock_qty - @qty END,
                    updated_at = SYSUTCDATETIME()
                WHERE id = @id AND merchant_id = @merchantId
              `);
          }
        }

        // Log movement for main product/variant
        await transaction.request()
          .input("merchantId", mssql.UniqueIdentifier, merchantId)
          .input("productId", mssql.UniqueIdentifier, item.productId)
          .input("qty", mssql.Int, -item.qty)
          .input("orderId", mssql.UniqueIdentifier, orderId)
          .input("createdBy", mssql.NVarChar, createdBy)
          .query(`
            INSERT INTO dbo.stock_movements (merchant_id, product_id, movement_type, qty, reason, ref_type, ref_id, created_by)
            VALUES (@merchantId, @productId, N'Out', @qty, N'sale', N'order', @orderId, @createdBy)
          `);
      }

      await transaction.commit();
      return { success: true, orderNo };
    } catch (err) {
      await transaction.rollback();
      throw err;
    }
  } catch (err) {
    console.error("createSaleOrder failed:", err);
    return { success: false, error: "เกิดข้อผิดพลาดในการบันทึกการขาย" };
  }
}

// ================================================================
// 5. ORDER & SHIPMENT OPERATIONS (ของเดิม + เพิ่มเติม)
// ================================================================

export async function saveShipmentOrder(order: {
  orderNo: string;
  senderName: string;
  senderAddress: string;
  receiverName: string;
  receiverPhone: string;
  receiverAddress: string;
}): Promise<boolean> {
  try {
    const merchantId = await getDemoMerchantId();
    const pool = await getPool();
    const transaction = new mssql.Transaction(pool);
    await transaction.begin();

    try {
      let customerId: string;
      const customerResult = await transaction.request()
        .input("merchantId", mssql.UniqueIdentifier, merchantId)
        .input("name", mssql.NVarChar, order.receiverName.trim())
        .input("phone", mssql.NVarChar, order.receiverPhone.trim())
        .input("address", mssql.NVarChar, order.receiverAddress.trim())
        .query(`
          DECLARE @existingId UNIQUEIDENTIFIER;
          SELECT TOP 1 @existingId = id FROM dbo.customers WHERE phone = @phone AND merchant_id = @merchantId;
          IF @existingId IS NULL
          BEGIN
            SET @existingId = NEWID();
            INSERT INTO dbo.customers (id, merchant_id, name, phone, full_text_address)
            VALUES (@existingId, @merchantId, @name, @phone, @address);
          END
          ELSE
          BEGIN
            UPDATE dbo.customers SET name = @name, full_text_address = @address WHERE id = @existingId;
          END
          SELECT @existingId as customerId;
        `);

      customerId = customerResult.recordset[0].customerId.toString();

      await transaction.request()
        .input("merchantId", mssql.UniqueIdentifier, merchantId)
        .input("customerId", mssql.UniqueIdentifier, customerId)
        .input("name", mssql.NVarChar, order.receiverName.trim())
        .input("phone", mssql.NVarChar, order.receiverPhone.trim())
        .input("fullAddress", mssql.NVarChar, order.receiverAddress.trim())
        .query(`
          IF NOT EXISTS (SELECT 1 FROM dbo.addresses WHERE customer_id = @customerId AND label = N'Default')
          BEGIN
            INSERT INTO dbo.addresses (merchant_id, customer_id, label, receiver_name, receiver_phone, house_no, full_address, is_default)
            VALUES (@merchantId, @customerId, N'Default', @name, @phone, N'-', @fullAddress, 1)
          END
          ELSE
          BEGIN
            UPDATE dbo.addresses SET receiver_name = @name, receiver_phone = @phone, full_address = @fullAddress
            WHERE customer_id = @customerId AND label = N'Default'
          END
        `);

      const cleanOrderNo = order.orderNo.trim() || `MS-${Date.now()}`;
      await transaction.request()
        .input("merchantId", mssql.UniqueIdentifier, merchantId)
        .input("orderNo", mssql.NVarChar, cleanOrderNo)
        .input("customerId", mssql.UniqueIdentifier, customerId)
        .input("status", mssql.NVarChar, "Confirmed")
        .query(`
          IF EXISTS (SELECT 1 FROM dbo.orders WHERE order_no = @orderNo AND merchant_id = @merchantId)
          BEGIN
            UPDATE dbo.orders SET customer_id = @customerId, status = @status WHERE order_no = @orderNo AND merchant_id = @merchantId;
          END
          ELSE
          BEGIN
            INSERT INTO dbo.orders (merchant_id, order_no, customer_id, status, total_amount, order_type)
            VALUES (@merchantId, @orderNo, @customerId, @status, 0, N'shipment');
          END
        `);

      await transaction.commit();
      return true;
    } catch (err) {
      await transaction.rollback();
      throw err;
    }
  } catch (err) {
    console.error("saveShipmentOrder failed:", err);
    return false;
  }
}

export async function getShipmentOrders(search = "", status = "All"): Promise<DBShipmentOrder[]> {
  try {
    const merchantId = await getDemoMerchantId();
    const pool = await getPool();
    const request = pool.request();

    let query = `
      SELECT o.id, o.order_no, o.status, o.total_amount, o.created_at, o.tracking_no,
             c.name as receiverName, c.phone as receiverPhone, c.full_text_address as receiverAddress
      FROM dbo.orders o
      INNER JOIN dbo.customers c ON o.customer_id = c.id
      WHERE o.merchant_id = @merchantId AND (o.order_type = N'shipment' OR o.order_type IS NULL)
    `;

    request.input("merchantId", mssql.UniqueIdentifier, merchantId);

    if (status !== "All") {
      query += " AND o.status = @status";
      request.input("status", mssql.NVarChar, status);
    }
    if (search.trim()) {
      query += " AND (c.name LIKE @search OR c.phone LIKE @search OR o.order_no LIKE @search OR o.tracking_no LIKE @search)";
      request.input("search", mssql.NVarChar, `%${search}%`);
    }

    query += " ORDER BY o.created_at DESC";

    const result = await request.query(query);
    return result.recordset.map((row) => ({
      id: row.id.toString().toLowerCase(),
      orderNo: row.order_no,
      createdAt: new Date(row.created_at).toLocaleString("th-TH"),
      senderName: "MeeStock Shop",
      senderAddress: "99/9 ถนนสุขใจ แขวงสามเสนใน เขตพญาไท กรุงเทพ 10400",
      receiverName: row.receiverName,
      receiverPhone: row.receiverPhone,
      receiverAddress: row.receiverAddress,
      trackingNo: row.tracking_no || "",
      status: row.status,
      totalAmount: Number(row.total_amount),
    }));
  } catch (err) {
    console.error("getShipmentOrders failed:", err);
    return [];
  }
}

export async function updateShipmentTracking(orderId: string, trackingNo: string, status: string): Promise<boolean> {
  try {
    const merchantId = await getDemoMerchantId();
    const pool = await getPool();
    await pool.request()
      .input("id", mssql.UniqueIdentifier, orderId)
      .input("merchantId", mssql.UniqueIdentifier, merchantId)
      .input("trackingNo", mssql.NVarChar, trackingNo.trim())
      .input("status", mssql.NVarChar, status)
      .query("UPDATE dbo.orders SET tracking_no = @trackingNo, status = @status WHERE id = @id AND merchant_id = @merchantId");
    return true;
  } catch (err) {
    console.error("updateShipmentTracking failed:", err);
    return false;
  }
}

export async function deleteShipmentOrder(orderId: string): Promise<boolean> {
  try {
    const merchantId = await getDemoMerchantId();
    const pool = await getPool();
    await pool.request()
      .input("id", mssql.UniqueIdentifier, orderId)
      .input("merchantId", mssql.UniqueIdentifier, merchantId)
      .query("DELETE FROM dbo.orders WHERE id = @id AND merchant_id = @merchantId");
    return true;
  } catch (err) {
    console.error("deleteShipmentOrder failed:", err);
    return false;
  }
}

// ================================================================
// 6. DASHBOARD
// ================================================================

export async function getDashboardData() {
  try {
    const merchantId = await getDemoMerchantId();
    const pool = await getPool();

    const countsResult = await pool.request()
      .input("merchantId", mssql.UniqueIdentifier, merchantId)
      .query(`
        SELECT
          (SELECT COUNT(*) FROM dbo.products WHERE merchant_id = @merchantId AND is_active = 1 AND status = N'active') as total_products,
          (SELECT SUM(stock_qty) FROM dbo.products WHERE merchant_id = @merchantId AND is_active = 1) as total_stock_qty,
          (SELECT COUNT(*) FROM dbo.products WHERE merchant_id = @merchantId AND is_active = 1 AND stock_qty <= low_stock_threshold) as low_stock_count,
          (SELECT SUM(total_amount) FROM dbo.orders WHERE merchant_id = @merchantId AND order_type = N'sale' AND status != N'Cancelled') as total_sales,
          (SELECT SUM(total_amount - cost_total) FROM dbo.orders WHERE merchant_id = @merchantId AND order_type = N'sale' AND status != N'Cancelled') as total_profit
      `);

    const counts = countsResult.recordset[0];

    const lowStockResult = await pool.request()
      .input("merchantId", mssql.UniqueIdentifier, merchantId)
      .query(`
        SELECT id, name, stock_qty, low_stock_threshold
        FROM dbo.products
        WHERE merchant_id = @merchantId AND is_active = 1 AND stock_qty <= low_stock_threshold
        ORDER BY stock_qty ASC
      `);

    const lowStockItems = lowStockResult.recordset.map((row) => ({
      id: row.id.toString(),
      name: row.name,
      stockQty: Number(row.stock_qty),
      lowStockThreshold: Number(row.low_stock_threshold),
    }));

    const dailyResult = await pool.request()
      .input("merchantId", mssql.UniqueIdentifier, merchantId)
      .query(`
        SELECT FORMAT(created_at, 'MM-dd') as date, SUM(total_amount) as amount
        FROM dbo.orders
        WHERE merchant_id = @merchantId AND created_at >= DATEADD(day, -30, GETUTCDATE())
        GROUP BY FORMAT(created_at, 'MM-dd')
        ORDER BY date ASC
      `);

    let dailyData = dailyResult.recordset.map((row) => ({ date: row.date, amount: Number(row.amount) }));
    if (dailyData.length === 0) {
      dailyData = [
        { date: "05-18", amount: 1200 }, { date: "05-19", amount: 1450 },
        { date: "05-20", amount: 980 }, { date: "05-21", amount: 2100 }, { date: "05-22", amount: 1750 },
      ];
    }

    const monthlyResult = await pool.request()
      .input("merchantId", mssql.UniqueIdentifier, merchantId)
      .query(`
        SELECT FORMAT(created_at, 'MM') as month, SUM(total_amount) as amount
        FROM dbo.orders
        WHERE merchant_id = @merchantId AND created_at >= DATEADD(month, -6, GETUTCDATE())
        GROUP BY FORMAT(created_at, 'MM')
        ORDER BY month ASC
      `);

    const monthNames: Record<string, string> = {
      "01": "ม.ค.", "02": "ก.พ.", "03": "มี.ค.", "04": "เม.ย.", "05": "พ.ค.", "06": "มิ.ย.",
      "07": "ก.ค.", "08": "ส.ค.", "09": "ก.ย.", "10": "ต.ค.", "11": "พ.ย.", "12": "ธ.ค."
    };

    let monthlyData = monthlyResult.recordset.map((row) => ({
      month: monthNames[row.month] || row.month,
      amount: Number(row.amount),
    }));
    if (monthlyData.length === 0) {
      monthlyData = [
        { month: "ม.ค.", amount: 26000 }, { month: "ก.พ.", amount: 30000 },
        { month: "มี.ค.", amount: 35500 }, { month: "เม.ย.", amount: 39800 }, { month: "พ.ค.", amount: 42000 },
      ];
    }

    const bestSellersResult = await pool.request()
      .input("merchantId", mssql.UniqueIdentifier, merchantId)
      .query(`
        SELECT TOP 5 p.name, SUM(oi.qty) as total_qty, p.unit_price as price
        FROM dbo.order_items oi
        INNER JOIN dbo.products p ON oi.product_id = p.id
        WHERE oi.merchant_id = @merchantId
        GROUP BY p.name, p.unit_price
        ORDER BY total_qty DESC
      `);

    let bestSellersData = bestSellersResult.recordset.map((row) => ({
      name: row.name, total_qty: Number(row.total_qty), price: Number(row.price),
    }));
    if (bestSellersData.length === 0) {
      bestSellersData = [
        { name: "เสื้อยืดสีขาว Premium", total_qty: 88, price: 199 },
        { name: "กระเป๋าผ้า รักษ์โลก", total_qty: 73, price: 149 },
        { name: "แก้วกาแฟ เซรามิกส์", total_qty: 58, price: 99 },
        { name: "หมวกแก๊ป Minimal", total_qty: 41, price: 250 },
        { name: "สมุดโน้ตปกหนัง", total_qty: 33, price: 120 },
      ];
    }

    return {
      snapshot: {
        total_products: counts.total_products || 0,
        total_stock_qty: counts.total_stock_qty || 0,
        low_stock_count: counts.low_stock_count || 0,
        low_stock_items: lowStockItems,
        total_sales: Number(counts.total_sales ?? 0),
        total_profit: Number(counts.total_profit ?? 0),
      },
      daily: dailyData,
      monthly: monthlyData,
      bestSellers: bestSellersData,
    };
  } catch (err) {
    console.error("getDashboardData failed:", err);
    return {
      snapshot: {
        total_products: 0,
        total_stock_qty: 0,
        low_stock_count: 0,
        low_stock_items: [],
        total_sales: 0,
        total_profit: 0,
      },
      daily: [],
      monthly: [],
      bestSellers: [],
    };
  }
}

// ================================================================
// 7. STOCK MOVEMENTS
// ================================================================

export async function getStockMovements(search = "", type = "All"): Promise<DBStockMovement[]> {
  try {
    const merchantId = await getDemoMerchantId();
    const pool = await getPool();
    const request = pool.request();

    let query = `
      SELECT sm.id, sm.movement_type, sm.qty, sm.reason, sm.ref_type, sm.created_at,
             sm.lot_no, sm.expiry_date, sm.cost_price, sm.note,
             p.sku, p.barcode, p.name as productName,
             s.name as supplierName
      FROM dbo.stock_movements sm
      INNER JOIN dbo.products p ON sm.product_id = p.id
      LEFT JOIN dbo.suppliers s ON sm.supplier_id = s.id
      WHERE sm.merchant_id = @merchantId
    `;

    request.input("merchantId", mssql.UniqueIdentifier, merchantId);

    if (type !== "All") {
      query += " AND sm.movement_type = @type";
      request.input("type", mssql.NVarChar, type);
    }
    if (search.trim()) {
      query += " AND (p.name LIKE @search OR p.sku LIKE @search OR p.barcode LIKE @search OR sm.reason LIKE @search)";
      request.input("search", mssql.NVarChar, `%${search}%`);
    }

    query += " ORDER BY sm.created_at DESC";

    const result = await request.query(query);
    return result.recordset.map((row) => ({
      id: row.id.toString().toLowerCase(),
      sku: row.sku,
      barcode: row.barcode,
      productName: row.productName,
      movementType: row.movement_type,
      qty: Number(row.qty),
      reason: row.reason,
      refType: row.ref_type || "",
      lotNo: row.lot_no ?? null,
      expiryDate: row.expiry_date ? new Date(row.expiry_date).toLocaleDateString("th-TH") : null,
      supplierName: row.supplierName ?? null,
      costPrice: row.cost_price !== null ? Number(row.cost_price) : null,
      note: row.note ?? null,
      createdAt: new Date(row.created_at).toLocaleString("th-TH"),
    }));
  } catch (err) {
    console.error("getStockMovements failed:", err);
    return [];
  }
}

// ================================================================
// 8. ALERTS
// ================================================================

export async function getUnreadAlertCount(): Promise<number> {
  try {
    const merchantId = await getDemoMerchantId();
    const pool = await getPool();
    const result = await pool.request()
      .input("merchantId", mssql.UniqueIdentifier, merchantId)
      .query("SELECT COUNT(*) as cnt FROM dbo.low_stock_alerts WHERE merchant_id = @merchantId AND is_read = 0");
    return result.recordset[0].cnt;
  } catch {
    return 0;
  }
}

export async function getLowStockAlerts() {
  try {
    const merchantId = await getDemoMerchantId();
    const pool = await getPool();
    const result = await pool.request()
      .input("merchantId", mssql.UniqueIdentifier, merchantId)
      .query(`
        SELECT a.id, a.is_read, a.created_at, p.name, p.stock_qty, p.low_stock_threshold, p.id as product_id
        FROM dbo.low_stock_alerts a
        INNER JOIN dbo.products p ON a.product_id = p.id
        WHERE a.merchant_id = @merchantId
        ORDER BY a.is_read ASC, a.created_at DESC
      `);
    return result.recordset.map((row) => ({
      id: row.id.toString(),
      isRead: row.is_read,
      productId: row.product_id.toString(),
      productName: row.name,
      stockQty: Number(row.stock_qty),
      lowStockThreshold: Number(row.low_stock_threshold),
      createdAt: new Date(row.created_at).toLocaleString("th-TH"),
    }));
  } catch {
    return [];
  }
}

export async function markAlertRead(alertId: string): Promise<boolean> {
  try {
    const pool = await getPool();
    await pool.request()
      .input("id", mssql.UniqueIdentifier, alertId)
      .query("UPDATE dbo.low_stock_alerts SET is_read = 1 WHERE id = @id");
    return true;
  } catch {
    return false;
  }
}

export async function markAllAlertsRead(): Promise<boolean> {
  try {
    const merchantId = await getDemoMerchantId();
    const pool = await getPool();
    await pool.request()
      .input("merchantId", mssql.UniqueIdentifier, merchantId)
      .query("UPDATE dbo.low_stock_alerts SET is_read = 1 WHERE merchant_id = @merchantId AND is_read = 0");
    return true;
  } catch {
    return false;
  }
}

export async function getSaleOrders(search = ""): Promise<DBSaleOrder[]> {
  try {
    const merchantId = await getDemoMerchantId();
    const pool = await getPool();
    const request = pool.request();

    let query = `
      SELECT o.id, o.order_no, o.invoice_no, o.created_at, o.status, o.total_amount, o.cost_total, o.note
      FROM dbo.orders o
      WHERE o.merchant_id = @merchantId AND o.order_type = N'sale'
    `;

    request.input("merchantId", mssql.UniqueIdentifier, merchantId);

    if (search.trim()) {
      query += " AND (o.order_no LIKE @search OR o.invoice_no LIKE @search OR o.note LIKE @search)";
      request.input("search", mssql.NVarChar, `%${search}%`);
    }

    query += " ORDER BY o.created_at DESC";

    const result = await request.query(query);
    const saleOrders: DBSaleOrder[] = [];

    for (const row of result.recordset) {
      // Get items for this order
      const itemsResult = await pool.request()
        .input("orderId", mssql.UniqueIdentifier, row.id)
        .query(`
          SELECT oi.qty, oi.unit_price, oi.line_amount, p.name as productName, oi.product_id, oi.cost_price
          FROM dbo.order_items oi
          INNER JOIN dbo.products p ON oi.product_id = p.id
          WHERE oi.order_id = @orderId
        `);

      saleOrders.push({
        id: row.id.toString(),
        orderNo: row.order_no,
        invoiceNo: row.invoice_no,
        createdAt: new Date(row.created_at).toLocaleString("th-TH"),
        status: row.status,
        totalAmount: Number(row.total_amount),
        costTotal: Number(row.cost_total ?? 0),
        note: row.note,
        items: itemsResult.recordset.map((item) => ({
          productId: item.product_id.toString(),
          productName: item.productName,
          qty: Number(item.qty),
          unitPrice: Number(item.unit_price),
          lineAmount: Number(item.line_amount),
          costPrice: Number(item.cost_price ?? 0),
        })),
      });
    }

    return saleOrders;
  } catch (err) {
    console.error("getSaleOrders failed:", err);
    return [];
  }
}

export async function returnOrder(
  orderId: string,
  items: { productId: string; qty: number; unitPrice: number; costPrice: number }[],
  note?: string,
  createdBy = "system"
): Promise<{ success: boolean; error?: string }> {
  try {
    const merchantId = await getDemoMerchantId();
    const pool = await getPool();
    const transaction = new mssql.Transaction(pool);
    await transaction.begin();

    try {
      // 1. Update order status to N'Returned'
      await transaction.request()
        .input("orderId", mssql.UniqueIdentifier, orderId)
        .input("merchantId", mssql.UniqueIdentifier, merchantId)
        .input("status", mssql.NVarChar, "Returned")
        .query("UPDATE dbo.orders SET status = @status, updated_at = SYSUTCDATETIME() WHERE id = @orderId AND merchant_id = @merchantId");

      // 2. Loop and return each item stock and add movement
      for (const item of items) {
        if (item.qty <= 0) continue;

        // Increase stock
        await transaction.request()
          .input("productId", mssql.UniqueIdentifier, item.productId)
          .input("merchantId", mssql.UniqueIdentifier, merchantId)
          .input("qty", mssql.Int, item.qty)
          .query(`
            UPDATE dbo.products
            SET stock_qty = stock_qty + @qty, updated_at = SYSUTCDATETIME()
            WHERE id = @productId AND merchant_id = @merchantId
          `);

        // Record stock movement (movement_type = N'Return')
        await transaction.request()
          .input("merchantId", mssql.UniqueIdentifier, merchantId)
          .input("productId", mssql.UniqueIdentifier, item.productId)
          .input("qty", mssql.Int, item.qty)
          .input("orderId", mssql.UniqueIdentifier, orderId)
          .input("note", mssql.NVarChar, note || "คืนสินค้าจากบิล")
          .input("createdBy", mssql.NVarChar, createdBy)
          .query(`
            INSERT INTO dbo.stock_movements (merchant_id, product_id, movement_type, qty, reason, ref_type, ref_id, note, created_by)
            VALUES (@merchantId, @productId, N'Return', @qty, N'return', N'order', @orderId, @note, @createdBy)
          `);
      }

      await transaction.commit();
      return { success: true };
    } catch (err) {
      await transaction.rollback();
      throw err;
    }
  } catch (err) {
    console.error("returnOrder failed:", err);
    return { success: false, error: "เกิดข้อผิดพลาดในการคืนสินค้า" };
  }
}

export async function getInventoryReport(): Promise<DBProduct[]> {
  return getProducts("", undefined, "all");
}

export async function getProfitReport(): Promise<DBProfitReportRow[]> {
  try {
    const merchantId = await getDemoMerchantId();
    const pool = await getPool();
    const result = await pool.request()
      .input("merchantId", mssql.UniqueIdentifier, merchantId)
      .query(`
        SELECT p.sku, p.name as productName, SUM(oi.qty) as qty_sold,
               SUM(oi.line_amount) as sales_total,
               SUM(oi.cost_price * oi.qty) as cost_total,
               SUM(oi.line_amount - (oi.cost_price * oi.qty)) as profit
        FROM dbo.order_items oi
        INNER JOIN dbo.products p ON oi.product_id = p.id
        INNER JOIN dbo.orders o ON oi.order_id = o.id
        WHERE o.merchant_id = @merchantId AND o.order_type = N'sale' AND o.status != N'Cancelled'
        GROUP BY p.sku, p.name
        ORDER BY profit DESC
      `);
    return result.recordset.map((row) => ({
      sku: row.sku,
      productName: row.productName,
      qtySold: Number(row.qty_sold),
      salesTotal: Number(row.sales_total),
      costTotal: Number(row.cost_total),
      profit: Number(row.profit),
    }));
  } catch (err) {
    console.error("getProfitReport failed:", err);
    return [];
  }
}

export async function getSlowMovingItems(days = 30): Promise<DBSlowMovingRow[]> {
  try {
    const merchantId = await getDemoMerchantId();
    const pool = await getPool();
    const result = await pool.request()
      .input("merchantId", mssql.UniqueIdentifier, merchantId)
      .input("days", mssql.Int, days)
      .query(`
        SELECT p.id, p.sku, p.name, p.stock_qty, p.unit, p.unit_price, p.cost_price,
               MAX(sm.created_at) as last_movement
        FROM dbo.products p
        LEFT JOIN dbo.stock_movements sm ON sm.product_id = p.id AND sm.merchant_id = @merchantId
        WHERE p.merchant_id = @merchantId AND p.is_active = 1 AND p.status = N'active'
        GROUP BY p.id, p.sku, p.name, p.stock_qty, p.unit, p.unit_price, p.cost_price
        HAVING MAX(sm.created_at) IS NULL OR MAX(sm.created_at) < DATEADD(day, -@days, SYSUTCDATETIME())
        ORDER BY last_movement ASC, p.stock_qty DESC
      `);
    return result.recordset.map((row) => ({
      id: row.id.toString(),
      sku: row.sku,
      name: row.name,
      stockQty: Number(row.stock_qty),
      unit: row.unit ?? "ชิ้น",
      unitPrice: Number(row.unit_price),
      costPrice: Number(row.cost_price ?? 0),
      lastMovement: row.last_movement ? new Date(row.last_movement).toLocaleDateString("th-TH") : null,
    }));
  } catch (err) {
    console.error("getSlowMovingItems failed:", err);
    return [];
  }
}

export async function getExpiringItems(daysAhead = 30): Promise<DBExpiringRow[]> {
  try {
    const merchantId = await getDemoMerchantId();
    const pool = await getPool();
    const result = await pool.request()
      .input("merchantId", mssql.UniqueIdentifier, merchantId)
      .input("daysAhead", mssql.Int, daysAhead)
      .query(`
        SELECT sm.lot_no, sm.expiry_date, p.sku, p.name as productName, sm.qty, s.name as supplierName
        FROM dbo.stock_movements sm
        INNER JOIN dbo.products p ON sm.product_id = p.id
        LEFT JOIN dbo.suppliers s ON sm.supplier_id = s.id
        WHERE sm.merchant_id = @merchantId AND sm.movement_type = N'In' AND sm.expiry_date IS NOT NULL 
          AND sm.expiry_date >= CAST(SYSUTCDATETIME() AS DATE)
          AND sm.expiry_date <= DATEADD(day, @daysAhead, SYSUTCDATETIME())
        ORDER BY sm.expiry_date ASC
      `);
    return result.recordset.map((row) => ({
      lotNo: row.lot_no,
      expiryDate: new Date(row.expiry_date).toLocaleDateString("th-TH"),
      sku: row.sku,
      productName: row.productName,
      qty: Number(row.qty),
      supplierName: row.supplierName,
    }));
  } catch (err) {
    console.error("getExpiringItems failed:", err);
    return [];
  }
}

export async function getAlerts(): Promise<DBAlert[]> {
  try {
    const merchantId = await getDemoMerchantId();
    const pool = await getPool();

    // 1. Fetch low stock alerts
    const lowStockResult = await pool.request()
      .input("merchantId", mssql.UniqueIdentifier, merchantId)
      .query(`
        SELECT a.id, p.id as product_id, p.name, p.stock_qty, p.low_stock_threshold, a.is_read, a.created_at, p.unit
        FROM dbo.low_stock_alerts a
        INNER JOIN dbo.products p ON a.product_id = p.id
        WHERE a.merchant_id = @merchantId
      `);

    const alerts: DBAlert[] = lowStockResult.recordset.map((row) => ({
      id: row.id.toString(),
      type: "low_stock",
      productId: row.product_id.toString(),
      productName: row.name,
      message: `สินค้า "${row.name}" สต็อกต่ำกว่าเกณฑ์ (${row.stock_qty} / ${row.low_stock_threshold} ${row.unit || "ชิ้น"})`,
      isRead: row.is_read,
      createdAt: new Date(row.created_at).toLocaleString("th-TH"),
    }));

    // 2. Fetch expiring lots (within 30 days) and simulate as alerts
    const expiringResult = await pool.request()
      .input("merchantId", mssql.UniqueIdentifier, merchantId)
      .query(`
        SELECT sm.lot_no, sm.expiry_date, p.id as product_id, p.name, sm.qty
        FROM dbo.stock_movements sm
        INNER JOIN dbo.products p ON sm.product_id = p.id
        WHERE sm.merchant_id = @merchantId AND sm.movement_type = N'In' 
          AND sm.expiry_date IS NOT NULL 
          AND sm.expiry_date >= CAST(SYSUTCDATETIME() AS DATE)
          AND sm.expiry_date <= DATEADD(day, 30, SYSUTCDATETIME())
      `);

    expiringResult.recordset.forEach((row, idx) => {
      alerts.push({
        id: `expiry-${idx}-${row.lot_no || "no-lot"}`,
        type: "expiry",
        productId: row.product_id.toString(),
        productName: row.name,
        message: `สินค้า "${row.name}" Lot ${row.lot_no || "-"} ใกล้หมดอายุวันที่ ${new Date(row.expiry_date).toLocaleDateString("th-TH")}`,
        isRead: false,
        createdAt: new Date().toLocaleString("th-TH"),
      });
    });

    // Sort by type (low stock first, then read status, then newest)
    return alerts.sort((a, b) => {
      if (a.isRead !== b.isRead) return a.isRead ? 1 : -1;
      return b.createdAt.localeCompare(a.createdAt);
    });
  } catch (err) {
    console.error("getAlerts failed:", err);
    return [];
  }
}

export async function importProducts(
  items: {
    sku: string;
    barcode: string;
    name: string;
    unitPrice: number;
    costPrice: number;
    stockQty: number;
    lowStockThreshold: number;
    unit: string;
    notes: string;
  }[]
): Promise<{ success: boolean; importedCount: number; error?: string }> {
  try {
    const merchantId = await getDemoMerchantId();
    const pool = await getPool();

    let count = 0;
    for (const item of items) {
      if (!item.sku || !item.name) continue;

      // Check if SKU exists
      const checkResult = await pool.request()
        .input("merchantId", mssql.UniqueIdentifier, merchantId)
        .input("sku", mssql.NVarChar, item.sku.trim())
        .query("SELECT id FROM dbo.products WHERE merchant_id = @merchantId AND sku = @sku AND is_active = 1");

      if (checkResult.recordset.length > 0) {
        // Update existing product
        const productId = checkResult.recordset[0].id;
        await pool.request()
          .input("id", mssql.UniqueIdentifier, productId)
          .input("merchantId", mssql.UniqueIdentifier, merchantId)
          .input("name", mssql.NVarChar, item.name.trim())
          .input("barcode", mssql.NVarChar, item.barcode?.trim() || "")
          .input("unitPrice", mssql.Decimal(18, 2), item.unitPrice)
          .input("costPrice", mssql.Decimal(18, 2), item.costPrice)
          .input("lowStockThreshold", mssql.Int, item.lowStockThreshold)
          .input("unit", mssql.NVarChar, item.unit || "ชิ้น")
          .input("notes", mssql.NVarChar, item.notes || "")
          .query(`
            UPDATE dbo.products
            SET name = @name, barcode = @barcode, unit_price = @unitPrice,
                cost_price = @costPrice, low_stock_threshold = @lowStockThreshold,
                unit = @unit, notes = @notes, updated_at = SYSUTCDATETIME()
            WHERE id = @id AND merchant_id = @merchantId
          `);
      } else {
        // Insert new product
        const barcodeVal = item.barcode?.trim() || `885${Math.floor(1000000000 + Math.random() * 9000000000)}`;
        await pool.request()
          .input("merchantId", mssql.UniqueIdentifier, merchantId)
          .input("sku", mssql.NVarChar, item.sku.trim())
          .input("barcode", mssql.NVarChar, barcodeVal)
          .input("name", mssql.NVarChar, item.name.trim())
          .input("unitPrice", mssql.Decimal(18, 2), item.unitPrice)
          .input("costPrice", mssql.Decimal(18, 2), item.costPrice)
          .input("stockQty", mssql.Int, item.stockQty)
          .input("lowStockThreshold", mssql.Int, item.lowStockThreshold)
          .input("unit", mssql.NVarChar, item.unit || "ชิ้น")
          .input("notes", mssql.NVarChar, item.notes || "")
          .query(`
            INSERT INTO dbo.products
              (merchant_id, sku, barcode, name, unit_price, cost_price, stock_qty, low_stock_threshold, unit, notes, is_active, status)
            VALUES
              (@merchantId, @sku, @barcode, @name, @unitPrice, @costPrice, @stockQty, @lowStockThreshold, @unit, @notes, 1, N'active')
          `);
      }
      count++;
    }

    return { success: true, importedCount: count };
  } catch (err) {
    console.error("importProducts failed:", err);
    return { success: false, importedCount: 0, error: "เกิดข้อผิดพลาดในการประมวลผลข้อมูลนำเข้า" };
  }
}

// ================================================================
// PRODUCT VARIANTS ACTIONS (Phase 3)
// ================================================================

export async function getProductVariants(productId: string): Promise<DBProductVariant[]> {
  try {
    const merchantId = await getDemoMerchantId();
    const pool = await getPool();
    const result = await pool.request()
      .input("productId", mssql.UniqueIdentifier, productId)
      .input("merchantId", mssql.UniqueIdentifier, merchantId)
      .query(`
        SELECT id, product_id, sku, barcode, name, cost_price, unit_price, stock_qty, low_stock_threshold
        FROM dbo.product_variants
        WHERE product_id = @productId AND merchant_id = @merchantId AND is_active = 1
        ORDER BY name ASC
      `);

    return result.recordset.map((row) => ({
      id: row.id.toString(),
      productId: row.product_id.toString(),
      sku: row.sku,
      barcode: row.barcode,
      name: row.name,
      costPrice: Number(row.cost_price),
      unitPrice: Number(row.unit_price),
      stockQty: Number(row.stock_qty),
      lowStockThreshold: Number(row.low_stock_threshold),
    }));
  } catch (err) {
    console.error("getProductVariants failed:", err);
    return [];
  }
}

export async function checkVariantSkuExists(sku: string): Promise<boolean> {
  try {
    const merchantId = await getDemoMerchantId();
    const pool = await getPool();
    const result = await pool.request()
      .input("sku", mssql.NVarChar, sku.trim())
      .input("merchantId", mssql.UniqueIdentifier, merchantId)
      .query(`
        SELECT COUNT(*) as cnt 
        FROM (
          SELECT sku FROM dbo.products WHERE merchant_id = @merchantId AND is_active = 1
          UNION ALL
          SELECT sku FROM dbo.product_variants WHERE merchant_id = @merchantId AND is_active = 1
        ) as combined_skus
        WHERE LOWER(sku) = LOWER(@sku)
      `);
    return result.recordset[0].cnt > 0;
  } catch {
    return false;
  }
}

export async function createProductVariant(variant: {
  productId: string;
  sku: string;
  barcode: string;
  name: string;
  costPrice: number;
  unitPrice: number;
  stockQty: number;
  lowStockThreshold: number;
}): Promise<boolean> {
  try {
    const merchantId = await getDemoMerchantId();
    const pool = await getPool();

    await pool.request()
      .input("merchantId", mssql.UniqueIdentifier, merchantId)
      .input("productId", mssql.UniqueIdentifier, variant.productId)
      .input("sku", mssql.NVarChar, variant.sku.trim())
      .input("barcode", mssql.NVarChar, variant.barcode.trim() || null)
      .input("name", mssql.NVarChar, variant.name.trim())
      .input("costPrice", mssql.Decimal(18, 2), variant.costPrice)
      .input("unitPrice", mssql.Decimal(18, 2), variant.unitPrice)
      .input("stockQty", mssql.Int, variant.stockQty)
      .input("lowStockThreshold", mssql.Int, variant.lowStockThreshold)
      .query(`
        INSERT INTO dbo.product_variants
          (merchant_id, product_id, sku, barcode, name, cost_price, unit_price, stock_qty, low_stock_threshold, is_active)
        VALUES
          (@merchantId, @productId, @sku, @barcode, @name, @costPrice, @unitPrice, @stockQty, @lowStockThreshold, 1)
      `);

    return true;
  } catch (err) {
    console.error("createProductVariant failed:", err);
    return false;
  }
}

export async function updateProductVariant(
  id: string,
  variant: Partial<{
    name: string;
    sku: string;
    barcode: string;
    costPrice: number;
    unitPrice: number;
    stockQty: number;
    lowStockThreshold: number;
  }>
): Promise<boolean> {
  try {
    const merchantId = await getDemoMerchantId();
    const pool = await getPool();
    const request = pool.request()
      .input("id", mssql.UniqueIdentifier, id)
      .input("merchantId", mssql.UniqueIdentifier, merchantId);

    let setClause: string[] = [];
    if (variant.name !== undefined) {
      setClause.push("name = @name");
      request.input("name", mssql.NVarChar, variant.name.trim());
    }
    if (variant.sku !== undefined) {
      setClause.push("sku = @sku");
      request.input("sku", mssql.NVarChar, variant.sku.trim());
    }
    if (variant.barcode !== undefined) {
      setClause.push("barcode = @barcode");
      request.input("barcode", mssql.NVarChar, variant.barcode.trim() || null);
    }
    if (variant.costPrice !== undefined) {
      setClause.push("cost_price = @costPrice");
      request.input("costPrice", mssql.Decimal(18, 2), variant.costPrice);
    }
    if (variant.unitPrice !== undefined) {
      setClause.push("unit_price = @unitPrice");
      request.input("unitPrice", mssql.Decimal(18, 2), variant.unitPrice);
    }
    if (variant.stockQty !== undefined) {
      setClause.push("stock_qty = @stockQty");
      request.input("stockQty", mssql.Int, variant.stockQty);
    }
    if (variant.lowStockThreshold !== undefined) {
      setClause.push("low_stock_threshold = @lowStockThreshold");
      request.input("lowStockThreshold", mssql.Int, variant.lowStockThreshold);
    }

    if (setClause.length === 0) return true;

    await request.query(`
      UPDATE dbo.product_variants
      SET ${setClause.join(", ")}
      WHERE id = @id AND merchant_id = @merchantId
    `);

    return true;
  } catch (err) {
    console.error("updateProductVariant failed:", err);
    return false;
  }
}

export async function deleteProductVariant(id: string): Promise<boolean> {
  try {
    const merchantId = await getDemoMerchantId();
    const pool = await getPool();
    await pool.request()
      .input("id", mssql.UniqueIdentifier, id)
      .input("merchantId", mssql.UniqueIdentifier, merchantId)
      .query(`
        UPDATE dbo.product_variants
        SET is_active = 0
        WHERE id = @id AND merchant_id = @merchantId
      `);
    return true;
  } catch (err) {
    console.error("deleteProductVariant failed:", err);
    return false;
  }
}

// ================================================================
// PRODUCT BUNDLES ACTIONS (Phase 3)
// ================================================================

export async function getBundleComponents(bundleId: string): Promise<DBBundleComponent[]> {
  try {
    const pool = await getPool();
    const result = await pool.request()
      .input("bundleId", mssql.UniqueIdentifier, bundleId)
      .query(`
        SELECT pb.id, pb.component_id, pb.qty_required, comp.name, comp.sku, comp.stock_qty
        FROM dbo.product_bundles pb
        INNER JOIN dbo.products comp ON pb.component_id = comp.id
        WHERE pb.bundle_id = @bundleId AND comp.is_active = 1
      `);

    return result.recordset.map((row) => ({
      id: row.id.toString(),
      componentId: row.component_id.toString(),
      name: row.name,
      sku: row.sku,
      qtyRequired: Number(row.qty_required),
      stockQty: Number(row.stock_qty),
    }));
  } catch (err) {
    console.error("getBundleComponents failed:", err);
    return [];
  }
}

export async function saveBundleComponents(
  bundleId: string,
  components: { componentId: string; qtyRequired: number }[]
): Promise<boolean> {
  try {
    const pool = await getPool();
    const transaction = new mssql.Transaction(pool);
    await transaction.begin();

    try {
      await transaction.request()
        .input("bundleId", mssql.UniqueIdentifier, bundleId)
        .query("DELETE FROM dbo.product_bundles WHERE bundle_id = @bundleId");

      for (const comp of components) {
        await transaction.request()
          .input("bundleId", mssql.UniqueIdentifier, bundleId)
          .input("componentId", mssql.UniqueIdentifier, comp.componentId)
          .input("qtyRequired", mssql.Int, comp.qtyRequired)
          .query(`
            INSERT INTO dbo.product_bundles (bundle_id, component_id, qty_required)
            VALUES (@bundleId, @componentId, @qtyRequired)
          `);
      }

      await transaction.commit();
      return true;
    } catch (err) {
      await transaction.rollback();
      throw err;
    }
  } catch (err) {
    console.error("saveBundleComponents failed:", err);
    return false;
  }
}

export async function findProductOrVariantByBarcode(code: string): Promise<{
  product: DBProduct;
  variant: DBProductVariant | null;
} | null> {
  try {
    const merchantId = await getDemoMerchantId();
    const pool = await getPool();
    const cleanCode = code.trim();
    if (!cleanCode) return null;

    // 1. Search in variants first
    const variantResult = await pool.request()
      .input("merchantId", mssql.UniqueIdentifier, merchantId)
      .input("code", mssql.NVarChar, cleanCode)
      .query(`
        SELECT id, product_id, sku, barcode, name, cost_price, unit_price, stock_qty, low_stock_threshold
        FROM dbo.product_variants
        WHERE merchant_id = @merchantId AND is_active = 1 AND (barcode = @code OR sku = @code)
      `);

    let targetProductId: string | null = null;
    let foundVariant: DBProductVariant | null = null;

    if (variantResult.recordset.length > 0) {
      const row = variantResult.recordset[0];
      foundVariant = {
        id: row.id.toString(),
        productId: row.product_id.toString(),
        sku: row.sku,
        barcode: row.barcode,
        name: row.name,
        costPrice: Number(row.cost_price),
        unitPrice: Number(row.unit_price),
        stockQty: Number(row.stock_qty),
        lowStockThreshold: Number(row.low_stock_threshold),
      };
      targetProductId = foundVariant.productId;
    }

    // 2. Query products table for parent product or standard product matching barcode/SKU
    const productRequest = pool.request()
      .input("merchantId", mssql.UniqueIdentifier, merchantId);

    let productQuery = `
      SELECT p.id, p.sku, p.barcode, p.name, p.unit_price, p.cost_price, p.unit, p.notes, p.status, p.category_id, p.image_url,
             p.product_type, p.low_stock_threshold,
             c.name as category_name,
             CASE
               WHEN p.product_type = N'bundle' THEN
                 COALESCE((
                   SELECT MIN(comp.stock_qty / pb.qty_required)
                   FROM dbo.product_bundles pb
                   INNER JOIN dbo.products comp ON pb.component_id = comp.id
                   WHERE pb.bundle_id = p.id AND comp.is_active = 1
                 ), 0)
               WHEN (SELECT COUNT(*) FROM dbo.product_variants pv WHERE pv.product_id = p.id AND pv.is_active = 1) > 0 THEN
                 COALESCE((SELECT SUM(stock_qty) FROM dbo.product_variants pv WHERE pv.product_id = p.id AND pv.is_active = 1), 0)
               ELSE
                 p.stock_qty
             END as calculated_stock_qty
      FROM dbo.products p
      LEFT JOIN dbo.categories c ON p.category_id = c.id
      WHERE p.merchant_id = @merchantId AND p.is_active = 1
    `;

    if (targetProductId) {
      productQuery += ` AND p.id = @targetProductId`;
      productRequest.input("targetProductId", mssql.UniqueIdentifier, targetProductId);
    } else {
      productQuery += ` AND (p.barcode = @code OR p.sku = @code)`;
      productRequest.input("code", mssql.NVarChar, cleanCode);
    }

    const productResult = await productRequest.query(productQuery);

    if (productResult.recordset.length === 0) {
      return null;
    }

    const pRow = productResult.recordset[0];
    const foundProduct: DBProduct = {
      id: pRow.id.toString(),
      sku: pRow.sku,
      barcode: pRow.barcode,
      name: pRow.name,
      unitPrice: Number(pRow.unit_price),
      costPrice: Number(pRow.cost_price ?? 0),
      stockQty: Number(pRow.calculated_stock_qty),
      lowStockThreshold: Number(pRow.low_stock_threshold),
      unit: pRow.unit ?? "ชิ้น",
      notes: pRow.notes ?? "",
      status: pRow.status ?? "active",
      categoryId: pRow.category_id?.toString() ?? null,
      categoryName: pRow.category_name ?? null,
      imageUrl: pRow.image_url ?? null,
      productType: pRow.product_type ?? "standard",
    };

    return {
      product: foundProduct,
      variant: foundVariant,
    };
  } catch (err) {
    console.error("findProductOrVariantByBarcode failed:", err);
    return null;
  }
}

