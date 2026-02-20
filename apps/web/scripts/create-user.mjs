import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

const email = process.argv[2];
const password = process.argv[3];
const role = process.argv[4] || "ADMIN";
const name = process.argv[5] || "PrintPress Admin";
const userType = process.argv[6] || (role === "CUSTOMER" ? "CLIENT" : "INTERNAL");
const companyId = process.argv[7] || undefined;
const customerId = process.argv[8] || undefined;

if (!email || !password) {
  console.error("Usage: node scripts/create-user.mjs <email> <password> [role] [name]");
  process.exit(1);
}

if (!["CUSTOMER", "STAFF", "ADMIN"].includes(role)) {
  console.error("role must be CUSTOMER, STAFF, or ADMIN");
  process.exit(1);
}
if (!["INTERNAL", "CLIENT"].includes(userType)) {
  console.error("userType must be INTERNAL or CLIENT");
  process.exit(1);
}
if (userType === "CLIENT" && !customerId) {
  console.error("client users require customerId");
  process.exit(1);
}
if (userType === "INTERNAL" && role === "CUSTOMER") {
  console.error("internal users must be STAFF or ADMIN");
  process.exit(1);
}
if (userType === "CLIENT" && role !== "CUSTOMER") {
  console.error("client users must use CUSTOMER role");
  process.exit(1);
}

const passwordHash = await bcrypt.hash(password, 12);

const user = await prisma.userAccount.upsert({
  where: { email: email.toLowerCase() },
  update: { name, role, userType, companyId, customerId, passwordHash, isActive: true },
  create: { name, email: email.toLowerCase(), role, userType, companyId, customerId, passwordHash }
});

console.log(`User ready: ${user.email} (${user.role})`);
await prisma.$disconnect();
