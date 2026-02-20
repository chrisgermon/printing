import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { z } from "zod";

const schema = z.object({
  action: z.enum(["APPROVED", "REJECTED"]),
  note: z.string().max(500).optional()
});

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await auth();
  if (!session?.user) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!["STAFF", "ADMIN"].includes(session.user.role)) {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }

  const payload = schema.parse(await req.json());

  const proof = await prisma.proofFile.findUnique({
    where: { id },
    include: { order: { include: { customer: true } } }
  });
  if (!proof) {
    return Response.json({ error: "Proof not found" }, { status: 404 });
  }
  if (session.user.companyId && proof.order.customer.companyId && proof.order.customer.companyId !== session.user.companyId) {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }

  const updatedProof = await prisma.proofFile.update({
    where: { id },
    data: {
      reviewStatus: payload.action,
      reviewNote: payload.note,
      reviewedBy: session.user.email || "unknown@printpress.local",
      reviewedAt: new Date()
    }
  });

  await prisma.activityLog.create({
    data: {
      orderId: proof.orderId,
      actorType: "STAFF",
      actorRef: session.user.email || "unknown@printpress.local",
      eventType: "PROOF_REVIEWED",
      eventData: {
        proofId: updatedProof.id,
        status: payload.action,
        note: payload.note ?? null
      }
    }
  });

  await prisma.outboxJob.create({
    data: {
      orderId: proof.orderId,
      type: "SEND_PROOF_REVIEW_EMAIL",
      payload: {
        orderId: proof.orderId,
        proofId: updatedProof.id,
        status: payload.action,
        note: payload.note ?? null
      }
    }
  });

  return Response.json({ ok: true, proofId: updatedProof.id, reviewStatus: updatedProof.reviewStatus });
}
