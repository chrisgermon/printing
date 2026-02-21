import Link from "next/link";
import { OrderStatusUpdateForm } from "@/components/OrderStatusUpdateForm";
import { ProofUploadForm } from "@/components/ProofUploadForm";
import { ProofReviewActions } from "@/components/ProofReviewActions";
import { CommunicationComposer } from "@/components/CommunicationComposer";
import { CustomerProofResponseActions } from "@/components/CustomerProofResponseActions";
import { prisma } from "@/lib/db";
import { requireSession } from "@/lib/auth";
import { statusPillClass } from "@/lib/status";

type OrderPageProps = {
  params: Promise<{ id: string }>;
};

type ProofFile = {
  id: string;
  fileName: string;
  createdAt: Date | string;
  reviewStatus: string;
};

type Communication = {
  id: string;
  createdAt: Date | string;
  toEmail: string;
  subject: string;
  status: string;
};

type ActivityLog = {
  id: string;
  createdAt: Date | string;
  actorRef: string;
  eventType: string;
};

export default async function OrderDetailPage({ params }: OrderPageProps) {
  const { id } = await params;
  const session = await requireSession();
  const order = await prisma.order
    .findUnique({
      where: { id },
      include: {
        customer: true,
        proofFiles: { orderBy: { createdAt: "desc" } },
        activityLogs: { orderBy: { createdAt: "desc" } },
        communications: { orderBy: { createdAt: "desc" }, take: 20 }
      }
    })
    .catch(() => null);

  if (!order) {
    return (
      <div className="stack-lg">
        <div className="breadcrumb">
          <Link href="/orders">Orders</Link>
          <span>/</span>
          <span>Not Found</span>
        </div>
        <article className="panel section">
          <div className="empty-state-portal">
            <p>Order not found</p>
            <span className="muted-text">This order may have been removed or the link is incorrect.</span>
            <Link className="btn" href="/orders" style={{ marginTop: 12 }}>
              Back to Orders
            </Link>
          </div>
        </article>
      </div>
    );
  }

  const isCustomerOwner = session.customerId ? order.customer.id === session.customerId : order.customer.email === session.email;
  const inCompanyScope = !session.companyId || !order.customer.companyId || session.companyId === order.customer.companyId;
  const canView = (session.role !== "CUSTOMER" || isCustomerOwner) && inCompanyScope;
  const canUpdateStatus = ["STAFF", "ADMIN"].includes(session.role);
  const canCustomerRespond = session.role === "CUSTOMER";

  if (!canView) {
    return (
      <div className="stack-lg">
        <article className="panel section">
          <h2>Access denied</h2>
          <p className="muted-text">Customers can only view their own orders.</p>
        </article>
      </div>
    );
  }

  return (
    <div className="stack-lg">
      <div className="breadcrumb">
        <Link href="/orders">Orders</Link>
        <span>/</span>
        <span>{order.title}</span>
      </div>

      <article className="panel hero">
        <div>
          <h1>{order.title}</h1>
          <p>
            Order <strong>{order.id.slice(0, 8)}...</strong> for {order.customer.name} · {order.quantity.toLocaleString()} units
          </p>
        </div>
        <div className={`pill pill-lg ${statusPillClass(order.status)}`}>
          {order.status.replaceAll("_", " ")}
        </div>
      </article>

      <div className="content-grid">
        <article className="panel section">
          <h2>Order Summary</h2>
          <div className="detail-grid">
            <div>
              <span className="muted-text">Status</span>
              <strong className={statusPillClass(order.status).replace("pill-", "text-status-")}>
                {order.status.replaceAll("_", " ")}
              </strong>
            </div>
            <div>
              <span className="muted-text">Due Date</span>
              <strong>{order.dueDate ? new Date(order.dueDate).toLocaleDateString() : "Unscheduled"}</strong>
            </div>
            <div>
              <span className="muted-text">Quoted Value</span>
              <strong>{order.quotedAmount ? `$${String(order.quotedAmount)}` : "Pending"}</strong>
            </div>
            <div>
              <span className="muted-text">Tracking</span>
              <strong>{order.trackingCode || "Not shipped"}</strong>
            </div>
          </div>

          <p className="muted-block">{order.notes || "No additional production notes."}</p>

          {canUpdateStatus ? <OrderStatusUpdateForm orderId={order.id} currentStatus={String(order.status)} /> : null}
          <ProofUploadForm orderId={order.id} />
        </article>

        <article className="panel section">
          <h2>Proof Files</h2>
          <div className="list">
            {order.proofFiles.length ? (
              order.proofFiles.map((proof: ProofFile) => (
                <div className="row" key={proof.id}>
                  <div>
                    <strong>{proof.fileName}</strong>
                    <span>{new Date(proof.createdAt).toLocaleString()}</span>
                  </div>
                  <div className="pill">{proof.reviewStatus.replaceAll("_", " ")}</div>
                </div>
              ))
            ) : (
              <p className="muted-text">No proofs uploaded yet.</p>
            )}
          </div>
          {canUpdateStatus ? (
            <div className="stack-sm">
              {order.proofFiles.map((proof: ProofFile) => (
                <ProofReviewActions key={proof.id} proofId={proof.id} />
              ))}
            </div>
          ) : null}
          {canCustomerRespond ? (
            <div className="stack-sm">
              {order.proofFiles.map((proof: ProofFile) => (
                <CustomerProofResponseActions key={proof.id} proofId={proof.id} />
              ))}
            </div>
          ) : null}
        </article>
      </div>

      {canUpdateStatus ? (
        <article className="panel section">
          <h2>Send Client Communication</h2>
          <CommunicationComposer customerId={order.customer.id} defaultTo={order.customer.email} orderId={order.id} />
          {order.communications.length ? (
            <div className="timeline">
              {order.communications.map((item: Communication) => (
                <div className="timeline-item" key={item.id}>
                  <div className="timeline-meta">{new Date(item.createdAt).toLocaleString()} · {item.toEmail}</div>
                  <strong>{item.subject}</strong>
                  <span className="muted-text">{item.status}</span>
                </div>
              ))}
            </div>
          ) : null}
        </article>
      ) : null}

      <article className="panel section">
        <h2>Activity Timeline</h2>
        <div className="timeline">
          {order.activityLogs.length === 0 && (
            <p className="muted-text">No activity recorded yet.</p>
          )}
          {order.activityLogs.map((event: ActivityLog) => (
            <div className="timeline-item" key={event.id}>
              <div className="timeline-meta">
                {new Date(event.createdAt).toLocaleString()} · {event.actorRef}
              </div>
              <strong>{event.eventType.replaceAll("_", " ")}</strong>
            </div>
          ))}
        </div>
      </article>
    </div>
  );
}
