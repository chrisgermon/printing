import { prisma } from "@/lib/db";
import { auth } from "@/auth";
import { z } from "zod";

const createOrderSchema = z.object({
  customerEmail: z.string().email(),
  customerName: z.string().min(1),
  title: z.string().min(2),
  quantity: z.number().int().positive(),
  dueDate: z.string().datetime().optional(),
  notes: z.string().max(2000).optional()
});

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const payload = createOrderSchema.parse(await req.json());
  if (session.user.role === "CUSTOMER") {
    if (!session.user.customerId) {
      return Response.json({ error: "Customer user is not assigned to a customer record." }, { status: 403 });
    }

    const assignedCustomer = await prisma.customer.findUnique({
      where: { id: session.user.customerId }
    });
    if (!assignedCustomer) {
      return Response.json({ error: "Assigned customer not found." }, { status: 403 });
    }

    const order = await prisma.order.create({
      data: {
        customerId: assignedCustomer.id,
        title: payload.title,
        quantity: payload.quantity,
        dueDate: payload.dueDate ? new Date(payload.dueDate) : null,
        notes: payload.notes,
        status: "RECEIVED"
      }
    });

    await prisma.activityLog.create({
      data: {
        orderId: order.id,
        actorType: "CUSTOMER",
        actorRef: session.user.email || "unknown@printpress.local",
        eventType: "ORDER_CREATED",
        eventData: {
          quantity: order.quantity,
          title: order.title
        }
      }
    });

    await prisma.outboxJob.create({
      data: {
        orderId: order.id,
        type: "SEND_ORDER_CREATED_EMAIL",
        payload: {
          to: assignedCustomer.email,
          orderId: order.id
        }
      }
    });

    return Response.json({ orderId: order.id, status: order.status }, { status: 201 });
  }

  const customer = await prisma.customer.upsert({
    where: { email: payload.customerEmail },
    update: { name: payload.customerName },
    create: {
      email: payload.customerEmail,
      name: payload.customerName,
      companyId: session.user.companyId ?? null
    }
  });

  if (session.user.companyId && customer.companyId && customer.companyId !== session.user.companyId) {
    return Response.json({ error: "Target customer belongs to another company." }, { status: 403 });
  }
  if (session.user.companyId && !customer.companyId) {
    await prisma.customer.update({
      where: { id: customer.id },
      data: { companyId: session.user.companyId }
    });
  }

  const order = await prisma.order.create({
    data: {
      customerId: customer.id,
      title: payload.title,
      quantity: payload.quantity,
      dueDate: payload.dueDate ? new Date(payload.dueDate) : null,
      notes: payload.notes,
      status: "RECEIVED"
    }
  });

  await prisma.activityLog.create({
    data: {
      orderId: order.id,
      actorType: session.user.role === "CUSTOMER" ? "CUSTOMER" : "STAFF",
      actorRef: session.user.email || "unknown@printpress.local",
      eventType: "ORDER_CREATED",
      eventData: {
        quantity: order.quantity,
        title: order.title
      }
    }
  });

  await prisma.outboxJob.create({
    data: {
      orderId: order.id,
      type: "SEND_ORDER_CREATED_EMAIL",
      payload: {
        to: customer.email,
        orderId: order.id
      }
    }
  });

  return Response.json({ orderId: order.id, status: order.status }, { status: 201 });
}
