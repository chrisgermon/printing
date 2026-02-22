import { prisma } from "@/lib/db";
import { headers } from "next/headers";
import { Prisma } from "@prisma/client";

export type AuditAction = 
  | "CREATE" 
  | "UPDATE" 
  | "DELETE" 
  | "LOGIN" 
  | "LOGOUT"
  | "SEND_EMAIL"
  | "UPLOAD_FILE"
  | "DOWNLOAD_FILE";

export type AuditResource =
  | "USER"
  | "COMPANY"
  | "COMPANY_SETTINGS"
  | "EMAIL_TEMPLATE"
  | "SYSTEM_SETTINGS"
  | "ORDER"
  | "CUSTOMER"
  | "PROOF"
  | "COMMUNICATION";

export interface AuditLogInput {
  actorId?: string;
  actorEmail: string;
  actorRole: string;
  action: AuditAction;
  resource: AuditResource;
  resourceId?: string;
  details?: Record<string, unknown>;
  companyId?: string;
}

export async function logAudit(input: AuditLogInput): Promise<void> {
  try {
    const headersList = await headers();
    const ipAddress = headersList.get("x-forwarded-for") || 
                      headersList.get("x-real-ip") || 
                      "unknown";
    const userAgent = headersList.get("user-agent") || "unknown";

    await prisma.auditLog.create({
      data: {
        actorId: input.actorId,
        actorEmail: input.actorEmail,
        actorRole: input.actorRole,
        action: input.action,
        resource: input.resource,
        resourceId: input.resourceId,
        details: (input.details || {}) as Prisma.InputJsonValue,
        companyId: input.companyId,
        ipAddress: ipAddress.split(",")[0].trim(), // Take first IP if multiple
        userAgent
      }
    });
  } catch (error) {
    // Don't throw - audit logging should never break the main flow
    console.error("[audit] Failed to log audit entry:", error);
  }
}

// Helper for system actions (no user)
export async function logSystemAudit(
  action: AuditAction,
  resource: AuditResource,
  resourceId?: string,
  details?: Record<string, unknown>
): Promise<void> {
  await logAudit({
    actorEmail: "system",
    actorRole: "SYSTEM",
    action,
    resource,
    resourceId,
    details
  });
}
