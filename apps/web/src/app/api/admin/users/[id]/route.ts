import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { hash } from "bcryptjs";
import { z } from "zod";

const safeSelect = {
  id: true,
  name: true,
  email: true,
  role: true,
  userType: true,
  isActive: true,
  companyId: true,
  customerId: true,
  createdAt: true,
  company: { select: { id: true, name: true } },
  customer: { select: { id: true, name: true, email: true } }
} as const;

const updateSchema = z.object({
  name: z.string().min(1).optional(),
  password: z.string().min(8).optional(),
  role: z.enum(["CUSTOMER", "STAFF", "ADMIN"]).optional(),
  userType: z.enum(["INTERNAL", "CLIENT"]).optional(),
  companyId: z.string().min(1).optional(),
  customerId: z.string().min(1).nullable().optional(),
  isActive: z.boolean().optional()
});

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }

  const payload = updateSchema.parse(await req.json());
  const existing = await prisma.userAccount.findUnique({ where: { id: params.id } });
  if (!existing) {
    return Response.json({ error: "User not found" }, { status: 404 });
  }

  const finalUserType = payload.userType ?? existing.userType;
  const finalRole = payload.role ?? existing.role;
  const finalCustomerId = payload.customerId === undefined ? existing.customerId : payload.customerId;
  const finalCompanyId = payload.companyId ?? existing.companyId;

  if (finalUserType === "CLIENT" && !finalCustomerId) {
    return Response.json({ error: "Client users require customer assignment." }, { status: 400 });
  }
  if (finalUserType === "INTERNAL" && finalRole === "CUSTOMER") {
    return Response.json({ error: "Internal users must be STAFF or ADMIN." }, { status: 400 });
  }
  if (finalUserType === "CLIENT" && finalRole !== "CUSTOMER") {
    return Response.json({ error: "Client users must use CUSTOMER role." }, { status: 400 });
  }

  const data: Record<string, unknown> = { ...payload };
  delete data.password;
  if (finalUserType === "INTERNAL") {
    data.customerId = null;
  }

  if (payload.password) {
    data.passwordHash = await hash(payload.password, 12);
  }

  if (finalCustomerId) {
    const customer = await prisma.customer.findUnique({ where: { id: finalCustomerId } });
    if (!customer) {
      return Response.json({ error: "Customer not found." }, { status: 404 });
    }
    const targetCompanyId = finalCompanyId ?? customer.companyId;
    if (customer.companyId && targetCompanyId && customer.companyId !== targetCompanyId) {
      return Response.json({ error: "Customer belongs to a different company." }, { status: 400 });
    }
  }

  const user = await prisma.userAccount.update({
    where: { id: params.id },
    data,
    select: safeSelect
  });

  return Response.json({ user });
}
