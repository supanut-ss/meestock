-- =============================================================
-- MeeStock v2 — Database Migration Script
-- Phase 1: Core Foundation
-- รัน script นี้บน SQL Server database: thaipes_meestock
-- ปลอดภัย: ใช้ ALTER TABLE ไม่ recreate — ข้อมูลเดิมไม่หาย
-- =============================================================

USE thaipes_meestock;
GO

-- =============================================================
-- SECTION 1: เพิ่มตาราง categories (2-level tree)
-- =============================================================
IF OBJECT_ID('dbo.categories', 'U') IS NULL
BEGIN
    CREATE TABLE dbo.categories (
        id          UNIQUEIDENTIFIER NOT NULL PRIMARY KEY DEFAULT NEWID(),
        merchant_id UNIQUEIDENTIFIER NOT NULL,
        parent_id   UNIQUEIDENTIFIER NULL,
        name        NVARCHAR(100)    NOT NULL,
        code        NVARCHAR(20)     NULL,
        color       NVARCHAR(10)     NULL DEFAULT N'#6366f1',
        sort_order  INT              NOT NULL DEFAULT 0,
        is_active   BIT              NOT NULL DEFAULT 1,
        created_at  DATETIME2        NOT NULL DEFAULT SYSUTCDATETIME(),
        CONSTRAINT fk_categories_merchant FOREIGN KEY (merchant_id) REFERENCES dbo.merchants(id),
        CONSTRAINT fk_categories_parent FOREIGN KEY (parent_id) REFERENCES dbo.categories(id)
    );
    PRINT 'Created table: dbo.categories';
END
GO

-- =============================================================
-- SECTION 2: เพิ่ม columns ใหม่ใน dbo.products
-- =============================================================

-- category_id
IF COL_LENGTH('dbo.products', 'category_id') IS NULL
BEGIN
    ALTER TABLE dbo.products ADD category_id UNIQUEIDENTIFIER NULL;
    PRINT 'Added column: products.category_id';
END
GO

-- cost_price (ราคาทุน — เห็นเฉพาะ Admin)
IF COL_LENGTH('dbo.products', 'cost_price') IS NULL
BEGIN
    ALTER TABLE dbo.products ADD cost_price DECIMAL(18,2) NOT NULL DEFAULT 0;
    PRINT 'Added column: products.cost_price';
END
GO

-- image_url
IF COL_LENGTH('dbo.products', 'image_url') IS NULL
BEGIN
    ALTER TABLE dbo.products ADD image_url NVARCHAR(500) NULL;
    PRINT 'Added column: products.image_url';
END
GO

-- unit (หน่วยนับ เช่น ชิ้น, กล่อง, โหล)
IF COL_LENGTH('dbo.products', 'unit') IS NULL
BEGIN
    ALTER TABLE dbo.products ADD unit NVARCHAR(50) NOT NULL DEFAULT N'ชิ้น';
    PRINT 'Added column: products.unit';
END
GO

-- notes (หมายเหตุ free-text)
IF COL_LENGTH('dbo.products', 'notes') IS NULL
BEGIN
    ALTER TABLE dbo.products ADD notes NVARCHAR(1000) NULL;
    PRINT 'Added column: products.notes';
END
GO

-- status: active / inactive / discontinued (แทน is_active เดิม)
IF COL_LENGTH('dbo.products', 'status') IS NULL
BEGIN
    ALTER TABLE dbo.products ADD status NVARCHAR(20) NOT NULL DEFAULT N'active';
    -- migrate ข้อมูลเก่า is_active → status
    UPDATE dbo.products SET status = CASE WHEN is_active = 1 THEN N'active' ELSE N'inactive' END;
    PRINT 'Added column: products.status (migrated from is_active)';
END
GO

-- updated_at — ติดตาม last modified
IF COL_LENGTH('dbo.products', 'updated_at') IS NULL
BEGIN
    ALTER TABLE dbo.products ADD updated_at DATETIME2 NULL;
    PRINT 'Added column: products.updated_at';
END
GO

-- เพิ่ม Foreign Key ให้ category_id (หลังจาก categories table ถูกสร้างแล้ว)
IF NOT EXISTS (
    SELECT 1 FROM sys.foreign_keys WHERE name = 'fk_products_category'
)
BEGIN
    ALTER TABLE dbo.products ADD CONSTRAINT fk_products_category
        FOREIGN KEY (category_id) REFERENCES dbo.categories(id);
    PRINT 'Added FK: products.category_id → categories.id';
END
GO

-- =============================================================
-- SECTION 3: ตาราง product_barcodes (1 สินค้า หลาย barcode)
-- =============================================================
IF OBJECT_ID('dbo.product_barcodes', 'U') IS NULL
BEGIN
    CREATE TABLE dbo.product_barcodes (
        id          UNIQUEIDENTIFIER NOT NULL PRIMARY KEY DEFAULT NEWID(),
        merchant_id UNIQUEIDENTIFIER NOT NULL,
        product_id  UNIQUEIDENTIFIER NOT NULL,
        barcode     NVARCHAR(50)     NOT NULL,
        label       NVARCHAR(50)     NULL, -- เช่น "กล่อง", "ชิ้น"
        is_primary  BIT              NOT NULL DEFAULT 0,
        created_at  DATETIME2        NOT NULL DEFAULT SYSUTCDATETIME(),
        CONSTRAINT fk_pb_product FOREIGN KEY (product_id) REFERENCES dbo.products(id) ON DELETE CASCADE,
        CONSTRAINT uq_product_barcodes_barcode UNIQUE (merchant_id, barcode)
    );
    CREATE INDEX ix_product_barcodes_product ON dbo.product_barcodes(product_id);
    PRINT 'Created table: dbo.product_barcodes';
END
GO

-- =============================================================
-- SECTION 4: ตาราง suppliers
-- =============================================================
IF OBJECT_ID('dbo.suppliers', 'U') IS NULL
BEGIN
    CREATE TABLE dbo.suppliers (
        id          UNIQUEIDENTIFIER NOT NULL PRIMARY KEY DEFAULT NEWID(),
        merchant_id UNIQUEIDENTIFIER NOT NULL,
        name        NVARCHAR(150)    NOT NULL,
        contact_name NVARCHAR(100)  NULL,
        phone       NVARCHAR(20)     NULL,
        email       NVARCHAR(150)    NULL,
        address     NVARCHAR(500)    NULL,
        notes       NVARCHAR(500)    NULL,
        is_active   BIT              NOT NULL DEFAULT 1,
        created_at  DATETIME2        NOT NULL DEFAULT SYSUTCDATETIME(),
        CONSTRAINT fk_suppliers_merchant FOREIGN KEY (merchant_id) REFERENCES dbo.merchants(id)
    );
    PRINT 'Created table: dbo.suppliers';
END
GO

-- =============================================================
-- SECTION 5: เพิ่ม columns ใน dbo.stock_movements
-- =============================================================

-- lot_no
IF COL_LENGTH('dbo.stock_movements', 'lot_no') IS NULL
BEGIN
    ALTER TABLE dbo.stock_movements ADD lot_no NVARCHAR(50) NULL;
    PRINT 'Added column: stock_movements.lot_no';
END
GO

-- expiry_date
IF COL_LENGTH('dbo.stock_movements', 'expiry_date') IS NULL
BEGIN
    ALTER TABLE dbo.stock_movements ADD expiry_date DATE NULL;
    PRINT 'Added column: stock_movements.expiry_date';
END
GO

-- supplier_id
IF COL_LENGTH('dbo.stock_movements', 'supplier_id') IS NULL
BEGIN
    ALTER TABLE dbo.stock_movements ADD supplier_id UNIQUEIDENTIFIER NULL;
    PRINT 'Added column: stock_movements.supplier_id';
END
GO

-- cost_price (snapshot ราคาทุน ณ เวลานำเข้า)
IF COL_LENGTH('dbo.stock_movements', 'cost_price') IS NULL
BEGIN
    ALTER TABLE dbo.stock_movements ADD cost_price DECIMAL(18,2) NULL;
    PRINT 'Added column: stock_movements.cost_price';
END
GO

-- note
IF COL_LENGTH('dbo.stock_movements', 'note') IS NULL
BEGIN
    ALTER TABLE dbo.stock_movements ADD note NVARCHAR(500) NULL;
    PRINT 'Added column: stock_movements.note';
END
GO

-- created_by (ผู้บันทึก)
IF COL_LENGTH('dbo.stock_movements', 'created_by') IS NULL
BEGIN
    ALTER TABLE dbo.stock_movements ADD created_by NVARCHAR(150) NULL DEFAULT N'system';
    PRINT 'Added column: stock_movements.created_by';
END
GO

-- เพิ่ม FK supplier_id → suppliers
IF NOT EXISTS (
    SELECT 1 FROM sys.foreign_keys WHERE name = 'fk_stock_movements_supplier'
)
BEGIN
    ALTER TABLE dbo.stock_movements ADD CONSTRAINT fk_stock_movements_supplier
        FOREIGN KEY (supplier_id) REFERENCES dbo.suppliers(id);
    PRINT 'Added FK: stock_movements.supplier_id → suppliers.id';
END
GO

-- =============================================================
-- SECTION 6: ตาราง product_audit_log (Audit Trail)
-- =============================================================
IF OBJECT_ID('dbo.product_audit_log', 'U') IS NULL
BEGIN
    CREATE TABLE dbo.product_audit_log (
        id           UNIQUEIDENTIFIER NOT NULL PRIMARY KEY DEFAULT NEWID(),
        merchant_id  UNIQUEIDENTIFIER NOT NULL,
        product_id   UNIQUEIDENTIFIER NOT NULL,
        action       NVARCHAR(50)     NOT NULL, -- created/updated/status_changed/price_changed/deleted
        field_name   NVARCHAR(100)    NULL,
        value_before NVARCHAR(MAX)    NULL,
        value_after  NVARCHAR(MAX)    NULL,
        changed_by   NVARCHAR(150)    NOT NULL DEFAULT N'system',
        created_at   DATETIME2        NOT NULL DEFAULT SYSUTCDATETIME(),
        CONSTRAINT fk_audit_log_product FOREIGN KEY (product_id) REFERENCES dbo.products(id)
    );
    CREATE INDEX ix_product_audit_log_product ON dbo.product_audit_log(product_id, created_at DESC);
    PRINT 'Created table: dbo.product_audit_log';
END
GO

-- =============================================================
-- SECTION 7: ตาราง product_bundles (Bundle/Set สินค้า — Phase 3)
-- =============================================================
IF OBJECT_ID('dbo.product_bundles', 'U') IS NULL
BEGIN
    CREATE TABLE dbo.product_bundles (
        id           UNIQUEIDENTIFIER NOT NULL PRIMARY KEY DEFAULT NEWID(),
        bundle_id    UNIQUEIDENTIFIER NOT NULL,   -- product ที่เป็น bundle
        component_id UNIQUEIDENTIFIER NOT NULL,   -- product ที่เป็น component
        qty_required INT              NOT NULL DEFAULT 1,
        CONSTRAINT fk_bundle_parent FOREIGN KEY (bundle_id) REFERENCES dbo.products(id),
        CONSTRAINT fk_bundle_component FOREIGN KEY (component_id) REFERENCES dbo.products(id),
        CONSTRAINT uq_bundle_component UNIQUE (bundle_id, component_id)
    );
    PRINT 'Created table: dbo.product_bundles';
END
GO

-- =============================================================
-- SECTION 8: เพิ่ม columns ใน dbo.orders สำหรับ Sale flow
-- =============================================================

-- invoice_no (เลขที่ใบเสร็จ)
IF COL_LENGTH('dbo.orders', 'invoice_no') IS NULL
BEGIN
    ALTER TABLE dbo.orders ADD invoice_no NVARCHAR(50) NULL;
    PRINT 'Added column: orders.invoice_no';
END
GO

-- order_type: sale / return / shipment
IF COL_LENGTH('dbo.orders', 'order_type') IS NULL
BEGIN
    ALTER TABLE dbo.orders ADD order_type NVARCHAR(20) NOT NULL DEFAULT N'shipment';
    PRINT 'Added column: orders.order_type';
END
GO

-- note
IF COL_LENGTH('dbo.orders', 'note') IS NULL
BEGIN
    ALTER TABLE dbo.orders ADD note NVARCHAR(500) NULL;
    PRINT 'Added column: orders.note';
END
GO

-- discount_amount
IF COL_LENGTH('dbo.orders', 'discount_amount') IS NULL
BEGIN
    ALTER TABLE dbo.orders ADD discount_amount DECIMAL(18,2) NOT NULL DEFAULT 0;
    PRINT 'Added column: orders.discount_amount';
END
GO

-- cost_total (ราคาทุนรวมของ order นี้ สำหรับคำนวณกำไร)
IF COL_LENGTH('dbo.orders', 'cost_total') IS NULL
BEGIN
    ALTER TABLE dbo.orders ADD cost_total DECIMAL(18,2) NOT NULL DEFAULT 0;
    PRINT 'Added column: orders.cost_total';
END
GO

-- created_by
IF COL_LENGTH('dbo.orders', 'created_by') IS NULL
BEGIN
    ALTER TABLE dbo.orders ADD created_by NVARCHAR(150) NULL DEFAULT N'system';
    PRINT 'Added column: orders.created_by';
END
GO

-- =============================================================
-- SECTION 9: เพิ่ม columns ใน dbo.order_items
-- =============================================================

-- cost_price (snapshot ราคาทุน ณ วันขาย)
IF COL_LENGTH('dbo.order_items', 'cost_price') IS NULL
BEGIN
    ALTER TABLE dbo.order_items ADD cost_price DECIMAL(18,2) NOT NULL DEFAULT 0;
    PRINT 'Added column: order_items.cost_price';
END
GO

-- =============================================================
-- SECTION 10: Indexes เพิ่มเติม
-- =============================================================
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'ix_categories_merchant_parent')
BEGIN
    CREATE INDEX ix_categories_merchant_parent ON dbo.categories (merchant_id, parent_id);
    PRINT 'Created index: ix_categories_merchant_parent';
END
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'ix_product_audit_log_created')
BEGIN
    CREATE INDEX ix_product_audit_log_created ON dbo.product_audit_log (merchant_id, created_at DESC);
    PRINT 'Created index: ix_product_audit_log_created';
END
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'ix_suppliers_merchant')
BEGIN
    CREATE INDEX ix_suppliers_merchant ON dbo.suppliers (merchant_id);
    PRINT 'Created index: ix_suppliers_merchant';
END
GO

-- =============================================================
-- SECTION 11: Seed Data — ตัวอย่าง Categories
-- =============================================================
DECLARE @merchant_id UNIQUEIDENTIFIER;
SELECT TOP 1 @merchant_id = id FROM dbo.merchants;

IF @merchant_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM dbo.categories WHERE merchant_id = @merchant_id)
BEGIN
    DECLARE @cat_clothing UNIQUEIDENTIFIER = NEWID();
    DECLARE @cat_accessories UNIQUEIDENTIFIER = NEWID();
    DECLARE @cat_food UNIQUEIDENTIFIER = NEWID();

    INSERT INTO dbo.categories (id, merchant_id, parent_id, name, code, color, sort_order)
    VALUES
        (@cat_clothing,    @merchant_id, NULL, N'เสื้อผ้า',     N'CLO', N'#6366f1', 1),
        (@cat_accessories, @merchant_id, NULL, N'กระเป๋า/ของใช้', N'ACC', N'#0ea5e9', 2),
        (@cat_food,        @merchant_id, NULL, N'อาหาร/เครื่องดื่ม', N'FOD', N'#10b981', 3);

    -- Sub-categories
    INSERT INTO dbo.categories (merchant_id, parent_id, name, code, color, sort_order)
    VALUES
        (@merchant_id, @cat_clothing,    N'เสื้อยืด',   N'CLO-TS', N'#818cf8', 1),
        (@merchant_id, @cat_clothing,    N'กางเกง',     N'CLO-PT', N'#818cf8', 2),
        (@merchant_id, @cat_accessories, N'กระเป๋าผ้า', N'ACC-BG', N'#38bdf8', 1),
        (@merchant_id, @cat_food,        N'เครื่องดื่ม', N'FOD-DK', N'#34d399', 1);

    PRINT 'Seeded: sample categories';
END
GO

-- =============================================================
-- DONE
-- =============================================================
PRINT '✅ Migration v2 completed successfully!';
GO
