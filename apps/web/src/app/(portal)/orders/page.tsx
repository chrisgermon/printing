import Link from "next/link";
import { prisma } from "@/lib/db";
import { requireSession } from "@/lib/auth";
import { statusPillClass } from "@/lib/status";

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

  return (
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
            <option value="PROOF_PREPARING">Proof Preparing</option>
            <option value="PROOF_SENT">Proof Sent</option>
            <option value="AWAITING_APPROVAL">Awaiting Approval</option>
            <option value="APPROVED">Approved</option>
            <option value="PRINTING">Printing</option>
            <option value="READY_TO_SHIP">Ready to Ship</option>
            <option value="SHIPPED">Shipped</option>
            <option value="DELIVERED">Delivered</option>
            <option value="CANCELLED">Cancelled</option>
          </select>
          <button className="btn" type="submit">
            Apply
          </button>
        </form>

        <div className="list">
          {orders.length === 0 && (
            <div className="empty-state-portal">
              <p>No orders found</p>
              <span className="muted-text">
                {q || status !== "ALL"
                  ? "Try adjusting your filters."
                  : "Get started by creating your first order."}
              </span>
              {!q && status === "ALL" && (
                <Link className="btn btn-primary" href="/orders/new" style={{ marginTop: 12 }}>
                  Create Order
                </Link>
              )}
            </div>
          )}
          {orders.map((order) => (
            <Link className="row row-link" href={`/orders/${order.id}`} key={order.id}>
              <div>
                <strong>{order.title}</strong>
                <span>
                  {order.customer?.name ?? "Unknown"} · {order.quantity.toLocaleString()} units
                </span>
              </div>
              <div className={`pill ${statusPillClass(order.status)}`}>
                {order.status.replaceAll("_", " ")}
              </div>
            </Link>
          ))}
        </div>

        {orders.length > 0 && (
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
        )}
      </article>
    </div>
  );
}
