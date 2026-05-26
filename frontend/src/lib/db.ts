import mssql from "mssql";

const config: mssql.config = {
  server: "94.237.76.153",
  database: "thaipes_meestock",
  user: "thaipes_dba",
  password: "Soulmate@2108",
  options: {
    encrypt: true,
    trustServerCertificate: true,
  },
  pool: {
    max: 10,
    min: 0,
    idleTimeoutMillis: 30000,
  },
};

let poolPromise: Promise<mssql.ConnectionPool> | null = null;

async function runMigrations(pool: mssql.ConnectionPool) {
  const migrations: { name: string; sql: string }[] = [
    {
      name: "orders.tracking_no",
      sql: `IF COL_LENGTH('dbo.orders','tracking_no') IS NULL BEGIN ALTER TABLE dbo.orders ADD tracking_no NVARCHAR(50) NULL END`,
    },
    {
      name: "orders.invoice_no",
      sql: `IF COL_LENGTH('dbo.orders','invoice_no') IS NULL BEGIN ALTER TABLE dbo.orders ADD invoice_no NVARCHAR(50) NULL END`,
    },
    {
      name: "orders.order_type",
      sql: `IF COL_LENGTH('dbo.orders','order_type') IS NULL BEGIN ALTER TABLE dbo.orders ADD order_type NVARCHAR(20) NOT NULL DEFAULT N'shipment' END`,
    },
    {
      name: "orders.note",
      sql: `IF COL_LENGTH('dbo.orders','note') IS NULL BEGIN ALTER TABLE dbo.orders ADD note NVARCHAR(500) NULL END`,
    },
    {
      name: "orders.discount_amount",
      sql: `IF COL_LENGTH('dbo.orders','discount_amount') IS NULL BEGIN ALTER TABLE dbo.orders ADD discount_amount DECIMAL(18,2) NOT NULL DEFAULT 0 END`,
    },
    {
      name: "orders.cost_total",
      sql: `IF COL_LENGTH('dbo.orders','cost_total') IS NULL BEGIN ALTER TABLE dbo.orders ADD cost_total DECIMAL(18,2) NOT NULL DEFAULT 0 END`,
    },
    {
      name: "orders.created_by",
      sql: `IF COL_LENGTH('dbo.orders','created_by') IS NULL BEGIN ALTER TABLE dbo.orders ADD created_by NVARCHAR(150) NULL DEFAULT N'system' END`,
    },
    {
      name: "order_items.cost_price",
      sql: `IF COL_LENGTH('dbo.order_items','cost_price') IS NULL BEGIN ALTER TABLE dbo.order_items ADD cost_price DECIMAL(18,2) NOT NULL DEFAULT 0 END`,
    },
    {
      name: "products.category_id",
      sql: `IF COL_LENGTH('dbo.products','category_id') IS NULL BEGIN ALTER TABLE dbo.products ADD category_id UNIQUEIDENTIFIER NULL END`,
    },
    {
      name: "products.cost_price",
      sql: `IF COL_LENGTH('dbo.products','cost_price') IS NULL BEGIN ALTER TABLE dbo.products ADD cost_price DECIMAL(18,2) NOT NULL DEFAULT 0 END`,
    },
    {
      name: "products.image_url",
      sql: `IF COL_LENGTH('dbo.products','image_url') IS NULL BEGIN ALTER TABLE dbo.products ADD image_url NVARCHAR(500) NULL END`,
    },
    {
      name: "products.unit",
      sql: `IF COL_LENGTH('dbo.products','unit') IS NULL BEGIN ALTER TABLE dbo.products ADD unit NVARCHAR(50) NOT NULL DEFAULT N'ชิ้น' END`,
    },
    {
      name: "products.notes",
      sql: `IF COL_LENGTH('dbo.products','notes') IS NULL BEGIN ALTER TABLE dbo.products ADD notes NVARCHAR(1000) NULL END`,
    },
    {
      name: "products.status",
      sql: `IF COL_LENGTH('dbo.products','status') IS NULL BEGIN ALTER TABLE dbo.products ADD status NVARCHAR(20) NOT NULL DEFAULT N'active' END`,
    },
    {
      name: "products.updated_at",
      sql: `IF COL_LENGTH('dbo.products','updated_at') IS NULL BEGIN ALTER TABLE dbo.products ADD updated_at DATETIME2 NULL END`,
    },
    {
      name: "stock_movements.lot_no",
      sql: `IF COL_LENGTH('dbo.stock_movements','lot_no') IS NULL BEGIN ALTER TABLE dbo.stock_movements ADD lot_no NVARCHAR(50) NULL END`,
    },
    {
      name: "stock_movements.expiry_date",
      sql: `IF COL_LENGTH('dbo.stock_movements','expiry_date') IS NULL BEGIN ALTER TABLE dbo.stock_movements ADD expiry_date DATE NULL END`,
    },
    {
      name: "stock_movements.supplier_id",
      sql: `IF COL_LENGTH('dbo.stock_movements','supplier_id') IS NULL BEGIN ALTER TABLE dbo.stock_movements ADD supplier_id UNIQUEIDENTIFIER NULL END`,
    },
    {
      name: "stock_movements.cost_price",
      sql: `IF COL_LENGTH('dbo.stock_movements','cost_price') IS NULL BEGIN ALTER TABLE dbo.stock_movements ADD cost_price DECIMAL(18,2) NULL END`,
    },
    {
      name: "stock_movements.note",
      sql: `IF COL_LENGTH('dbo.stock_movements','note') IS NULL BEGIN ALTER TABLE dbo.stock_movements ADD note NVARCHAR(500) NULL END`,
    },
    {
      name: "stock_movements.created_by",
      sql: `IF COL_LENGTH('dbo.stock_movements','created_by') IS NULL BEGIN ALTER TABLE dbo.stock_movements ADD created_by NVARCHAR(150) NULL DEFAULT N'system' END`,
    },
    {
      name: "table.categories",
      sql: `IF OBJECT_ID('dbo.categories','U') IS NULL BEGIN CREATE TABLE dbo.categories (id UNIQUEIDENTIFIER NOT NULL PRIMARY KEY DEFAULT NEWID(), merchant_id UNIQUEIDENTIFIER NOT NULL, parent_id UNIQUEIDENTIFIER NULL, name NVARCHAR(100) NOT NULL, code NVARCHAR(20) NULL, color NVARCHAR(10) NULL DEFAULT N'#6366f1', sort_order INT NOT NULL DEFAULT 0, is_active BIT NOT NULL DEFAULT 1, created_at DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(), CONSTRAINT fk_categories_merchant FOREIGN KEY (merchant_id) REFERENCES dbo.merchants(id), CONSTRAINT fk_categories_parent FOREIGN KEY (parent_id) REFERENCES dbo.categories(id)) END`,
    },
    {
      name: "table.suppliers",
      sql: `IF OBJECT_ID('dbo.suppliers','U') IS NULL BEGIN CREATE TABLE dbo.suppliers (id UNIQUEIDENTIFIER NOT NULL PRIMARY KEY DEFAULT NEWID(), merchant_id UNIQUEIDENTIFIER NOT NULL, name NVARCHAR(150) NOT NULL, contact_name NVARCHAR(100) NULL, phone NVARCHAR(20) NULL, email NVARCHAR(150) NULL, address NVARCHAR(500) NULL, notes NVARCHAR(500) NULL, is_active BIT NOT NULL DEFAULT 1, created_at DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(), CONSTRAINT fk_suppliers_merchant FOREIGN KEY (merchant_id) REFERENCES dbo.merchants(id)) END`,
    },
    {
      name: "table.product_audit_log",
      sql: `IF OBJECT_ID('dbo.product_audit_log','U') IS NULL BEGIN CREATE TABLE dbo.product_audit_log (id UNIQUEIDENTIFIER NOT NULL PRIMARY KEY DEFAULT NEWID(), merchant_id UNIQUEIDENTIFIER NOT NULL, product_id UNIQUEIDENTIFIER NOT NULL, action NVARCHAR(50) NOT NULL, field_name NVARCHAR(100) NULL, value_before NVARCHAR(MAX) NULL, value_after NVARCHAR(MAX) NULL, changed_by NVARCHAR(150) NOT NULL DEFAULT N'system', created_at DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(), CONSTRAINT fk_audit_log_product FOREIGN KEY (product_id) REFERENCES dbo.products(id)) END`,
    },
    {
      name: "products.product_type",
      sql: `IF COL_LENGTH('dbo.products','product_type') IS NULL BEGIN ALTER TABLE dbo.products ADD product_type NVARCHAR(20) NOT NULL DEFAULT N'standard' END`,
    },
    {
      name: "table.product_variants",
      sql: `IF OBJECT_ID('dbo.product_variants','U') IS NULL BEGIN CREATE TABLE dbo.product_variants (id UNIQUEIDENTIFIER NOT NULL PRIMARY KEY DEFAULT NEWID(), merchant_id UNIQUEIDENTIFIER NOT NULL, product_id UNIQUEIDENTIFIER NOT NULL, sku NVARCHAR(50) NOT NULL, barcode NVARCHAR(50) NULL, name NVARCHAR(150) NOT NULL, cost_price DECIMAL(18,2) NOT NULL DEFAULT 0, unit_price DECIMAL(18,2) NOT NULL DEFAULT 0, stock_qty INT NOT NULL DEFAULT 0, low_stock_threshold INT NOT NULL DEFAULT 3, is_active BIT NOT NULL DEFAULT 1, created_at DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(), CONSTRAINT fk_pv_product FOREIGN KEY (product_id) REFERENCES dbo.products(id) ON DELETE CASCADE, CONSTRAINT uq_pv_sku UNIQUE (merchant_id, sku), CONSTRAINT uq_pv_barcode UNIQUE (merchant_id, barcode)) END`,
    },
    {
      name: "table.product_bundles",
      sql: `IF OBJECT_ID('dbo.product_bundles','U') IS NULL BEGIN CREATE TABLE dbo.product_bundles (id UNIQUEIDENTIFIER NOT NULL PRIMARY KEY DEFAULT NEWID(), bundle_id UNIQUEIDENTIFIER NOT NULL, component_id UNIQUEIDENTIFIER NOT NULL, qty_required INT NOT NULL DEFAULT 1, CONSTRAINT fk_bundle_product FOREIGN KEY (bundle_id) REFERENCES dbo.products(id), CONSTRAINT fk_bundle_component FOREIGN KEY (component_id) REFERENCES dbo.products(id), CONSTRAINT uq_bundle_component UNIQUE (bundle_id, component_id)) END`,
    },
  ];

  for (const m of migrations) {
    try {
      await pool.request().query(m.sql);
    } catch (err) {
      console.error(`Migration warning [${m.name}]:`, err);
    }
  }
  console.log("✅ DB migrations completed");
}

export function getPool(): Promise<mssql.ConnectionPool> {
  if (!poolPromise) {
    poolPromise = new mssql.ConnectionPool(config)
      .connect()
      .then(async (pool) => {
        console.log("⚡ SQL Server connected successfully");
        await runMigrations(pool);
        return pool;
      })
      .catch((err) => {
        poolPromise = null;
        console.error("❌ SQL Server connection failed:", err);
        throw err;
      });
  }
  return poolPromise;
}

// Fetch the first merchant ID dynamically so we don't have hardcoded IDs
export async function getDemoMerchantId(): Promise<string> {
  try {
    const pool = await getPool();
    const result = await pool.request().query("SELECT TOP 1 id FROM dbo.merchants");
    if (result.recordset.length > 0) {
      return result.recordset[0].id.toString().toLowerCase();
    }
  } catch (err) {
    console.error("Error fetching merchant ID from DB:", err);
  }
  return "d6b5e022-ec98-4c4c-999a-c40ba247dd84";
}
