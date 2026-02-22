export const dynamic = 'force-dynamic';

import { prisma } from "@/lib/db";
import { auth } from "@/auth";
import { z } from "zod";
import { logAudit } from "@/lib/audit";

const updateSchema = z.object({
  subject: z.string().min(1).optional(),
  textBody: z.string().min(1).optional(),
  htmlBody: z.string().optional().nullable(),
  description: z.string().optional().nullable(),
  isActive: z.boolean().optional()
});

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }

  const template = await prisma.emailTemplate.findUnique({
    where: { id },
    include: {
      company: { select: { id: true, name: true } }
    }
  });

  if (!template) {
    return Response.json({ error: "Template not found" }, { status: 404 });
  }

  return Response.json({ template });
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }

  const payload = updateSchema.parse(await req.json());
  const existing = await prisma.emailTemplate.findUnique({ where: { id } });
  
  if (!existing) {
    return Response.json({ error: "Template not found" }, { status: 404 });
  }

  const template = await prisma.emailTemplate.update({
    where: { id },
    data: payload,
    include: {
      company: { select: { id: true, name: true } }
    }
  });

  await logAudit({
    actorId: session.user.id,
    actorEmail: session.user.email || "unknown",
    actorRole: session.user.role,
    action: "UPDATE",
    resource: "EMAIL_TEMPLATE",
    resourceId: id,
    companyId: existing.companyId || undefined,
    details: { name: existing.name, changes: payload }
  });

  return Response.json({ template });
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }

  const existing = await prisma.emailTemplate.findUnique({ where: { id } });
  if (!existing) {
    return Response.json({ error: "Template not found" }, { status: 404 });
  }

  // Prevent deletion of default system templates
  if (existing.isDefault) {
    return Response.json(
      { error: "Cannot delete default system templates" },
      { status: 400 }
    );
  }

  await prisma.emailTemplate.delete({ where: { id } });

  await logAudit({
    actorId: session.user.id,
    actorEmail: session.user.email || "unknown",
    actorRole: session.user.role,
    action: "DELETE",
    resource: "EMAIL_TEMPLATE",
    resourceId: id,
    companyId: existing.companyId || undefined,
    details: { name: existing.name }
  });

  return Response.json({ success: true });
}
