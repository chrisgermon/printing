# PrintPress v1 Architecture (DigitalOcean)

## Goals in v1

- Customer portal to place print orders and track status
- Proof upload/review flow
- Internal status updates and activity timeline
- CRM-lite communication via queued email jobs
- Delivery and pricing fields on orders

## Runtime components

1. `web` (Next.js on App Platform Service)
- Serves portal UI
- Exposes API routes for orders, statuses, uploads
- Writes to PostgreSQL
- Creates outbox jobs for async notifications

2. `notifications-worker` (Node worker on App Platform Worker)
- Polls outbox jobs from PostgreSQL
- Sends email/events through provider adapter
- Retries failed jobs with backoff

3. `db` (Managed PostgreSQL)
- Source of truth for customers, orders, proofs, timeline, jobs

4. `spaces` (DigitalOcean Spaces)
- Stores proof files and source artwork
- Accessed via pre-signed PUT URLs

## Data model (Prisma)

- `Customer`: contact details and relationship owner
- `Order`: print job, quantity, status, due date, quote, tracking
- `ProofFile`: object key metadata + approval state
- `ActivityLog`: immutable timeline of order events
- `OutboxJob`: async tasks (email/status notification)

## Core request flows

1. Create order
- Customer submits order form
- API creates/updates customer record
- API creates order with `RECEIVED`
- API appends activity log event
- API enqueues `SEND_ORDER_CREATED_EMAIL` outbox job

2. Upload proof/artwork
- Client requests `/api/uploads/presign`
- API validates order/file metadata
- API returns signed Spaces upload URL
- Client uploads directly to Spaces
- API stores file metadata in `ProofFile`

3. Status update
- Staff updates order status
- API updates `Order.status`
- API appends activity log event
- API enqueues `SEND_STATUS_UPDATE_EMAIL` job

4. Worker delivery
- Worker reads `PENDING` jobs
- Marks each `PROCESSING`
- Executes provider call
- Marks `DONE` or retries with delay, then `FAILED`

## Why this layout on DigitalOcean

- Avoids single Droplet maintenance overhead
- Managed DB handles backups/SSL/ops
- App Platform handles deployment and service restart
- Spaces provides low-cost object storage + CDN

## v1 operational settings

- Region: keep `web`, `worker`, `db`, and `spaces` in same region (`nyc3`)
- DB SSL: `sslmode=require`
- Worker poll interval: 5s
- Service sizes: 1 vCPU / 1 GB each to start

## v1 hardening backlog

- Add auth + RBAC (customer/staff/admin)
- Add idempotency keys for order submission
- Add optimistic locking on status updates
- Add webhook/event delivery for internal systems
- Add Sentry + OpenTelemetry
- Add explicit migration/deploy pipeline in CI
