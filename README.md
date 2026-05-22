# MeeStock

Mini stock management system for online sellers.

## Monorepo
- `frontend/` Next.js + React + MUI + Tailwind
- `backend/` ASP.NET Core Web API + EF Core
- `database/` SQL Server initialization script (`snake_case`)
- `docs/` architecture, API, and workflow docs

## Quick Start

### Database
1. Open SQL Server Management Studio.
2. Run `/home/runner/work/meestock/meestock/database/init_meestock.sql`.

### Backend
```bash
cd /home/runner/work/meestock/meestock/backend/src/MeeStock.Api
dotnet run
```

### Frontend
```bash
cd /home/runner/work/meestock/meestock/frontend
npm install
npm run dev
```

## Default Seed Login
- username: `owner`
- password: `P@ssw0rd!`
