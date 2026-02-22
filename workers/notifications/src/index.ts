import { Pool } from "pg";

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});
const pollIntervalMs = Number(process.env.WORKER_POLL_INTERVAL_MS || 5000);
const mailProvider = process.env.MAIL_PROVIDER || "postmark";
const mailgunDomain = process.env.MAILGUN_DOMAIN || "";
const mailgunApiKey = process.env.MAILGUN_API_KEY || "";
const postmarkServerToken = process.env.POSTMARK_SERVER_TOKEN || "";
const postmarkMessageStream = process.env.POSTMARK_MESSAGE_STREAM || "outbound";
const mailFrom = process.env.MAIL_FROM || "PrintPress <no-reply@example.com>";

interface EmailTemplate {
  subject: string;
  textBody: string;
  htmlBody: string | null;
}

interface CompanySettings {
  emailFromName: string | null;
  emailFromAddress: string | null;
  emailReplyTo: string | null;
  useCustomEmailProvider: boolean;
  customPostmarkToken: string | null;
  customMailgunDomain: string | null;
  customMailgunApiKey: string | null;
  enableAutoNotifications: boolean;
  customEmailFooter: string | null;
}

interface OrderInfo {
  id: string;
  status: string;
  title: string;
  quantity: number;
  dueDate: string | null;
  customerEmail: string;
  customerName: string;
  companyId: string | null;
}

type MailJobInput = {
  toEmail: string;
  subject: string;
  text: string;
  html?: string | null;
  communicationId?: string;
  fromEmail?: string;
  replyTo?: string | null;
};

async function lookupOrderInfo(orderId: string): Promise<OrderInfo | null> {
  const result = await pool.query(
    `
      SELECT 
        o.id,
        o.status,
        o.title,
        o.quantity,
        o."dueDate",
        c.email as "customerEmail",
        c.name as "customerName",
        c."companyId"
      FROM "Order" o
      JOIN "Customer" c ON c.id = o."customerId"
      WHERE o.id = $1
      LIMIT 1
    `,
    [orderId]
  );
  return result.rows[0] ?? null;
}

async function getCompanySettings(companyId: string | null): Promise<CompanySettings | null> {
  if (!companyId) return null;
  const result = await pool.query(
    `SELECT * FROM "CompanySettings" WHERE "companyId" = $1 LIMIT 1`,
    [companyId]
  );
  return result.rows[0] ?? null;
}

async function getEmailTemplate(
  templateName: string,
  companyId: string | null
): Promise<EmailTemplate | null> {
  // First try to get company-specific template
  if (companyId) {
    const companyResult = await pool.query(
      `SELECT * FROM "EmailTemplate" WHERE name = $1 AND "companyId" = $2 AND "isActive" = true LIMIT 1`,
      [templateName, companyId]
    );
    if (companyResult.rows[0]) {
      return companyResult.rows[0];
    }
  }
  
  // Fall back to system default
  const systemResult = await pool.query(
    `SELECT * FROM "EmailTemplate" WHERE name = $1 AND "companyId" IS NULL AND "isActive" = true LIMIT 1`,
    [templateName]
  );
  return systemResult.rows[0] ?? null;
}

function interpolateTemplate(template: string, variables: Record<string, string>): string {
  return template.replace(/\{\{(\w+)\}\}/g, (match, key) => variables[key] ?? match);
}

async function sendMail(input: MailJobInput, companySettings?: CompanySettings | null): Promise<string | null> {
  // Determine which credentials to use
  let usePostmark = mailProvider === "postmark";
  let token = postmarkServerToken;
  let domain = mailgunDomain;
  let apiKey = mailgunApiKey;
  let from = input.fromEmail || mailFrom;

  // Use company-specific provider if configured
  if (companySettings?.useCustomEmailProvider) {
    if (companySettings.customPostmarkToken) {
      usePostmark = true;
      token = companySettings.customPostmarkToken;
    } else if (companySettings.customMailgunDomain && companySettings.customMailgunApiKey) {
      usePostmark = false;
      domain = companySettings.customMailgunDomain;
      apiKey = companySettings.customMailgunApiKey;
    }
  }

  // Override from address if company has custom settings
  if (companySettings?.emailFromAddress) {
    const fromName = companySettings.emailFromName || "PrintPress";
    from = `${fromName} <${companySettings.emailFromAddress}>`;
  }

  if (usePostmark) {
    if (!token) {
      throw new Error("Postmark server token is missing");
    }

    const response = await fetch("https://api.postmarkapp.com/email", {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        "X-Postmark-Server-Token": token
      },
      body: JSON.stringify({
        From: from,
        To: input.toEmail,
        Subject: input.subject,
        TextBody: input.text,
        HtmlBody: input.html || undefined,
        ReplyTo: input.replyTo || companySettings?.emailReplyTo || undefined,
        MessageStream: postmarkMessageStream
      })
    });

    if (!response.ok) {
      const responseText = await response.text();
      throw new Error(`Postmark send failed (${response.status}): ${responseText}`);
    }

    const result = (await response.json()) as { MessageID?: string };
    return result.MessageID ?? null;
  }

  // Mailgun
  if (!domain || !apiKey) {
    throw new Error("Mailgun configuration is missing");
  }

  const body = new URLSearchParams();
  body.set("from", from);
  body.set("to", input.toEmail);
  body.set("subject", input.subject);
  body.set("text", input.text);
  if (input.html) {
    body.set("html", input.html);
  }
  if (input.replyTo || companySettings?.emailReplyTo) {
    body.set("h:Reply-To", input.replyTo || companySettings?.emailReplyTo || "");
  }

  const auth = Buffer.from(`api:${apiKey}`).toString("base64");
  const response = await fetch(`https://api.mailgun.net/v3/${domain}/messages`, {
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

async function buildMailJob(
  type: string, 
  payload: Record<string, unknown>
): Promise<(MailJobInput & { companySettings?: CompanySettings | null }) | null> {
  
  // Handle direct communication emails
  if (type === "SEND_COMMUNICATION_EMAIL") {
    const toEmail = typeof payload.toEmail === "string" ? payload.toEmail : "";
    const subject = typeof payload.subject === "string" ? payload.subject : "PrintPress Update";
    const text = typeof payload.body === "string" ? payload.body : "";
    const html = typeof payload.htmlBody === "string" ? payload.htmlBody : null;
    if (!toEmail || !text) return null;
    
    return {
      toEmail,
      subject,
      text,
      html,
      communicationId: typeof payload.communicationId === "string" ? payload.communicationId : undefined,
      fromEmail: typeof payload.fromEmail === "string" ? payload.fromEmail : undefined
    };
  }

  const orderId = typeof payload.orderId === "string" ? payload.orderId : "";
  if (!orderId) return null;

  const orderInfo = await lookupOrderInfo(orderId);
  if (!orderInfo) return null;

  const companySettings = await getCompanySettings(orderInfo.companyId);

  // Check if auto-notifications are disabled for this company
  if (companySettings && !companySettings.enableAutoNotifications) {
    console.log(`[worker] Auto-notifications disabled for company ${orderInfo.companyId}, skipping email`);
    return null;
  }

  const templateName = type.replace("SEND_", "").replace("_EMAIL", "");
  const template = await getEmailTemplate(templateName, orderInfo.companyId);

  // Build variables for template interpolation
  const variables: Record<string, string> = {
    orderId: orderInfo.id,
    status: orderInfo.status,
    title: orderInfo.title,
    quantity: String(orderInfo.quantity),
    dueDate: orderInfo.dueDate ? new Date(orderInfo.dueDate).toLocaleDateString() : "Not set",
    customerName: orderInfo.customerName,
    customerEmail: orderInfo.customerEmail,
    appUrl: process.env.APP_URL || "https://printpress.example.com"
  };

  // Add proof-related variables if present in payload
  if (typeof payload.status === "string") {
    variables.proofStatus = payload.status;
  }
  if (typeof payload.notes === "string") {
    variables.proofNotes = payload.notes;
  }

  let subject: string;
  let textBody: string;
  let htmlBody: string | null = null;

  if (template) {
    subject = interpolateTemplate(template.subject, variables);
    textBody = interpolateTemplate(template.textBody, variables);
    htmlBody = template.htmlBody ? interpolateTemplate(template.htmlBody, variables) : null;
  } else {
    // Fallback to default content
    subject = `PrintPress Update - Order ${orderId}`;
    textBody = `There has been an update to your order ${orderId}.`;
  }

  // Append custom footer if configured
  if (companySettings?.customEmailFooter) {
    textBody += `\n\n${companySettings.customEmailFooter}`;
    if (htmlBody) {
      htmlBody += `<br><br><footer>${companySettings.customEmailFooter}</footer>`;
    }
  }

  return {
    toEmail: orderInfo.customerEmail,
    subject,
    text: textBody,
    html: htmlBody,
    communicationId: typeof payload.communicationId === "string" ? payload.communicationId : undefined,
    replyTo: companySettings?.emailReplyTo,
    companySettings
  };
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
        const { companySettings, ...mailInput } = mailJob;
        const providerRef = await sendMail(mailInput, companySettings);
        if (mailInput.communicationId) {
          await markCommunication(mailInput.communicationId, "SENT", providerRef);
        }
      } else {
        console.log(`[worker] Skipping job=${job.id} (no mail job generated)`);
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
      console.error(`[worker] Job ${job.id} failed: ${message}`);
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
  console.log(`[worker] poll interval: ${pollIntervalMs}ms`);
  console.log(`[worker] default provider: ${mailProvider}`);
  setInterval(() => {
    void processPendingJobs();
  }, pollIntervalMs);
}

void start();
