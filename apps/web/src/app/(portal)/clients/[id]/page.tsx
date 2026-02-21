import Link from "next/link";
import { prisma } from "@/lib/db";
import { requireSession } from "@/lib/auth";
import { CommunicationComposer } from "@/components/CommunicationComposer";
import { statusPillClass } from "@/lib/status";

type ClientPageProps = {
  params: Promise<{ id: string }>;
};

type ClientOrderRow = {
  id: string;
  title: string;
  createdAt: Date | string;
  quantity: number;
  status: string;
};

type CommunicationRow = {
  id: string;
  createdAt: Date | string;
  toEmail: string;
  subject: string;
  status: string;
};

type ActivityLogRow = {
  id: string;
  createdAt: Date | string;
  eventType: string;
  actorRef: string;
};

export default async function ClientDetailPage({ params }: ClientPageProps) {
  const { id } = await params;
  const session = await requireSession(["STAFF", "ADMIN"]);

  const customer = await prisma.customer
    .findUnique({
      where: { id },
      include: {
        orders: { orderBy: { createdAt: "desc" }, take: 20 }
      }
    })
    .catch(() => null);

  if (!customer) {
    return (
      <div className="stack-lg">
        <div className="breadcrumb">
          <Link href="/clients">Clients</Link>
          <span>/</span>
          <span>Not Found</span>
        </div>
        <article className="panel section">
          <div className="empty-state-portal">
            <p>Client not found</p>
            <span className="muted-text">This client may have been removed or the link is incorrect.</span>
            <Link className="btn" href="/clients" style={{ marginTop: 12 }}>
              Back to Clients
            </Link>
          </div>
        </article>
      </div>
    );
  }

  if (customer.companyId && session.companyId && customer.companyId !== session.companyId) {
    return (
      <div className="stack-lg">
        <article className="panel section">
          <h2>Access denied</h2>
          <p className="muted-text">This client belongs to another company workspace.</p>
        </article>
      </div>
    );
  }

  const [activityLogs, communications] = await Promise.all([
    prisma.activityLog
      .findMany({
        where: { order: { customerId: customer.id } },
        orderBy: { createdAt: "desc" },
        take: 20
      })
      .catch(() => []),
    prisma.communicationLog
      .findMany({
        where: { customerId: customer.id },
        orderBy: { createdAt: "desc" },
        take: 20
      })
      .catch(() => []),
  ]);

  const orders = customer.orders as ClientOrderRow[];

  return (
    <div className="stack-lg">
      <div className="breadcrumb">
        <Link href="/clients">Clients</Link>
        <span>/</span>
        <span>{customer.name}</span>
      </div>

      <article className="panel hero">
        <div>
          <h1>{customer.name}</h1>
          <p>
            {customer.email} · {customer.phone || "No phone"}
          </p>
        </div>
        <Link className="btn btn-primary" href="/orders/new">
          New Order
        </Link>
      </article>

      <div className="content-grid">
        <article className="panel section">
          <h2>Client Orders</h2>
          <div className="list">
            {orders.length === 0 && (
              <p className="muted-text">No orders yet.</p>
            )}
            {orders.map((order) => (
              <Link className="row row-link" href={`/orders/${order.id}`} key={order.id}>
                <div>
                  <strong>{order.title}</strong>
                  <span>
                    {new Date(order.createdAt).toLocaleDateString()} · {order.quantity.toLocaleString()} units
                  </span>
                </div>
                <div className={`pill ${statusPillClass(order.status)}`}>
                  {String(order.status).replaceAll("_", " ")}
                </div>
              </Link>
            ))}
          </div>
        </article>

        <article className="panel section">
          <h2>CRM Notes</h2>
          <CommunicationComposer customerId={customer.id} defaultTo={customer.email} />
          <div className="timeline">
            {communications.map((item: CommunicationRow) => (
              <div className="timeline-item" key={item.id}>
                <div className="timeline-meta">{new Date(item.createdAt).toLocaleString()} · {item.toEmail}</div>
                <strong>{item.subject}</strong>
                <span className="muted-text">{item.status}</span>
              </div>
            ))}
            {activityLogs.map((log: ActivityLogRow) => (
              <div className="timeline-item" key={log.id}>
                <div className="timeline-meta">{new Date(log.createdAt).toLocaleString()}</div>
                <strong>{log.eventType.replaceAll("_", " ")}</strong>
                <span className="muted-text">{log.actorRef}</span>
              </div>
            ))}
            {communications.length === 0 && activityLogs.length === 0 && (
              <p className="muted-text">No activity recorded yet.</p>
            )}
          </div>
        </article>
      </div>
    </div>
  );
}
