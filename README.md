# InveXa

InveXa is an inventory management platform for teams that need one place to track stock, suppliers, purchase orders, sales orders, and demand signals.

It combines a React frontend with an Express + Prisma backend and a PostgreSQL database so evaluators can move from seeded demo data to real workflows quickly.

## What is InveXa

InveXa is built around inventory-first operations. The product emphasizes visibility, replenishment timing, and query-based demand insight instead of generic dashboard widgets.

Core product language used across the app:

- Inventory Command Center
- Query-Based Demand Insights
- Reorder Alerts
- Stockout Risk
- Supplier Reliability

## Key features

- Inventory dashboards with stock level, movement, and replenishment context
- Product pages that surface demand-driven insights and stockout risk signals
- Supplier and order management for procurement and fulfillment tracking
- Auth-protected application routes with seeded demo users
- OpenAPI documentation for the backend API
- Prisma migrations and seed data for repeatable local setup

## Architecture overview

### Frontend

- React 19 + TypeScript + Vite
- Tailwind CSS v4 for styling
- Routes include `/`, `/inventory`, `/products`, `/orders`, `/suppliers`, `/demand-insights`, `/reports`, `/settings`, `/profile`, `/calendar`, `/signin`, and `/signup`

### Backend

- Express API with validation, auth, and rate limiting
- Prisma for database access and migrations
- Swagger UI and the OpenAPI JSON document are served by the backend when enabled

### Database

- PostgreSQL
- Seeded warehouses, suppliers, products, purchase orders, sales orders, inventory levels, and an admin account

## Local setup

### Frontend

From the repository root:

```bash
npm install
npm run dev
```

Useful frontend commands:

```bash
npm run build
npm run lint
npm run preview
```

The frontend runs on the Vite default port, usually http://localhost:5173.

### Backend

From the `backend` directory:

```bash
cd backend
npm install
cp .env.example .env
docker compose up -d
npm run prisma:generate
npm run prisma:migrate -- --name init
npm run prisma:seed
npm run dev
```

Backend defaults:

- API base: http://localhost:4000
- CORS origin: http://localhost:5173
- OpenAPI docs: enabled by default

## Migrations and seed

Use the backend Prisma scripts whenever the schema changes or you want to refresh demo data:

```bash
cd backend
npm run prisma:generate
npm run prisma:migrate -- --name <migration_name>
npm run prisma:seed
```

The seed script creates or refreshes the demo admin account and the inventory dataset. The default seed password is `ChangeMe123!`, unless `ADMIN_SEED_PASSWORD` is set in the backend environment.

## Test, lint, build commands

### Frontend

- `npm run build`
- `npm run lint`
- `npm run dev`
- `npm run preview`

### Backend

From `backend`:

- `npm run build`
- `npm run lint`
- `npm run test`
- `npm run test:unit`
- `npm run test:integration`
- `npm run dev`
- `npm run prisma:generate`
- `npm run prisma:migrate -- --name <name>`
- `npm run prisma:seed`

## API docs links and usage

When the backend is running, these endpoints are available:

- OpenAPI JSON: http://localhost:4000/api/openapi.json
- Swagger UI: http://localhost:4000/api/docs
- Health check: http://localhost:4000/api/health

The OpenAPI document covers auth, products, inventory, suppliers, purchase orders, sales orders, and analytics routes.

Quick examples:

```bash
curl http://localhost:4000/api/health
curl http://localhost:4000/api/openapi.json
```

Protected endpoints require a bearer token. A typical flow is:

1. Sign in with `POST /api/auth/login`
2. Copy the returned access token
3. Call protected endpoints such as `GET /api/inventory/levels`

Example login request:

```bash
curl -X POST http://localhost:4000/api/auth/login \
	-H "Content-Type: application/json" \
	-d '{"email":"admin@example.com","password":"ChangeMe123!"}'
```

## Demo credentials and walkthrough path

Default demo account:

- Email: `admin@example.com`
- Password: `ChangeMe123!`

Suggested evaluator walkthrough:

1. Start the backend and frontend.
2. Open `/signin` and log in with the demo account.
3. Land on the dashboard and review the Inventory Command Center summary.
4. Open `/inventory` to inspect stock levels and recent movements.
5. Open `/products` to review Query-Based Demand Insights and stockout risk signals.
6. Open `/suppliers` to check supplier coverage and reliability context.
7. Open `/orders` to review purchase and sales order activity.
8. Open `/demand-insights` for the dedicated insight module.
9. Open http://localhost:4000/api/docs to verify the backend API surface.

## Evaluation checklist

- Frontend builds successfully from the repository root
- Backend starts after migrations and seed data are applied
- Demo login works with the seeded admin account
- Dashboard, inventory, products, orders, and suppliers routes load without errors
- OpenAPI docs are reachable at `/api/docs`
- Inventory and order data look populated rather than empty
- Brand language consistently reads as InveXa, not the starter template

## Roadmap and known limitations

Roadmap items:

- Replace demo data with live operational integrations
- Add richer filtering and export workflows for inventory review
- Expand analytics around replenishment, supplier lead time, and stockout risk

Known limitations:

- The app currently runs on seeded demo data unless you connect a real database and ingest live operational records
- Frontend tests are not defined in the root package scripts yet
- Third-party chart dependencies may emit build warnings during `npm run build`, but the build completes successfully
