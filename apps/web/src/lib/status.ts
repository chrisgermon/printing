const STATUS_PILL_MAP: Record<string, string> = {
  RECEIVED: "pill-received",
  PROOF_PREPARING: "pill-proof",
  PROOF_SENT: "pill-proof",
  AWAITING_APPROVAL: "pill-approval",
  APPROVED: "pill-approved",
  PRINTING: "pill-printing",
  READY_TO_SHIP: "pill-shipping",
  SHIPPED: "pill-shipping",
  DELIVERED: "pill-delivered",
  CANCELLED: "pill-cancelled",
};

export function statusPillClass(status: string): string {
  return STATUS_PILL_MAP[status] || "";
}
