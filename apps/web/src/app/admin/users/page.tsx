import { requireSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { UserManagementPanel } from "@/components/UserManagementPanel";

export default async function AdminUsersPage() {
  await requireSession(["ADMIN"]);

  const [companies, customers, users] = await Promise.all([
    prisma.company.findMany({ orderBy: { name: "asc" } }).catch(() => []),
    prisma.customer.findMany({ orderBy: { name: "asc" } }).catch(() => []),
    prisma.userAccount
      .findMany({
        orderBy: { createdAt: "desc" },
        include: {
          company: true,
          customer: true
        }
      })
      .catch(() => [])
  ]);

  return (
    <main className="portal-shell">
      <article className="panel hero">
        <div>
          <h1>User Administration</h1>
          <p>Manage internal and client users assigned to companies and client records.</p>
        </div>
      </article>
      <UserManagementPanel companies={companies} customers={customers} users={users} />
    </main>
  );
}
