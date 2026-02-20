import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const companyName = process.argv[2];
const customerName = process.argv[3];
const customerEmail = process.argv[4];

if (!companyName) {
  console.error("Usage: node scripts/bootstrap-org.mjs <companyName> [customerName] [customerEmail]");
  process.exit(1);
}

const company = await prisma.company.upsert({
  where: { name: companyName },
  update: {},
  create: { name: companyName, isInternal: false }
});

let customer = null;
if (customerName && customerEmail) {
  customer = await prisma.customer.upsert({
    where: { email: customerEmail.toLowerCase() },
    update: { name: customerName, companyId: company.id },
    create: {
      name: customerName,
      email: customerEmail.toLowerCase(),
      companyId: company.id,
      company: company.name
    }
  });
}

console.log(`Company: ${company.name} (${company.id})`);
if (customer) {
  console.log(`Customer: ${customer.name} (${customer.id})`);
}

await prisma.$disconnect();
