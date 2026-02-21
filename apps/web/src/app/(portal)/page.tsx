import Link from "next/link";
import { redirect } from "next/navigation";
import { requireSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { statusPillClass } from "@/lib/status";

const STATUS_LABELS: Record<string, string> = {
  RECEIVED: "Received",
  PROOF_PREPARING: "Proof Preparing",
  PROOF_SENT: "Proof Sent",
  AWAITING_APPROVAL: "Awaiting Approval",
  APPROVED: "Approved",
  PRINTING: "Printing",
  READY_TO_SHIP: "Ready to Ship",
  SHIPPED: "Shipped",
  DELIVERED: "Delivered",
  CANCELLED: "Cancelled"
};

export default async function HomePage() {
  const session = await requireSession();

  if (session.role === "CUSTOMER") {
    redirect("/orders");
  }

  const companyFilter =
    session.role === "ADMIN" ? {} : { customer: { companyId: session.companyId } };
  const proofCompanyFilter =
    session.role === "ADMIN" ? {} : { order: { customer: { companyId: session.companyId } } };

  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const todayEnd = new Date();
  todayEnd.setHours(23, 59, 59, 999);

  const [activeJobs, proofsWaiting, shippingToday, atRisk, pipelineRaw, proofQueue] =
    await Promise.all([
      prisma.order.count({
        where: { ...companyFilter, status: { notIn: ["DELIVERED", "CANCELLED"] } }
      }),
      prisma.proofFile.count({
        where: { ...proofCompanyFilter, reviewStatus: "PENDING" }
      }),
      prisma.order.count({
        where: {
          ...companyFilter,
          status: "READY_TO_SHIP",
          dueDate: { gte: todayStart, lte: todayEnd }
        }
      }),
      prisma.order.count({
        where: {
          ...companyFilter,
          status: { notIn: ["DELIVERED", "CANCELLED"] },
          dueDate: { lt: todayStart }
        }
      }),
      prisma.order.groupBy({
        by: ["status"],
        _count: true,
        where: { ...companyFilter, status: { notIn: ["DELIVERED", "CANCELLED"] } }
      }),
      prisma.proofFile.findMany({
        where: { ...proofCompanyFilter, reviewStatus: "PENDING" },
        include: { order: { include: { customer: true } } },
        orderBy: { createdAt: "desc" },
        take: 10
      })
    ]);

  const kpis = [
    { label: "Active Jobs", value: activeJobs },
    { label: "Proofs Waiting", value: proofsWaiting },
    { label: "Shipping Today", value: shippingToday },
    { label: "At Risk", value: atRisk }
  ];

  const pipeline = pipelineRaw
    .sort((a, b) => {
      const order = [
        "RECEIVED",
        "PROOF_PREPARING",
        "PROOF_SENT",
        "AWAITING_APPROVAL",
        "APPROVED",
        "PRINTING",
        "READY_TO_SHIP",
        "SHIPPED"
      ];
      return order.indexOf(a.status) - order.indexOf(b.status);
    })
    .map((row) => ({
      status: STATUS_LABELS[row.status] || row.status,
      rawStatus: row.status,
      count: row._count
    }));

  return (
    <>
      <article className="panel hero">
        <div>
          <h1>Operations Dashboard</h1>
          <p>
            Track every job from quote to delivery. Signed in as {session.name} ({session.role}).
          </p>
        </div>
        <div className="hero-side">
          {atRisk > 0 && (
            <div className="badge badge-warning">{atRisk} job{atRisk !== 1 ? "s" : ""} at risk</div>
          )}
        </div>
      </article>

      <div className="action-row">
        <Link className="btn btn-primary" href="/orders/new">
          New Order
        </Link>
        <Link className="btn" href="/orders">
          Order List
        </Link>
      </div>

      <div className="kpi-grid">
        {kpis.map((kpi) => (
          <article key={kpi.label} className="panel kpi-card">
            <div className="kpi-label">{kpi.label}</div>
            <div className="kpi-value">{kpi.value}</div>
          </article>
        ))}
      </div>

      <div className="content-grid">
        <article className="panel section">
          <h2>Production Pipeline</h2>
          <div className="list">
            {pipeline.length === 0 && (
              <p className="muted-text">No active orders</p>
            )}
            {pipeline.map((stage) => (
              <div key={stage.status} className="row">
                <div>
                  <strong>{stage.status}</strong>
                </div>
                <div className={`pill ${statusPillClass(stage.rawStatus)}`}>
                  {stage.count} order{stage.count !== 1 ? "s" : ""}
                </div>
              </div>
            ))}
          </div>
        </article>

        <article className="panel section">
          <h2>Proof Queue</h2>
          <div className="list">
            {proofQueue.length === 0 && (
              <p className="muted-text">No pending proofs</p>
            )}
            {proofQueue.map((proof) => (
              <Link
                key={proof.id}
                href={`/orders/${proof.orderId}`}
                className="row row-link"
              >
                <div>
                  <strong>{proof.order.title}</strong>
                  <span>{proof.order.customer.name} &middot; {proof.fileName}</span>
                </div>
                <div className="pill">
                  {timeAgo(proof.createdAt)}
                </div>
              </Link>
            ))}
          </div>
        </article>
      </div>
    </>
  );
}

function timeAgo(date: Date): string {
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}
