export const dynamic = 'force-dynamic';

import { prisma } from "@/lib/db";
import { auth } from "@/auth";
import { z } from "zod";
import { logAudit } from "@/lib/audit";

const updateSchema = z.object({
  name: z.string().min(1).optional(),
  isInternal: z.boolean().optional()
});

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }

  const company = await prisma.company.findUnique({
    where: { id },
    include: {
      _count: {
        select: { customers: true, userAccounts: true }
      },
      settings: true
    }
  });

  if (!company) {
    return Response.json({ error: "Company not found" }, { status: 404 });
  }

  return Response.json({ company });
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }

  const payload = updateSchema.parse(await req.json());
  const existing = await prisma.company.findUnique({ where: { id } });
  
  if (!existing) {
    return Response.json({ error: "Company not found" }, { status: 404 });
  }

  // Check for name conflict if renaming
  if (payload.name && payload.name !== existing.name) {
    const conflict = await prisma.company.findUnique({
      where: { name: payload.name }
    });
    if (conflict) {
      return Response.json(
        { error: "A company with this name already exists" },
        { status: 400 }
      );
    }
  }

  const company = await prisma.company.update({
    where: { id },
    data: payload,
    include: {
      _count: {
        select: { customers: true, userAccounts: true }
      },
      settings: true
    }
  });

  await logAudit({
    actorId: session.user.id,
    actorEmail: session.user.email || "unknown",
    actorRole: session.user.role,
    action: "UPDATE",
    resource: "COMPANY",
    resourceId: id,
    details: { before: existing, after: payload }
  });

  return Response.json({ company });
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }

  const existing = await prisma.company.findUnique({
    where: { id },
    include: {
      _count: {
        select: { customers: true, userAccounts: true }
      }
    }
  });

  if (!existing) {
    return Response.json({ error: "Company not found" }, { status: 404 });
  }

  // Prevent deletion if company has users or customers
  if (existing._count.customers > 0 || existing._count.userAccounts > 0) {
    return Response.json(
      { 
        error: "Cannot delete company with existing customers or users",
        counts: existing._count
      },
      { status: 400 }
    );
  }

  await prisma.company.delete({ where: { id } });

  await logAudit({
    actorId: session.user.id,
    actorEmail: session.user.email || "unknown",
    actorRole: session.user.role,
    action: "DELETE",
    resource: "COMPANY",
    resourceId: id,
    details: { name: existing.name }
  });

  return Response.json({ success: true });
}
