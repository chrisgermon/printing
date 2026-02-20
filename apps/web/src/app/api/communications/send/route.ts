import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { z } from "zod";

const schema = z.object({
  customerId: z.string().min(1),
  orderId: z.string().min(1).optional(),
  toEmail: z.string().email(),
  subject: z.string().min(2).max(180),
  body: z.string().min(2).max(10000)
});

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!["STAFF", "ADMIN"].includes(session.user.role)) {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }

  const payload = schema.parse(await req.json());
  const customer = await prisma.customer.findUnique({
    where: { id: payload.customerId }
  });
  if (!customer) {
    return Response.json({ error: "Customer not found" }, { status: 404 });
  }
  if (session.user.companyId && customer.companyId && session.user.companyId !== customer.companyId) {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }

  if (payload.orderId) {
    const order = await prisma.order.findUnique({
      where: { id: payload.orderId },
      select: { customerId: true }
    });

    if (!order || order.customerId !== payload.customerId) {
      return Response.json({ error: "Invalid customer/order combination" }, { status: 400 });
    }
  }

  const communication = await prisma.communicationLog.create({
    data: {
      customerId: customer.id,
      orderId: payload.orderId,
      toEmail: payload.toEmail,
      subject: payload.subject,
      body: payload.body,
      status: "QUEUED",
      createdBy: session.user.email || "unknown@printpress.local"
    }
  });

  await prisma.outboxJob.create({
    data: {
      orderId: payload.orderId,
      type: "SEND_COMMUNICATION_EMAIL",
      payload: {
        communicationId: communication.id,
        toEmail: payload.toEmail,
        subject: payload.subject,
        body: payload.body
      }
    }
  });

  if (payload.orderId) {
    await prisma.activityLog.create({
      data: {
        orderId: payload.orderId,
        actorType: "STAFF",
        actorRef: session.user.email || "unknown@printpress.local",
        eventType: "COMMUNICATION_SENT",
        eventData: {
          communicationId: communication.id,
          subject: payload.subject,
          toEmail: payload.toEmail
        }
      }
    });
  }

  return Response.json({ ok: true, communicationId: communication.id }, { status: 201 });
}
