import { requiredEnv, spacesClient } from "@/lib/spaces";
import { prisma } from "@/lib/db";
import { auth } from "@/auth";
import { PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { z } from "zod";

const presignSchema = z.object({
  orderId: z.string().min(1),
  fileName: z.string().min(1),
  contentType: z.string().min(1)
});

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const payload = presignSchema.parse(await req.json());
  const bucket = requiredEnv("SPACES_BUCKET");

  const order = await prisma.order.findUnique({
    where: { id: payload.orderId },
    include: { customer: true }
  });
  if (!order) {
    return Response.json({ error: "Order not found" }, { status: 404 });
  }

  if (session.user.role === "CUSTOMER") {
    if (!session.user.customerId || order.customerId !== session.user.customerId) {
      return Response.json({ error: "Forbidden" }, { status: 403 });
    }
  } else if (session.user.companyId && order.customer.companyId && session.user.companyId !== order.customer.companyId) {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }

  const safeFileName = payload.fileName.replace(/[^a-zA-Z0-9._-]/g, "_");
  const objectKey = `orders/${payload.orderId}/${Date.now()}-${safeFileName}`;

  const command = new PutObjectCommand({
    Bucket: bucket,
    Key: objectKey,
    ContentType: payload.contentType
  });

  const uploadUrl = await getSignedUrl(spacesClient, command, { expiresIn: 60 * 10 });

  await prisma.proofFile.create({
    data: {
      orderId: payload.orderId,
      objectKey,
      fileName: payload.fileName,
      contentType: payload.contentType,
      uploadedBy: session.user.role === "CUSTOMER" ? "CUSTOMER" : "STAFF",
      uploaderRef: session.user.email || "unknown@printpress.local"
    }
  });

  return Response.json({ uploadUrl, objectKey, expiresInSeconds: 600 });
}
