"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

const STATUS_OPTIONS = [
  "RECEIVED",
  "PROOF_PREPARING",
  "PROOF_SENT",
  "AWAITING_APPROVAL",
  "APPROVED",
  "PRINTING",
  "READY_TO_SHIP",
  "SHIPPED",
  "DELIVERED",
  "CANCELLED"
] as const;

export function OrderStatusUpdateForm({ orderId, currentStatus }: { orderId: string; currentStatus: string }) {
  const router = useRouter();
  const [status, setStatus] = useState(currentStatus);
  const [note, setNote] = useState("");
  const [pending, setPending] = useState(false);
  const [result, setResult] = useState<string | null>(null);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setPending(true);
    setResult(null);

    try {
      const response = await fetch(`/api/orders/${orderId}/status`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status,
          note: note || undefined
        })
      });

      if (!response.ok) {
        throw new Error("Failed to update order status.");
      }

      setResult("Status updated");
      router.refresh();
    } catch (error) {
      setResult(error instanceof Error ? error.message : "Failed to update status");
    } finally {
      setPending(false);
    }
  }

  return (
    <form className="status-form" onSubmit={onSubmit}>
      <label>
        Status
        <select value={status} onChange={(event) => setStatus(event.target.value)}>
          {STATUS_OPTIONS.map((option) => (
            <option key={option} value={option}>
              {option.replaceAll("_", " ")}
            </option>
          ))}
        </select>
      </label>

      <label>
        Internal note
        <input value={note} onChange={(event) => setNote(event.target.value)} placeholder="Optional update note" />
      </label>

      <button className="btn btn-primary" disabled={pending} type="submit">
        {pending ? "Updating..." : "Update Status"}
      </button>

      {result ? <span className="muted-text">{result}</span> : null}
    </form>
  );
}
