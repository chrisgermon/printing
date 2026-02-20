import Link from "next/link";
import { prisma } from "@/lib/db";
import { demoClient } from "@/lib/demo-data";
import { requireSession } from "@/lib/auth";
import { CommunicationComposer } from "@/components/CommunicationComposer";

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
  if (customer && customer.companyId && session.companyId && customer.companyId !== session.companyId) {
    return (
      <main className="portal-shell">
        <article className="panel section">
          <h2>Access denied</h2>
          <p className="muted-text">This client belongs to another company workspace.</p>
        </article>
      </main>
    );
  }

  const activityLogs = customer
    ? await prisma.activityLog
        .findMany({
          where: { order: { customerId: customer.id } },
          orderBy: { createdAt: "desc" },
          take: 20
        })
        .catch(() => [])
    : [];

  const communications = customer
    ? await prisma.communicationLog
        .findMany({
          where: { customerId: customer.id },
          orderBy: { createdAt: "desc" },
          take: 20
        })
        .catch(() => [])
    : [];

  const data = customer
    ? {
        ...customer,
        activityLogs,
        communications
      }
    : demoClient;
  const orders = data.orders as ClientOrderRow[];
  const activity = data.activityLogs as ActivityLogRow[];
  const crm = ("communications" in data ? data.communications : []) as CommunicationRow[];

  return (
    <main className="portal-shell">
      <div className="stack-lg">
        <article className="panel hero">
          <div>
            <h1>{data.name}</h1>
            <p>
              {data.email} · {data.phone || "No phone"}
            </p>
          </div>
          <Link className="btn" href="/orders/new">
            New Order For Client
          </Link>
        </article>

        <div className="content-grid">
          <article className="panel section">
            <h2>Client Orders</h2>
            <div className="list">
              {orders.map((order) => (
                <div className="row" key={order.id}>
                  <div>
                    <strong>{order.title}</strong>
                    <span>
                      {new Date(order.createdAt).toLocaleDateString()} · {order.quantity.toLocaleString()} units
                    </span>
                  </div>
                  <div className="pill">{String(order.status).replaceAll("_", " ")}</div>
                </div>
              ))}
            </div>
          </article>

          <article className="panel section">
            <h2>CRM Notes</h2>
            <CommunicationComposer customerId={data.id} defaultTo={data.email} />
            <div className="timeline">
              {crm.map((item) => (
                <div className="timeline-item" key={item.id}>
                  <div className="timeline-meta">{new Date(item.createdAt).toLocaleString()} · {item.toEmail}</div>
                  <strong>{item.subject}</strong>
                  <span className="muted-text">{item.status}</span>
                </div>
              ))}
              {activity.map((log) => (
                <div className="timeline-item" key={log.id}>
                  <div className="timeline-meta">{new Date(log.createdAt).toLocaleString()}</div>
                  <strong>{log.eventType.replaceAll("_", " ")}</strong>
                  <span className="muted-text">{log.actorRef}</span>
                </div>
              ))}
            </div>
          </article>
        </div>
      </div>
    </main>
  );
}
