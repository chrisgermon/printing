export const dynamic = 'force-dynamic';

import { prisma } from "@/lib/db";
import { auth } from "@/auth";
import { z } from "zod";
import { logAudit } from "@/lib/audit";

// Define system setting categories and their keys
export const SYSTEM_SETTING_KEYS = {
  email: [
    "EMAIL_DEFAULT_PROVIDER",
    "EMAIL_DEFAULT_FROM_NAME",
    "EMAIL_DEFAULT_FROM_ADDRESS",
    "EMAIL_DEFAULT_REPLY_TO"
  ],
  postmark: [
    "POSTMARK_SERVER_TOKEN",
    "POSTMARK_MESSAGE_STREAM"
  ],
  mailgun: [
    "MAILGUN_DOMAIN",
    "MAILGUN_API_KEY"
  ],
  storage: [
    "SPACES_REGION",
    "SPACES_ENDPOINT",
    "SPACES_BUCKET",
    "SPACES_ACCESS_KEY",
    "SPACES_SECRET_KEY",
    "SPACES_CDN_BASE_URL"
  ],
  notifications: [
    "WORKER_POLL_INTERVAL_MS",
    "NOTIFICATION_MAX_RETRIES",
    "NOTIFICATION_RETRY_DELAY_SECONDS"
  ],
  security: [
    "SESSION_TIMEOUT_MINUTES",
    "MAX_LOGIN_ATTEMPTS",
    "PASSWORD_MIN_LENGTH",
    "REQUIRE_STRONG_PASSWORDS"
  ]
} as const;

const settingSchema = z.object({
  key: z.string().min(1),
  value: z.string(),
  category: z.enum(["email", "postmark", "mailgun", "storage", "notifications", "security", "general"]),
  description: z.string().optional(),
  isSensitive: z.boolean().default(false)
});

export async function GET() {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }

  const settings = await prisma.systemSettings.findMany({
    orderBy: [{ category: "asc" }, { key: "asc" }]
  });

  // Group by category for easier consumption
  const grouped = settings.reduce((acc, setting) => {
    if (!acc[setting.category]) {
      acc[setting.category] = [];
    }
    acc[setting.category].push({
      ...setting,
      // Mask sensitive values
      value: setting.isSensitive ? "***REDACTED***" : setting.value
    });
    return acc;
  }, {} as Record<string, typeof settings>);

  return Response.json({ settings: grouped, raw: settings });
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }

  const payload = settingSchema.parse(await req.json());

  const existing = await prisma.systemSettings.findUnique({
    where: { key: payload.key }
  });

  const setting = await prisma.systemSettings.upsert({
    where: { key: payload.key },
    create: {
      ...payload,
      updatedBy: session.user.email || "unknown"
    },
    update: {
      value: payload.value,
      description: payload.description,
      isSensitive: payload.isSensitive,
      updatedBy: session.user.email || "unknown"
    }
  });

  await logAudit({
    actorId: session.user.id,
    actorEmail: session.user.email || "unknown",
    actorRole: session.user.role,
    action: existing ? "UPDATE" : "CREATE",
    resource: "SYSTEM_SETTINGS",
    resourceId: setting.id,
    details: { 
      key: payload.key, 
      category: payload.category,
      isSensitive: payload.isSensitive
    }
  });

  return Response.json({ 
    setting: {
      ...setting,
      value: setting.isSensitive ? "***REDACTED***" : setting.value
    }
  });
}

export async function DELETE(req: Request) {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const key = searchParams.get("key");
  
  if (!key) {
    return Response.json({ error: "Key is required" }, { status: 400 });
  }

  const existing = await prisma.systemSettings.findUnique({ where: { key } });
  if (!existing) {
    return Response.json({ error: "Setting not found" }, { status: 404 });
  }

  await prisma.systemSettings.delete({ where: { key } });

  await logAudit({
    actorId: session.user.id,
    actorEmail: session.user.email || "unknown",
    actorRole: session.user.role,
    action: "DELETE",
    resource: "SYSTEM_SETTINGS",
    details: { key, category: existing.category }
  });

  return Response.json({ success: true });
}
