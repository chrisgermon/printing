export const dynamic = 'force-dynamic';

import { prisma } from "@/lib/db";
import { auth } from "@/auth";
import { z } from "zod";

const querySchema = z.object({
  page: z.string().default("1"),
  limit: z.string().default("50"),
  action: z.string().optional(),
  resource: z.string().optional(),
  companyId: z.string().optional(),
  actorEmail: z.string().optional(),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional()
});

export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const query = querySchema.parse(Object.fromEntries(searchParams));

  const page = Math.max(1, parseInt(query.page));
  const limit = Math.min(100, Math.max(1, parseInt(query.limit)));
  const skip = (page - 1) * limit;

  // Build where clause
  const where: Record<string, unknown> = {};
  
  if (query.action) {
    where.action = query.action;
  }
  
  if (query.resource) {
    where.resource = query.resource;
  }
  
  if (query.companyId) {
    where.companyId = query.companyId;
  }
  
  if (query.actorEmail) {
    where.actorEmail = { contains: query.actorEmail, mode: "insensitive" };
  }

  if (query.startDate || query.endDate) {
    where.createdAt = {};
    if (query.startDate) {
      (where.createdAt as Record<string, unknown>).gte = new Date(query.startDate);
    }
    if (query.endDate) {
      (where.createdAt as Record<string, unknown>).lte = new Date(query.endDate);
    }
  }

  const [logs, total] = await Promise.all([
    prisma.auditLog.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip,
      take: limit
    }),
    prisma.auditLog.count({ where })
  ]);

  return Response.json({
    logs,
    pagination: {
      page,
      limit,
      total,
      pages: Math.ceil(total / limit)
    }
  });
}
