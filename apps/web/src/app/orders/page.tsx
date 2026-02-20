import Link from "next/link";
import { prisma } from "@/lib/db";
import { requireSession } from "@/lib/auth";
import { demoClient } from "@/lib/demo-data";

const PAGE_SIZE = 8;

type OrdersPageProps = {
  searchParams?: {
    q?: string;
    status?: string;
    page?: string;
  };
};

export default async function OrdersPage({ searchParams }: OrdersPageProps) {
  const session = await requireSession();
  const q = (searchParams?.q || "").trim();
  const status = (searchParams?.status || "ALL").trim();
  const page = Math.max(1, Number(searchParams?.page || "1") || 1);

  const where: Record<string, unknown> = {};
  const and: Record<string, unknown>[] = [];

  if (session.role === "CUSTOMER") {
    if (session.customerId) {
      and.push({ customerId: session.customerId });
    } else {
      and.push({ customer: { email: session.email } });
    }
  } else if (session.companyId) {
    and.push({ customer: { companyId: session.companyId } });
  }

  if (status !== "ALL") {
    and.push({ status });
  }

  if (q) {
    and.push({
      OR: [
        { id: { contains: q, mode: "insensitive" } },
        { title: { contains: q, mode: "insensitive" } },
        { customer: { name: { contains: q, mode: "insensitive" } } },
        { customer: { email: { contains: q, mode: "insensitive" } } }
      ]
    });
  }

  if (and.length) {
    where.AND = and;
  }

  const [orders, total] = await Promise.all([
    prisma.order
      .findMany({
        where,
        include: { customer: true },
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * PAGE_SIZE,
        take: PAGE_SIZE
      })
      .catch(() => []),
    prisma.order.count({ where }).catch(() => 0)
  ]);

  const pageCount = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const hasData = orders.length > 0;
  const fallbackOrders = demoClient.orders;

  return (
    <main className="portal-shell">
      <div className="stack-lg">
        <article className="panel hero">
          <div>
            <h1>Orders</h1>
            <p>Search, filter, and track production jobs across the operation.</p>
          </div>
          <Link className="btn btn-primary" href="/orders/new">
            New Order
          </Link>
        </article>

        <article className="panel section">
          <form className="filter-row" method="GET">
            <input defaultValue={q} name="q" placeholder="Search by ID, title, or client" />
            <select defaultValue={status} name="status">
              <option value="ALL">All Statuses</option>
              <option value="RECEIVED">Received</option>
              <option value="PROOF_SENT">Proof Sent</option>
              <option value="PRINTING">Printing</option>
              <option value="SHIPPED">Shipped</option>
              <option value="DELIVERED">Delivered</option>
            </select>
            <button className="btn" type="submit">
              Apply
            </button>
          </form>

          <div className="list">
            {(hasData ? orders : fallbackOrders).map((order) => (
              <Link className="row row-link" href={`/orders/${order.id}`} key={order.id}>
                <div>
                  <strong>{order.title}</strong>
                  <span>
                    {"customer" in order ? order.customer.name : "CrowdClick Agency"} · {order.quantity.toLocaleString()} units
                  </span>
                </div>
                <div className="pill">{String(order.status).replaceAll("_", " ")}</div>
              </Link>
            ))}
          </div>

          <div className="pagination-row">
            <Link className="btn" href={`/orders?${new URLSearchParams({ q, status, page: String(Math.max(1, page - 1)) })}`}>
              Previous
            </Link>
            <span className="muted-text">
              Page {page} of {pageCount}
            </span>
            <Link className="btn" href={`/orders?${new URLSearchParams({ q, status, page: String(Math.min(pageCount, page + 1)) })}`}>
              Next
            </Link>
          </div>
        </article>
      </div>
    </main>
  );
}
