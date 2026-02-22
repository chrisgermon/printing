export const dynamic = 'force-dynamic';

import { prisma } from "@/lib/db";
import { auth } from "@/auth";
import { z } from "zod";
import { logAudit } from "@/lib/audit";

const createSchema = z.object({
  name: z.string().min(1, "Company name is required"),
  isInternal: z.boolean().default(false)
});

export async function GET() {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }

  const companies = await prisma.company.findMany({
    orderBy: { name: "asc" },
    include: {
      _count: {
        select: { customers: true, userAccounts: true }
      },
      settings: true
    }
  });

  return Response.json({ companies });
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }

  const payload = createSchema.parse(await req.json());

  // Check for duplicate name
  const existing = await prisma.company.findUnique({
    where: { name: payload.name }
  });
  
  if (existing) {
    return Response.json(
      { error: "A company with this name already exists" },
      { status: 400 }
    );
  }

  const company = await prisma.company.create({
    data: {
      name: payload.name,
      isInternal: payload.isInternal
    }
  });

  // Create default settings for the company
  await prisma.companySettings.create({
    data: {
      companyId: company.id
    }
  });

  // Create default email templates for the company
  const defaultTemplates = [
    {
      name: "ORDER_CREATED",
      subject: "Your order has been received",
      textBody: "Hi there,\n\nYour order {{orderId}} has been received and entered into production planning.\n\nWe'll keep you updated on its progress.",
      description: "Sent when a new order is created"
    },
    {
      name: "STATUS_UPDATE",
      subject: "Order status updated",
      textBody: "Hi there,\n\nYour order {{orderId}} status has been updated to: {{status}}.\n\nThanks for your business!",
      description: "Sent when order status changes"
    },
    {
      name: "PROOF_REVIEW",
      subject: "Proof review update",
      textBody: "Hi there,\n\nThe proof for your order {{orderId}} has been reviewed with status: {{status}}.\n\nNotes: {{notes}}",
      description: "Sent when staff reviews a proof"
    },
    {
      name: "PROOF_CUSTOMER_RESPONSE",
      subject: "Proof response received",
      textBody: "Hi there,\n\nCustomer has responded to proof for order {{orderId}} with: {{status}}.\n\nNotes: {{notes}}",
      description: "Sent when customer responds to proof"
    }
  ];

  for (const template of defaultTemplates) {
    await prisma.emailTemplate.create({
      data: {
        ...template,
        companyId: company.id,
        createdBy: session.user.email || "system"
      }
    });
  }

  await logAudit({
    actorId: session.user.id,
    actorEmail: session.user.email || "unknown",
    actorRole: session.user.role,
    action: "CREATE",
    resource: "COMPANY",
    resourceId: company.id,
    details: { name: payload.name, isInternal: payload.isInternal }
  });

  return Response.json({ company }, { status: 201 });
}
