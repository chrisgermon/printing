import { prisma } from "@/lib/db";
import { auth } from "@/auth";
import { z } from "zod";
import { logAudit } from "@/lib/audit";

const statusSchema = z.object({
  status: z.enum([
    "RECEIVED",
    "PROOF_PREPARING",
    "PROOF_SENT",
    "AWAITING_APPROVAL",
    "APPROVED",
    "PRINTING",
    "READY_TO_SHIP",
    "SHIPPED",
    "DELIVERED",
    "CANCELLED"
  ]),
  note: z.string().max(500).optional()
});

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await auth();
  if (!session?.user) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!["STAFF", "ADMIN"].includes(session.user.role)) {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }

  const payload = statusSchema.parse(await req.json());

  const existingOrder = await prisma.order.findUnique({
    where: { id },
    include: { customer: true }
  });
  if (!existingOrder) {
    return Response.json({ error: "Order not found" }, { status: 404 });
  }
  if (session.user.companyId && existingOrder.customer.companyId && existingOrder.customer.companyId !== session.user.companyId) {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }

  const order = await prisma.order.update({
    where: { id },
    data: { status: payload.status }
  });

  await prisma.activityLog.create({
    data: {
      orderId: order.id,
      actorType: "STAFF",
      actorRef: session.user.email || "unknown@printpress.local",
      eventType: "ORDER_STATUS_UPDATED",
      eventData: {
        status: payload.status,
        note: payload.note ?? null
      }
    }
  });

  await prisma.outboxJob.create({
    data: {
      orderId: order.id,
      type: "SEND_STATUS_UPDATE_EMAIL",
      payload: {
        orderId: order.id,
        status: payload.status,
        note: payload.note ?? null
      }
    }
  });

  await logAudit({
    actorId: session.user.id,
    actorEmail: session.user.email || "unknown",
    actorRole: session.user.role,
    action: "UPDATE",
    resource: "ORDER",
    resourceId: order.id,
    companyId: existingOrder.customer.companyId || undefined,
    details: { previousStatus: existingOrder.status, newStatus: payload.status, note: payload.note }
  });

  return Response.json({ ok: true, orderId: order.id, status: order.status });
}
