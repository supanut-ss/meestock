# MeeStock System Overview

MeeStock is a stock management system for small online sellers. It tracks products, receives and issues stock, records sales, prints shipping labels, and reports on inventory and profit.

## 1. Architecture

```
Browser ──> Next.js (frontend, server actions) ──> SQL Server
                                                      ^
ASP.NET Core Web API (backend, JWT) ─────────────────┘
```

| Part | Tech | Folder |
|------|------|--------|
| Web app | Next.js, React, MUI + MUI X DataGrid, Tailwind | `frontend/` |
| REST API | ASP.NET Core (.NET 10), EF Core | `backend/src/MeeStock.Api/` |
| Database | SQL Server, `snake_case` tables/columns | `database/` |

**Important:** the web app currently reads and writes the database **directly** through Next.js server actions (`frontend/src/lib/dbActions.ts`, `authActions.ts`, `db.ts`). It does **not** call the ASP.NET Core API. The API exposes a similar feature set (see `docs/api-spec.md`) but is a separate entry point to the same database.

### Authentication
- Web app: username + password checked against `users.password_hash` (bcrypt). A session cookie (`meestock_session`) lasts 7 days. `middleware.ts` redirects any page except `/login` to the login page when the cookie is missing or expired.
- API: JWT access token + refresh token (`/api/auth/*`).
- Roles: `owner`/`admin` (shown as "Admin") and `staff`. Only admins can manage users.

### Multi-tenant model
Every business row carries a `merchant_id`; data is filtered per merchant.

## 2. Features

| Area | Page | What it does |
|------|------|--------------|
| Dashboard | `/dashboard` | Sales and stock KPIs, daily/monthly charts, best sellers |
| Products | `/products` | Product list, create/edit/delete, variants, bundles, price/cost, stock adjust, change history, Excel import/export, barcode scan |
| Categories | `/categories` | Group products, color tags |
| Stock in | `/stock-in` | Receive stock with quantity, unit cost, lot number, expiry date, supplier, note |
| Stock out | `/stock-out` | Sale cart with barcode/camera scan, discount, note, saves an order and prints an invoice |
| Stock history | `/movements` | Immutable log of every stock movement |
| Orders / shipping | `/orders` | Order list, status (prepare / shipped / cancelled), tracking number, returns |
| Shipping labels | `/shipping` | Create and print parcel labels |
| Reports | `/reports` | Inventory snapshot, profit/loss, top 10 best sellers, slow-moving items, expiring lots; export to Excel |
| Alerts | Bell icon | Low-stock and expiry alerts, mark as read |
| Users | `/users` | Create staff accounts, enable/disable (admin only) |

### Stock rules
- Every stock change (receive, sale, adjust, return) writes a row to `stock_movements`.
- A sale deducts stock inside one database transaction.
- When stock reaches the product's low-stock threshold, an alert is created.
- Products can have variants (each with its own SKU, price, cost, stock) and bundles (a set made from component products; the maximum number of sets is limited by the scarcest component).

## 3. Running locally

### Database
Run `database/init_meestock.sql`, then `database/migration_v2.sql`, in SQL Server. Seed account: `owner` (see README for the default password).

### API
```bash
cd backend/src/MeeStock.Api
dotnet run --launch-profile http   # http://localhost:5094
```

### Web app
```bash
cd frontend
npm install
npm run dev                        # http://localhost:3000
```

## 4. Responsive behavior

| Screen | Behavior |
|--------|----------|
| Desktop (>= 1024px) | Full top navigation, wide tables |
| Tablet / mobile (< 1024px) | Hamburger menu; tables scroll inside their own frame; forms stack in one column |

## 5. Known issues and recommendations

- **Credentials in source:** the SQL Server host, user and password are hard-coded in `frontend/src/lib/db.ts` and committed in `backend/.../appsettings*.json`. Move them to environment variables or user-secrets and rotate the password.
- **Two data paths:** the web app and the API both write to the database with separate logic. Decide on one (preferably the API) to avoid divergence.
- **Deployment:** there is no Dockerfile or CI/CD pipeline yet.
- `frontend/next.config.ts` has a TypeScript error (`eslint` is not a known `NextConfig` property).
