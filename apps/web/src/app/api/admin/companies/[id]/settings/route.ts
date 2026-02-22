export const dynamic = 'force-dynamic';

import { prisma } from "@/lib/db";
import { auth } from "@/auth";
import { z } from "zod";
import { logAudit } from "@/lib/audit";

const settingsSchema = z.object({
  // Email Configuration
  emailFromName: z.string().optional().nullable(),
  emailFromAddress: z.string().email().optional().nullable(),
  emailReplyTo: z.string().email().optional().nullable(),
  useCustomEmailProvider: z.boolean().optional(),
  customPostmarkToken: z.string().optional().nullable(),
  customMailgunDomain: z.string().optional().nullable(),
  customMailgunApiKey: z.string().optional().nullable(),
  
  // Feature Toggles
  enableProofWorkflow: z.boolean().optional(),
  enableCustomerPortal: z.boolean().optional(),
  enableAutoNotifications: z.boolean().optional(),
  requireProofApproval: z.boolean().optional(),
  
  // Branding
  brandLogoUrl: z.string().url().optional().nullable(),
  brandPrimaryColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional().nullable(),
  customEmailFooter: z.string().max(1000).optional().nullable(),
  
  // Notifications
  notifyOnOrderCreated: z.boolean().optional(),
  notifyOnStatusUpdate: z.boolean().optional(),
  notifyOnProofReview: z.boolean().optional(),
  notifyOnProofResponse: z.boolean().optional()
});

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }

  const settings = await prisma.companySettings.findUnique({
    where: { companyId: id }
  });

  if (!settings) {
    // Create default settings if they don't exist
    const newSettings = await prisma.companySettings.create({
      data: { companyId: id }
    });
    return Response.json({ settings: newSettings });
  }

  return Response.json({ settings });
}

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }

  const company = await prisma.company.findUnique({ where: { id } });
  if (!company) {
    return Response.json({ error: "Company not found" }, { status: 404 });
  }

  const payload = settingsSchema.parse(await req.json());

  const existing = await prisma.companySettings.findUnique({
    where: { companyId: id }
  });

  const settings = await prisma.companySettings.upsert({
    where: { companyId: id },
    create: {
      companyId: id,
      ...payload
    },
    update: payload
  });

  // Mask sensitive fields in audit log
  const auditPayload = { ...payload };
  if (auditPayload.customPostmarkToken) auditPayload.customPostmarkToken = "***REDACTED***";
  if (auditPayload.customMailgunApiKey) auditPayload.customMailgunApiKey = "***REDACTED***";

  await logAudit({
    actorId: session.user.id,
    actorEmail: session.user.email || "unknown",
    actorRole: session.user.role,
    action: existing ? "UPDATE" : "CREATE",
    resource: "COMPANY_SETTINGS",
    resourceId: settings.id,
    companyId: id,
    details: auditPayload
  });

  return Response.json({ settings });
}
