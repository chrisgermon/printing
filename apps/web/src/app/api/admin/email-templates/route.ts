export const dynamic = 'force-dynamic';

import { prisma } from "@/lib/db";
import { auth } from "@/auth";
import { z } from "zod";
import { logAudit } from "@/lib/audit";

const templateSchema = z.object({
  name: z.string().min(1),
  subject: z.string().min(1),
  textBody: z.string().min(1),
  htmlBody: z.string().optional().nullable(),
  description: z.string().optional().nullable(),
  companyId: z.string().optional().nullable(),
  isActive: z.boolean().default(true)
});

export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const companyId = searchParams.get("companyId");
  const includeDefaults = searchParams.get("includeDefaults") === "true";

  const where: Record<string, unknown> = {};
  
  if (companyId) {
    where.companyId = companyId;
  } else if (!includeDefaults) {
    // If no companyId specified and not including defaults, return only system templates
    where.companyId = null;
  }

  const templates = await prisma.emailTemplate.findMany({
    where,
    orderBy: [
      { companyId: "asc" }, // System templates first
      { name: "asc" }
    ],
    include: {
      company: { select: { id: true, name: true } }
    }
  });

  return Response.json({ templates });
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }

  const payload = templateSchema.parse(await req.json());

  // Check for duplicate name within same scope (company or system)
  const existing = await prisma.emailTemplate.findFirst({
    where: {
      companyId: payload.companyId || null,
      name: payload.name
    }
  });

  if (existing) {
    return Response.json(
      { error: "A template with this name already exists for this scope" },
      { status: 400 }
    );
  }

  const template = await prisma.emailTemplate.create({
    data: {
      ...payload,
      createdBy: session.user.email || "unknown"
    },
    include: {
      company: { select: { id: true, name: true } }
    }
  });

  await logAudit({
    actorId: session.user.id,
    actorEmail: session.user.email || "unknown",
    actorRole: session.user.role,
    action: "CREATE",
    resource: "EMAIL_TEMPLATE",
    resourceId: template.id,
    companyId: payload.companyId || undefined,
    details: { name: payload.name, companyId: payload.companyId }
  });

  return Response.json({ template }, { status: 201 });
}
