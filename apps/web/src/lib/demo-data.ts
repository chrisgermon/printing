export const demoOrder = {
  id: "demo-cc-2410",
  title: "Event Flyers",
  quantity: 8500,
  status: "PRINTING",
  dueDate: "2026-03-01T00:00:00.000Z",
  notes: "250gsm gloss stock, double-sided full color.",
  quotedAmount: "1480.00",
  trackingCode: "AUSPOST-9301029384756",
  customer: {
    id: "client-crowdclick",
    companyId: "company-crowdclick",
    name: "CrowdClick Agency",
    email: "ops@crowdclick.com.au"
  },
  proofFiles: [
    {
      id: "proof-1",
      fileName: "event-flyer-v3.pdf",
      objectKey: "orders/demo-cc-2410/event-flyer-v3.pdf",
      contentType: "application/pdf",
      reviewStatus: "APPROVED",
      createdAt: "2026-02-17T10:00:00.000Z"
    }
  ],
  activityLogs: [
    {
      id: "log-1",
      actorType: "CUSTOMER",
      actorRef: "ops@crowdclick.com.au",
      eventType: "ORDER_CREATED",
      eventData: { quantity: 8500, title: "Event Flyers" },
      createdAt: "2026-02-14T09:10:00.000Z"
    },
    {
      id: "log-2",
      actorType: "STAFF",
      actorRef: "sam@printpress.app",
      eventType: "ORDER_STATUS_UPDATED",
      eventData: { status: "PROOF_SENT", note: "Proof version 3 sent for signoff." },
      createdAt: "2026-02-16T11:35:00.000Z"
    },
    {
      id: "log-3",
      actorType: "STAFF",
      actorRef: "sam@printpress.app",
      eventType: "ORDER_STATUS_UPDATED",
      eventData: { status: "PRINTING", note: "Production started." },
      createdAt: "2026-02-18T08:25:00.000Z"
    }
  ],
  communications: [
    {
      id: "comm-1",
      toEmail: "ops@crowdclick.com.au",
      subject: "Proof approved and moved to print",
      status: "QUEUED",
      createdAt: "2026-02-18T09:05:00.000Z"
    }
  ]
};

export const demoClient = {
  id: "client-crowdclick",
  companyId: "company-crowdclick",
  name: "CrowdClick Agency",
  email: "ops@crowdclick.com.au",
  company: "CrowdClick",
  phone: "+61 2 9000 1111",
  orders: [
    {
      id: "demo-cc-2410",
      title: "Event Flyers",
      quantity: 8500,
      status: "PRINTING",
      createdAt: "2026-02-14T09:10:00.000Z"
    },
    {
      id: "demo-cc-2409",
      title: "Product Sheets",
      quantity: 12000,
      status: "SHIPPED",
      createdAt: "2026-02-10T05:20:00.000Z"
    }
  ],
  activityLogs: [
    {
      id: "clog-1",
      orderId: "demo-cc-2410",
      eventType: "ORDER_CREATED",
      actorRef: "ops@crowdclick.com.au",
      createdAt: "2026-02-14T09:10:00.000Z"
    },
    {
      id: "clog-2",
      orderId: "demo-cc-2410",
      eventType: "ORDER_STATUS_UPDATED",
      actorRef: "sam@printpress.app",
      createdAt: "2026-02-18T08:25:00.000Z"
    }
  ],
  communications: [
    {
      id: "ccomm-1",
      toEmail: "ops@crowdclick.com.au",
      subject: "Welcome to PrintPress",
      status: "QUEUED",
      createdAt: "2026-02-14T09:12:00.000Z"
    }
  ]
};
