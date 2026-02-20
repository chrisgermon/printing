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

const createSchema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
  password: z.string().min(8),
  role: z.enum(["CUSTOMER", "STAFF", "ADMIN"]),
  userType: z.enum(["INTERNAL", "CLIENT"]),
  companyId: z.string().min(1),
  customerId: z.string().min(1).optional(),
  isActive: z.boolean().optional()
});

export async function GET() {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }

  const users = await prisma.userAccount.findMany({
    orderBy: { createdAt: "desc" },
    select: safeSelect
  });

  return Response.json({ users });
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }

  const payload = createSchema.parse(await req.json());
  if (payload.userType === "CLIENT" && !payload.customerId) {
    return Response.json({ error: "Client users require customer assignment." }, { status: 400 });
  }
  if (payload.userType === "INTERNAL" && payload.customerId) {
    return Response.json({ error: "Internal users cannot have customer assignment." }, { status: 400 });
  }
  if (payload.userType === "INTERNAL" && payload.role === "CUSTOMER") {
    return Response.json({ error: "Internal users must be STAFF or ADMIN." }, { status: 400 });
  }
  if (payload.userType === "CLIENT" && payload.role !== "CUSTOMER") {
    return Response.json({ error: "Client users must use CUSTOMER role." }, { status: 400 });
  }
  if (payload.customerId) {
    const customer = await prisma.customer.findUnique({ where: { id: payload.customerId } });
    if (!customer) {
      return Response.json({ error: "Customer not found." }, { status: 404 });
    }
    if (customer.companyId && customer.companyId !== payload.companyId) {
      return Response.json({ error: "Customer belongs to a different company." }, { status: 400 });
    }
  }

  const passwordHash = await hash(payload.password, 12);
  const user = await prisma.userAccount.create({
    data: {
      name: payload.name,
      email: payload.email.toLowerCase(),
      passwordHash,
      role: payload.role,
      userType: payload.userType,
      companyId: payload.companyId,
      customerId: payload.customerId,
      isActive: payload.isActive ?? true
    },
    select: safeSelect
  });

  return Response.json({ user }, { status: 201 });
}
