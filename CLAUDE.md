# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

PrintPress is a multi-tenant print order management and proof workflow system. Customers submit print orders, staff upload proofs, customers approve/reject, and automated emails notify throughout. Deployed on DigitalOcean App Platform (Sydney region).

## Monorepo Structure

npm workspaces monorepo with two packages:

- **`apps/web`** (`@printpress/web`) — Next.js 16 app with App Router, Prisma ORM, Auth.js (NextAuth v5 beta)
- **`workers/notifications`** (`@printpress/notifications-worker`) — Node.js email worker using `pg` driver, polls OutboxJob table

## Common Commands

```bash
# Install all dependencies
npm install

# Development (run in separate terminals)
npm run dev:web          # Next.js dev server on :3000
npm run dev:worker       # tsx watch for notifications worker

# Build
npm run build:web        # Next.js production build
npm run build:worker     # tsc compile worker

# Production
npm run start:web
npm run start:worker

# Lint
npm --workspace @printpress/web run lint

# Prisma
npm --workspace @printpress/web run prisma:generate          # Generate client after schema changes
npm --workspace @printpress/web run prisma:migrate:dev        # Create + apply migration locally
npm --workspace @printpress/web run prisma:migrate:deploy     # Apply migrations (production)

# Seed data
npm --workspace @printpress/web run seed:org -- "Name" "Description" "email@example.com"
npm --workspace @printpress/web run seed:user -- email@ex.com password ADMIN "Full Name" INTERNAL <companyId>
```

## Architecture

### Web App (`apps/web`)

- **Framework:** Next.js 16 with App Router, `output: "standalone"`, React 18
- **Database:** Prisma 6 with PostgreSQL. Schema at `apps/web/prisma/schema.prisma`
- **Auth:** Auth.js v5 beta with JWT sessions and credentials provider (`src/auth.ts`). Session carries `id`, `role`, `userType`, `companyId`, `customerId`
- **Path alias:** `@/*` maps to `src/*`
- **API routes** use `export const dynamic = 'force-dynamic'` to prevent static generation
- **Prisma singleton** at `src/lib/db.ts` — import as `import { prisma } from "@/lib/db"`
- **Audit logging** via `logAudit()` from `src/lib/audit.ts` — fire-and-forget, never throws
- **Validation:** zod

### Notifications Worker (`workers/notifications`)

- Standalone Node.js process using raw `pg` (not Prisma)
- Polls `OutboxJob` table for PENDING jobs every 5 seconds
- Sends emails via Postmark or Mailgun based on `MAIL_PROVIDER` env var
- Retries failed jobs with exponential backoff, max 4 attempts
- Resolves email templates: company-specific → system default → hardcoded fallback

### Key Patterns

- **Outbox pattern:** API routes insert `OutboxJob` records in the same transaction as business data. Worker picks them up asynchronously for email delivery.
- **Multi-tenant isolation:** Every query must filter by `session.user.companyId`. Company → Customers → Orders hierarchy.
- **Signed uploads:** Proof files go to DigitalOcean Spaces via presigned S3 URLs (never expose credentials to client).
- **Immutable logs:** `ActivityLog` (order timeline) and `AuditLog` (admin security trail) are append-only.

### User Model

- **Roles:** `CUSTOMER` (view own orders), `STAFF` (manage orders), `ADMIN` (full access)
- **UserTypes:** `INTERNAL` (company staff, has `companyId`), `CLIENT` (customer, has `customerId`)

### Order Status Flow

```
RECEIVED → PROOF_PREPARING → PROOF_SENT → AWAITING_APPROVAL →
APPROVED → PRINTING → READY_TO_SHIP → SHIPPED → DELIVERED
(CANCELLED at any point)
```

## Key Files

- `apps/web/prisma/schema.prisma` — Full data model (12 models)
- `apps/web/src/auth.ts` — Auth config with JWT callbacks
- `apps/web/src/lib/db.ts` — Prisma client singleton
- `apps/web/src/lib/audit.ts` — Audit logging helper
- `workers/notifications/src/index.ts` — Email worker main loop
- `do/app.platform.yaml` — DigitalOcean App Platform deployment spec

## Conventions

- TypeScript strict mode enabled
- API routes: Next.js App Router handlers (`GET`, `POST`, `PATCH`) with `auth()` session check
- Worker uses raw SQL with parameterized queries (`$1`, `$2`) — Prisma table names are PascalCase and must be quoted in SQL (e.g., `"OutboxJob"`)
- Database migrations: edit `schema.prisma`, run `prisma:migrate:dev -- --name description`, commit both schema and migration folder
- No test framework configured yet
