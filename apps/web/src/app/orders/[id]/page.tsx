import Link from "next/link";
import { OrderStatusUpdateForm } from "@/components/OrderStatusUpdateForm";
import { ProofUploadForm } from "@/components/ProofUploadForm";
import { ProofReviewActions } from "@/components/ProofReviewActions";
import { CommunicationComposer } from "@/components/CommunicationComposer";
import { CustomerProofResponseActions } from "@/components/CustomerProofResponseActions";
import { prisma } from "@/lib/db";
import { demoOrder } from "@/lib/demo-data";
import { requireSession } from "@/lib/auth";

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

  const data = order ?? demoOrder;
  const isCustomerOwner = !order || (session.customerId ? data.customer.id === session.customerId : data.customer.email === session.email);
  const inCompanyScope = !order || !session.companyId || !data.customer.companyId || session.companyId === data.customer.companyId;
  const canView = (session.role !== "CUSTOMER" || isCustomerOwner) && inCompanyScope;
  const canUpdateStatus = ["STAFF", "ADMIN"].includes(session.role);
  const canCustomerRespond = session.role === "CUSTOMER";

  if (!canView) {
    return (
      <main className="portal-shell">
        <article className="panel section">
          <h2>Access denied</h2>
          <p className="muted-text">Customers can only view their own orders.</p>
        </article>
      </main>
    );
  }

  return (
    <main className="portal-shell">
      <div className="stack-lg">
        <article className="panel hero">
          <div>
            <h1>{data.title}</h1>
            <p>
              Order <strong>{data.id}</strong> for {data.customer.name} · {data.quantity.toLocaleString()} units
            </p>
          </div>
          <Link className="btn" href="/orders/new">
            Create Another Order
          </Link>
        </article>

        <div className="content-grid">
          <article className="panel section">
            <h2>Order Summary</h2>
            <div className="detail-grid">
              <div>
                <span className="muted-text">Status</span>
                <strong>{String(data.status).replaceAll("_", " ")}</strong>
              </div>
              <div>
                <span className="muted-text">Due Date</span>
                <strong>{data.dueDate ? new Date(data.dueDate).toLocaleDateString() : "Unscheduled"}</strong>
              </div>
              <div>
                <span className="muted-text">Quoted Value</span>
                <strong>{data.quotedAmount ? `$${String(data.quotedAmount)}` : "Pending"}</strong>
              </div>
              <div>
                <span className="muted-text">Tracking</span>
                <strong>{data.trackingCode || "Not shipped"}</strong>
              </div>
            </div>

            <p className="muted-block">{data.notes || "No additional production notes."}</p>

            {canUpdateStatus ? <OrderStatusUpdateForm orderId={data.id} currentStatus={String(data.status)} /> : null}
            <ProofUploadForm orderId={data.id} />
          </article>

          <article className="panel section">
            <h2>Proof Files</h2>
            <div className="list">
              {data.proofFiles.length ? (
                data.proofFiles.map((proof: ProofFile) => (
                  <div className="row" key={proof.id}>
                    <div>
                      <strong>{proof.fileName}</strong>
                      <span>{new Date(proof.createdAt).toLocaleString()}</span>
                    </div>
                    <div className="pill">{("reviewStatus" in proof ? proof.reviewStatus : "PENDING").replaceAll("_", " ")}</div>
                  </div>
                ))
              ) : (
                <p className="muted-text">No proofs uploaded yet.</p>
              )}
            </div>
            {canUpdateStatus ? (
              <div className="stack-sm">
                {data.proofFiles.map((proof: ProofFile) => (
                  <ProofReviewActions key={proof.id} proofId={proof.id} />
                ))}
              </div>
            ) : null}
            {canCustomerRespond ? (
              <div className="stack-sm">
                {data.proofFiles.map((proof: ProofFile) => (
                  <CustomerProofResponseActions key={proof.id} proofId={proof.id} />
                ))}
              </div>
            ) : null}
          </article>
        </div>

        {canUpdateStatus ? (
          <article className="panel section">
            <h2>Send Client Communication</h2>
            <CommunicationComposer customerId={data.customer.id} defaultTo={data.customer.email} orderId={data.id} />
            {"communications" in data && data.communications.length ? (
              <div className="timeline">
                {data.communications.map((item: Communication) => (
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
            {data.activityLogs.map((event: ActivityLog) => (
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
    </main>
  );
}
