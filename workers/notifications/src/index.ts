import { Pool } from "pg";

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});
const pollIntervalMs = Number(process.env.WORKER_POLL_INTERVAL_MS || 5000);
const mailProvider = process.env.MAIL_PROVIDER || "mailgun";
const mailgunDomain = process.env.MAILGUN_DOMAIN || "";
const mailgunApiKey = process.env.MAILGUN_API_KEY || "";
const mailFrom = process.env.MAIL_FROM || "PrintPress <no-reply@example.com>";

type MailJobInput = {
  toEmail: string;
  subject: string;
  text: string;
  communicationId?: string;
};

async function lookupOrderRecipient(orderId: string): Promise<string | null> {
  const result = await pool.query(
    `
      SELECT c.email
      FROM "Order" o
      JOIN "Customer" c ON c.id = o."customerId"
      WHERE o.id = $1
      LIMIT 1
    `,
    [orderId]
  );
  return result.rows[0]?.email ?? null;
}

async function sendMail(input: MailJobInput): Promise<string | null> {
  if (mailProvider !== "mailgun") {
    console.log(`[worker] MAIL_PROVIDER=${mailProvider} (mail send skipped)`);
    return null;
  }
  if (!mailgunDomain || !mailgunApiKey) {
    throw new Error("MAILGUN_DOMAIN or MAILGUN_API_KEY is missing");
  }

  const body = new URLSearchParams();
  body.set("from", mailFrom);
  body.set("to", input.toEmail);
  body.set("subject", input.subject);
  body.set("text", input.text);

  const auth = Buffer.from(`api:${mailgunApiKey}`).toString("base64");
  const response = await fetch(`https://api.mailgun.net/v3/${mailgunDomain}/messages`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${auth}`,
      "Content-Type": "application/x-www-form-urlencoded"
    },
    body: body.toString()
  });

  if (!response.ok) {
    const responseText = await response.text();
    throw new Error(`Mailgun send failed (${response.status}): ${responseText}`);
  }

  const result = (await response.json()) as { id?: string };
  return result.id ?? null;
}

async function buildMailJob(type: string, payload: Record<string, unknown>): Promise<MailJobInput | null> {
  if (type === "SEND_COMMUNICATION_EMAIL") {
    const toEmail = typeof payload.toEmail === "string" ? payload.toEmail : "";
    const subject = typeof payload.subject === "string" ? payload.subject : "PrintPress Update";
    const text = typeof payload.body === "string" ? payload.body : "";
    if (!toEmail || !text) return null;
    return {
      toEmail,
      subject,
      text,
      communicationId: typeof payload.communicationId === "string" ? payload.communicationId : undefined
    };
  }

  const orderId = typeof payload.orderId === "string" ? payload.orderId : "";
  if (!orderId) return null;
  const recipient = await lookupOrderRecipient(orderId);
  if (!recipient) return null;

  if (type === "SEND_ORDER_CREATED_EMAIL") {
    return {
      toEmail: recipient,
      subject: "Order received",
      text: `Your order ${orderId} has been received and entered into production planning.`
    };
  }

  if (type === "SEND_STATUS_UPDATE_EMAIL") {
    const status = typeof payload.status === "string" ? payload.status : "UPDATED";
    return {
      toEmail: recipient,
      subject: "Order status updated",
      text: `Order ${orderId} status is now: ${status}.`
    };
  }

  if (type === "SEND_PROOF_REVIEW_EMAIL") {
    const status = typeof payload.status === "string" ? payload.status : "UPDATED";
    return {
      toEmail: recipient,
      subject: "Proof review update",
      text: `Proof for order ${orderId} was reviewed with status: ${status}.`
    };
  }

  if (type === "SEND_PROOF_CUSTOMER_RESPONSE_EMAIL") {
    const status = typeof payload.status === "string" ? payload.status : "UPDATED";
    return {
      toEmail: recipient,
      subject: "Customer proof response",
      text: `Customer responded to proof for order ${orderId} with: ${status}.`
    };
  }

  return null;
}

async function markCommunication(communicationId: string, status: "SENT" | "FAILED", providerRef: string | null) {
  await pool.query(
    `
      UPDATE "CommunicationLog"
      SET status = $2,
          "providerRef" = $3,
          "updatedAt" = NOW()
      WHERE id = $1
    `,
    [communicationId, status, providerRef]
  );
}

async function processPendingJobs() {
  const jobsResult = await pool.query(
    `
      SELECT id, type, payload, attempts
      FROM "OutboxJob"
      WHERE status = 'PENDING'
        AND "runAfter" <= NOW()
      ORDER BY "createdAt" ASC
      LIMIT 20
    `
  );

  for (const job of jobsResult.rows) {
    try {
      await pool.query(
        `
          UPDATE "OutboxJob"
          SET status = 'PROCESSING',
              attempts = attempts + 1,
              "updatedAt" = NOW()
          WHERE id = $1
        `,
        [job.id]
      );

      console.log(`[worker] Processing job=${job.id} type=${job.type}`);

      const payload = typeof job.payload === "object" && job.payload ? (job.payload as Record<string, unknown>) : {};
      const mailJob = await buildMailJob(job.type, payload);
      if (mailJob) {
        const providerRef = await sendMail(mailJob);
        if (mailJob.communicationId) {
          await markCommunication(mailJob.communicationId, "SENT", providerRef);
        }
      }

      await pool.query(
        `
          UPDATE "OutboxJob"
          SET status = 'DONE',
              "processedAt" = NOW(),
              "lastError" = NULL,
              "updatedAt" = NOW()
          WHERE id = $1
        `,
        [job.id]
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      const nextStatus = Number(job.attempts) >= 4 ? "FAILED" : "PENDING";
      const payload = typeof job.payload === "object" && job.payload ? (job.payload as Record<string, unknown>) : {};
      if (job.type === "SEND_COMMUNICATION_EMAIL" && typeof payload.communicationId === "string" && nextStatus === "FAILED") {
        await markCommunication(payload.communicationId, "FAILED", null);
      }
      await pool.query(
        `
          UPDATE "OutboxJob"
          SET status = $2,
              "lastError" = $3,
              "runAfter" = NOW() + INTERVAL '60 seconds',
              "updatedAt" = NOW()
          WHERE id = $1
        `,
        [job.id, nextStatus, message]
      );
    }
  }
}

async function start() {
  console.log("[worker] notifications worker started");
  setInterval(() => {
    void processPendingJobs();
  }, pollIntervalMs);
}

void start();
