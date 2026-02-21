import Link from "next/link";
import { prisma } from "@/lib/db";
import { requireSession } from "@/lib/auth";

const PAGE_SIZE = 10;

type ClientsPageProps = {
  searchParams?: {
    q?: string;
    page?: string;
  };
};

export default async function ClientsPage({ searchParams }: ClientsPageProps) {
  const session = await requireSession(["STAFF", "ADMIN"]);
  const q = (searchParams?.q || "").trim();
  const page = Math.max(1, Number(searchParams?.page || "1") || 1);

  const where: Record<string, unknown> = {};
  const and: Record<string, unknown>[] = [];

  if (session.companyId) {
    and.push({ companyId: session.companyId });
  }

  if (q) {
    and.push({
      OR: [
        { name: { contains: q, mode: "insensitive" } },
        { email: { contains: q, mode: "insensitive" } },
      ],
    });
  }

  if (and.length) {
    where.AND = and;
  }

  const [customers, total] = await Promise.all([
    prisma.customer.findMany({
      where,
      include: {
        _count: { select: { orders: true } },
        orders: { orderBy: { createdAt: "desc" }, take: 1, select: { createdAt: true } },
      },
      orderBy: { name: "asc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
    }),
    prisma.customer.count({ where }),
  ]);

  const pageCount = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <div className="stack-lg">
      <article className="panel hero">
        <div>
          <h1>Clients</h1>
          <p>Manage your customer accounts and view order history.</p>
        </div>
      </article>

      <article className="panel section">
        <form className="filter-row filter-row-2col" method="GET">
          <input defaultValue={q} name="q" placeholder="Search by name or email" />
          <button className="btn" type="submit">
            Search
          </button>
        </form>

        <div className="list">
          {customers.length === 0 && (
            <div className="empty-state-portal">
              <p>No clients found</p>
              <span className="muted-text">
                {q ? "Try a different search term." : "Clients will appear here when orders are created."}
              </span>
            </div>
          )}
          {customers.map((customer) => (
            <Link
              className="row row-link"
              href={`/clients/${customer.id}`}
              key={customer.id}
            >
              <div>
                <strong>{customer.name}</strong>
                <span>{customer.email}</span>
              </div>
              <div className="row-meta">
                <span className="muted-text">
                  {customer._count.orders} order{customer._count.orders !== 1 ? "s" : ""}
                </span>
                {customer.orders[0] && (
                  <span className="muted-text">
                    Last: {new Date(customer.orders[0].createdAt).toLocaleDateString()}
                  </span>
                )}
              </div>
            </Link>
          ))}
        </div>

        {customers.length > 0 && (
          <div className="pagination-row">
            <Link
              className="btn"
              href={`/clients?${new URLSearchParams({ q, page: String(Math.max(1, page - 1)) })}`}
            >
              Previous
            </Link>
            <span className="muted-text">
              Page {page} of {pageCount}
            </span>
            <Link
              className="btn"
              href={`/clients?${new URLSearchParams({ q, page: String(Math.min(pageCount, page + 1)) })}`}
            >
              Next
            </Link>
          </div>
        )}
      </article>
    </div>
  );
}
