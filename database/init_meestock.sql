IF DB_ID('meestock') IS NULL
BEGIN
    CREATE DATABASE meestock;
END
GO

USE meestock;
GO

IF OBJECT_ID('dbo.low_stock_alerts', 'U') IS NOT NULL DROP TABLE dbo.low_stock_alerts;
IF OBJECT_ID('dbo.stock_movements', 'U') IS NOT NULL DROP TABLE dbo.stock_movements;
IF OBJECT_ID('dbo.order_items', 'U') IS NOT NULL DROP TABLE dbo.order_items;
IF OBJECT_ID('dbo.orders', 'U') IS NOT NULL DROP TABLE dbo.orders;
IF OBJECT_ID('dbo.addresses', 'U') IS NOT NULL DROP TABLE dbo.addresses;
IF OBJECT_ID('dbo.customers', 'U') IS NOT NULL DROP TABLE dbo.customers;
IF OBJECT_ID('dbo.products', 'U') IS NOT NULL DROP TABLE dbo.products;
IF OBJECT_ID('dbo.refresh_tokens', 'U') IS NOT NULL DROP TABLE dbo.refresh_tokens;
IF OBJECT_ID('dbo.user_roles', 'U') IS NOT NULL DROP TABLE dbo.user_roles;
IF OBJECT_ID('dbo.users', 'U') IS NOT NULL DROP TABLE dbo.users;
IF OBJECT_ID('dbo.roles', 'U') IS NOT NULL DROP TABLE dbo.roles;
IF OBJECT_ID('dbo.merchants', 'U') IS NOT NULL DROP TABLE dbo.merchants;
GO

CREATE TABLE dbo.merchants (
    id UNIQUEIDENTIFIER NOT NULL PRIMARY KEY DEFAULT NEWID(),
    name NVARCHAR(150) NOT NULL,
    is_active BIT NOT NULL DEFAULT 1,
    created_at DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME()
);
GO

CREATE TABLE dbo.roles (
    id UNIQUEIDENTIFIER NOT NULL PRIMARY KEY DEFAULT NEWID(),
    name NVARCHAR(50) NOT NULL UNIQUE
);
GO

CREATE TABLE dbo.users (
    id UNIQUEIDENTIFIER NOT NULL PRIMARY KEY DEFAULT NEWID(),
    merchant_id UNIQUEIDENTIFIER NOT NULL,
    username NVARCHAR(50) NOT NULL,
    password_hash NVARCHAR(255) NOT NULL,
    display_name NVARCHAR(120) NOT NULL,
    is_active BIT NOT NULL DEFAULT 1,
    created_at DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
    CONSTRAINT fk_users_merchant FOREIGN KEY (merchant_id) REFERENCES dbo.merchants(id),
    CONSTRAINT uq_users_merchant_username UNIQUE (merchant_id, username)
);
GO

CREATE TABLE dbo.user_roles (
    user_id UNIQUEIDENTIFIER NOT NULL,
    role_id UNIQUEIDENTIFIER NOT NULL,
    PRIMARY KEY (user_id, role_id),
    CONSTRAINT fk_user_roles_user FOREIGN KEY (user_id) REFERENCES dbo.users(id) ON DELETE CASCADE,
    CONSTRAINT fk_user_roles_role FOREIGN KEY (role_id) REFERENCES dbo.roles(id) ON DELETE CASCADE
);
GO

CREATE TABLE dbo.refresh_tokens (
    id UNIQUEIDENTIFIER NOT NULL PRIMARY KEY DEFAULT NEWID(),
    user_id UNIQUEIDENTIFIER NOT NULL,
    token_hash NVARCHAR(255) NOT NULL,
    expires_at DATETIME2 NOT NULL,
    revoked_at DATETIME2 NULL,
    created_at DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
    CONSTRAINT fk_refresh_tokens_user FOREIGN KEY (user_id) REFERENCES dbo.users(id) ON DELETE CASCADE
);
GO

CREATE TABLE dbo.customers (
    id UNIQUEIDENTIFIER NOT NULL PRIMARY KEY DEFAULT NEWID(),
    merchant_id UNIQUEIDENTIFIER NOT NULL,
    name NVARCHAR(150) NOT NULL,
    phone NVARCHAR(20) NOT NULL,
    full_text_address NVARCHAR(500) NOT NULL,
    created_at DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
    CONSTRAINT fk_customers_merchant FOREIGN KEY (merchant_id) REFERENCES dbo.merchants(id)
);
GO

CREATE TABLE dbo.addresses (
    id UNIQUEIDENTIFIER NOT NULL PRIMARY KEY DEFAULT NEWID(),
    merchant_id UNIQUEIDENTIFIER NOT NULL,
    customer_id UNIQUEIDENTIFIER NOT NULL,
    label NVARCHAR(50) NOT NULL,
    receiver_name NVARCHAR(150) NOT NULL,
    receiver_phone NVARCHAR(20) NOT NULL,
    house_no NVARCHAR(50) NOT NULL,
    village NVARCHAR(100) NULL,
    road NVARCHAR(100) NULL,
    sub_district NVARCHAR(100) NULL,
    district NVARCHAR(100) NULL,
    province NVARCHAR(100) NULL,
    postal_code NVARCHAR(10) NULL,
    full_address NVARCHAR(500) NOT NULL,
    is_default BIT NOT NULL DEFAULT 0,
    created_at DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
    CONSTRAINT fk_addresses_customer FOREIGN KEY (customer_id) REFERENCES dbo.customers(id) ON DELETE CASCADE
);
GO

CREATE TABLE dbo.products (
    id UNIQUEIDENTIFIER NOT NULL PRIMARY KEY DEFAULT NEWID(),
    merchant_id UNIQUEIDENTIFIER NOT NULL,
    sku NVARCHAR(50) NOT NULL,
    barcode NVARCHAR(50) NOT NULL,
    name NVARCHAR(150) NOT NULL,
    unit_price DECIMAL(18,2) NOT NULL DEFAULT 0,
    stock_qty INT NOT NULL DEFAULT 0,
    low_stock_threshold INT NOT NULL DEFAULT 5,
    is_active BIT NOT NULL DEFAULT 1,
    created_at DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
    CONSTRAINT fk_products_merchant FOREIGN KEY (merchant_id) REFERENCES dbo.merchants(id),
    CONSTRAINT uq_products_sku UNIQUE (merchant_id, sku),
    CONSTRAINT uq_products_barcode UNIQUE (merchant_id, barcode)
);
GO

CREATE TABLE dbo.orders (
    id UNIQUEIDENTIFIER NOT NULL PRIMARY KEY DEFAULT NEWID(),
    merchant_id UNIQUEIDENTIFIER NOT NULL,
    order_no NVARCHAR(50) NOT NULL,
    customer_id UNIQUEIDENTIFIER NOT NULL,
    status NVARCHAR(20) NOT NULL,
    total_amount DECIMAL(18,2) NOT NULL DEFAULT 0,
    created_at DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
    CONSTRAINT fk_orders_merchant FOREIGN KEY (merchant_id) REFERENCES dbo.merchants(id),
    CONSTRAINT fk_orders_customer FOREIGN KEY (customer_id) REFERENCES dbo.customers(id),
    CONSTRAINT uq_orders_order_no UNIQUE (merchant_id, order_no)
);
GO

CREATE TABLE dbo.order_items (
    id UNIQUEIDENTIFIER NOT NULL PRIMARY KEY DEFAULT NEWID(),
    merchant_id UNIQUEIDENTIFIER NOT NULL,
    order_id UNIQUEIDENTIFIER NOT NULL,
    product_id UNIQUEIDENTIFIER NOT NULL,
    qty INT NOT NULL,
    unit_price DECIMAL(18,2) NOT NULL,
    line_amount DECIMAL(18,2) NOT NULL,
    CONSTRAINT fk_order_items_order FOREIGN KEY (order_id) REFERENCES dbo.orders(id) ON DELETE CASCADE,
    CONSTRAINT fk_order_items_product FOREIGN KEY (product_id) REFERENCES dbo.products(id)
);
GO

CREATE TABLE dbo.stock_movements (
    id UNIQUEIDENTIFIER NOT NULL PRIMARY KEY DEFAULT NEWID(),
    merchant_id UNIQUEIDENTIFIER NOT NULL,
    product_id UNIQUEIDENTIFIER NOT NULL,
    movement_type NVARCHAR(20) NOT NULL,
    qty INT NOT NULL,
    reason NVARCHAR(50) NOT NULL,
    ref_type NVARCHAR(50) NOT NULL,
    ref_id UNIQUEIDENTIFIER NULL,
    created_at DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
    CONSTRAINT fk_stock_movements_product FOREIGN KEY (product_id) REFERENCES dbo.products(id)
);
GO

CREATE TABLE dbo.low_stock_alerts (
    id UNIQUEIDENTIFIER NOT NULL PRIMARY KEY DEFAULT NEWID(),
    merchant_id UNIQUEIDENTIFIER NOT NULL,
    product_id UNIQUEIDENTIFIER NOT NULL,
    stock_qty INT NOT NULL,
    low_stock_threshold INT NOT NULL,
    is_read BIT NOT NULL DEFAULT 0,
    created_at DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
    CONSTRAINT fk_low_stock_alerts_product FOREIGN KEY (product_id) REFERENCES dbo.products(id)
);
GO

CREATE INDEX ix_products_barcode_sku_merchant ON dbo.products (barcode, sku, merchant_id);
CREATE INDEX ix_orders_created_at_merchant ON dbo.orders (created_at, merchant_id);
CREATE INDEX ix_stock_movements_product_created_at ON dbo.stock_movements (product_id, created_at);
GO

DECLARE @merchant_id UNIQUEIDENTIFIER = NEWID();
DECLARE @owner_role_id UNIQUEIDENTIFIER = NEWID();
DECLARE @staff_role_id UNIQUEIDENTIFIER = NEWID();
DECLARE @owner_user_id UNIQUEIDENTIFIER = NEWID();
DECLARE @customer_id UNIQUEIDENTIFIER = NEWID();

INSERT INTO dbo.merchants (id, name, is_active) VALUES (@merchant_id, N'Demo Merchant', 1);
INSERT INTO dbo.roles (id, name) VALUES (@owner_role_id, N'owner'), (@staff_role_id, N'staff');
INSERT INTO dbo.users (id, merchant_id, username, password_hash, display_name, is_active)
VALUES (@owner_user_id, @merchant_id, N'owner', N'$2a$11$9W9THwC6.3Y3tAFrdQ/Nu.0TQXQsfA0WdwFxzM7xA0xGCPgPEe7mu', N'Demo Owner', 1);
INSERT INTO dbo.user_roles (user_id, role_id) VALUES (@owner_user_id, @owner_role_id);
INSERT INTO dbo.customers (id, merchant_id, name, phone, full_text_address)
VALUES (@customer_id, @merchant_id, N'นายสมชาย ใจดี', N'0812345678', N'1/99 ซอย 3 ถนนพหลโยธิน เขตจตุจักร กรุงเทพ 10900');

INSERT INTO dbo.addresses (merchant_id, customer_id, label, receiver_name, receiver_phone, house_no, full_address, is_default)
VALUES (@merchant_id, @customer_id, N'บ้าน', N'นายสมชาย ใจดี', N'0812345678', N'1/99', N'1/99 ซอย 3 ถนนพหลโยธิน เขตจตุจักร กรุงเทพ 10900', 1);

INSERT INTO dbo.products (merchant_id, sku, barcode, name, unit_price, stock_qty, low_stock_threshold, is_active)
VALUES
(@merchant_id, N'SKU-TS-001', N'885000000001', N'เสื้อยืดสีขาว', 199, 20, 5, 1),
(@merchant_id, N'SKU-BG-002', N'885000000002', N'กระเป๋าผ้า', 149, 8, 4, 1),
(@merchant_id, N'SKU-CP-003', N'885000000003', N'แก้วกาแฟ', 99, 3, 3, 1);
GO
