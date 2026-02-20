# PrintPress v1 Scaffold (DigitalOcean)

This repository contains a v1 scaffold for a print management platform on DigitalOcean App Platform using:

- `apps/web`: Next.js 14 portal + API routes
- `workers/notifications`: background worker for email/status jobs
- DigitalOcean Managed PostgreSQL
- DigitalOcean Spaces for proofs/artwork storage

## v1 capabilities in this scaffold

- Customer order creation API (`/api/orders`)
- Order status update API (`/api/orders/:id/status`)
- Signed upload URL generation for proofs (`/api/uploads/presign`)
- Auth.js credentials login with DB-backed users/roles (`/login`)
- Multi-tenant user model for internal users and client users assigned to company/client records
- Order list with search/filter/pagination (`/orders`)
- New order page (`/orders/new`)
- Order detail page with timeline, status updates, proof uploads, staff proof review, and customer proof response (`/orders/:id`)
- Client CRM page with order history, activity, and outbound communication composer (`/clients/:id`)
- Admin user management UI (`/admin/users`) for create/disable, role updates, and password reset
- Prisma schema for customers, orders, proof files, activity logs, and outbox jobs
- Worker skeleton that processes outbox jobs
- App Platform spec file at `do/app.platform.yaml`

## Quick start (local)

1. Copy env file:

```bash
cp apps/web/.env.example apps/web/.env.local
cp workers/notifications/.env.example workers/notifications/.env
```

2. Install dependencies:

```bash
npm install
```

3. Run Prisma migration/generation:

```bash
npm --workspace @printpress/web run prisma:generate
npm --workspace @printpress/web run prisma:migrate:dev
npm --workspace @printpress/web run seed:org -- "CrowdClick" "CrowdClick Agency" "ops@crowdclick.com.au"
# create admin: <email> <password> <role> <name> <userType> <companyId> [customerId]
npm --workspace @printpress/web run seed:user -- admin@crowdclick.com.au strongpassword ADMIN "CrowdClick Admin" INTERNAL <company_id>
```

4. Start web:

```bash
npm run dev:web
```

5. Start worker in another terminal:

```bash
npm run dev:worker
```

## DigitalOcean deployment

Use `do/app.platform.yaml` and the setup instructions in `do/SETUP.md`.
