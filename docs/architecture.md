# MeeStock System Architecture

## Stack
- Frontend: Next.js (React + MUI + Tailwind)
- Backend: ASP.NET Core Web API + EF Core
- Database: SQL Server (SQL Express)

## Monorepo Structure
- `/frontend` Next.js app
- `/backend` ASP.NET Core API solution
- `/database` SQL initialization and seed scripts
- `/docs` architecture/API/workflow notes

## Multi-Tenant Model
Every business row is tied to `merchant_id`.
Authorization reads `merchant_id` from JWT claims and applies tenant filtering in all endpoints.

## Core Domain
- Products with `sku` and `barcode`
- Customers and shipping addresses
- Orders and order items
- Stock movements for in/out/adjust operations
- Low stock alerts generated when `stock_qty <= low_stock_threshold`
