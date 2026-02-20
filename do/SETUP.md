# DigitalOcean Setup (v1)

## 1. Create managed resources

1. Create **Managed PostgreSQL** in the same region as App Platform (recommended: `nyc3`).
2. Create **Spaces** bucket for proofs (example: `printpress-proofs`) in `nyc3`.
3. In Spaces settings, create an **Access Key + Secret** with read/write bucket access.
4. (Optional) Enable Spaces CDN and note the CDN URL.

## 2. Push this repo to GitHub

1. Create repo (example `your-org/printpress`).
2. Push this scaffold.
3. Update `do/app.platform.yaml` with your real `repo` and domain values.

## 3. App Platform create

1. In DigitalOcean, App Platform -> Create App.
2. Choose **GitHub source** and this repo.
3. Import from `do/app.platform.yaml`.
4. Verify two components are detected:
   - `web` service
   - `notifications-worker` worker
5. Verify one database component:
   - `db` PostgreSQL 16

## 3.1 Component commands

- `web` build command:
  - `npm install && npm run build:web`
- `web` run command:
  - `npm --workspace @printpress/web run prisma:migrate:deploy && npm run start:web`
- `notifications-worker` build command:
  - `npm install && npm run build:worker`
- `notifications-worker` run command:
  - `npm run start:worker`

## 4. Required env vars

Set these in App Platform component settings:

- `DATABASE_URL` -> generated from managed DB connection string.
- `SPACES_REGION` -> `nyc3`
- `SPACES_ENDPOINT` -> `https://nyc3.digitaloceanspaces.com`
- `SPACES_BUCKET` -> your bucket name
- `SPACES_ACCESS_KEY` -> from Spaces key
- `SPACES_SECRET_KEY` -> from Spaces key
- `SPACES_CDN_BASE_URL` -> your CDN URL (optional but recommended)
- `APP_URL` -> your app domain, e.g. `https://app.crowdclick.com.au`
- `AUTH_URL` -> same as app URL, e.g. `https://app.crowdclick.com.au`
- `AUTH_SECRET` -> long random secret for Auth.js sessions
- `AUTH_TRUST_HOST` -> `true`
- `INTERNAL_API_TOKEN` -> long random value for internal service calls
- `MAIL_PROVIDER` -> `postmark`
- `MAIL_FROM` -> `PrintPress <no-reply@crowdclick.com.au>`
- `POSTMARK_SERVER_TOKEN` -> Postmark server token (secret)
- `POSTMARK_MESSAGE_STREAM` -> `outbound`

## 4.1 Spaces CORS policy

Add this CORS configuration on the Spaces bucket so browser uploads from your app domain work:

```json
[
  {
    "AllowedOrigins": ["https://app.crowdclick.com.au"],
    "AllowedMethods": ["PUT", "GET", "HEAD"],
    "AllowedHeaders": ["*"],
    "ExposeHeaders": ["ETag"],
    "MaxAgeSeconds": 3000
  }
]
```

## 5. Domain and TLS

1. Add custom domain in App Platform (example: `app.crowdclick.com.au`).
2. Create DNS `CNAME` from your DNS provider to DO target.
3. Wait for TLS provisioning.

## 5.1 Postmark Sender Domain DNS

In Postmark, verify your sender signature/domain and publish the DNS records Postmark provides:

- SPF TXT record
- DKIM TXT records
- Return-Path CNAME (for bounce handling)

## 6. Database migration

Run migration from web service deploy command or a one-off console:

```bash
npm --workspace @printpress/web run prisma:generate
npm --workspace @printpress/web run prisma:migrate:deploy
npm --workspace @printpress/web run seed:org -- "CrowdClick" "CrowdClick Agency" "ops@crowdclick.com.au"
# create admin: <email> <password> <role> <name> <userType> <companyId> [customerId]
npm --workspace @printpress/web run seed:user -- admin@crowdclick.com.au strongpassword ADMIN "CrowdClick Admin" INTERNAL <company_id>
# login and manage users at /admin/users
```

Recommended: append migrate deploy before startup in web run command for early environments.

## 7. Suggested v1 sizing

- `web`: `apps-s-1vcpu-1gb`, 1 instance
- `worker`: `apps-s-1vcpu-1gb`, 1 instance
- `db`: `db-s-1vcpu-1gb`, 1 node

Scale rules once traffic grows:

- `web` -> 2+ instances behind App Platform load balancer
- `db` -> larger plan and point-in-time recovery enabled
- separate worker types (emails, file processing) if queue depth grows

## 8. Security defaults

- Keep all secrets in App Platform envs (do not commit).
- Ensure DB uses SSL (`sslmode=require`).
- Use pre-signed upload URLs only; never expose Spaces secret to client.
- Rotate `AUTH_SECRET` periodically and enforce strong user passwords.
- Add rate limiting and audit log review for admin actions.
