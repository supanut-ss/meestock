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
# Provide the connection string (never commit it), e.g. via user-secrets:
dotnet user-secrets set "ConnectionStrings:DefaultConnection" "Server=...;Database=...;User Id=...;Password=...;Encrypt=True;TrustServerCertificate=True;"
# or set the env var ConnectionStrings__DefaultConnection in other environments
dotnet run
```

### Frontend
```bash
cd /home/runner/work/meestock/meestock/frontend
cp .env.example .env.local   # then set DB_SERVER, DB_NAME, DB_USER, DB_PASSWORD
npm install
npm run dev
```

## Default Seed Login
- username: `owner`
- password: `P@ssw0rd!`
