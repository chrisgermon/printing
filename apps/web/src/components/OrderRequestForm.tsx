"use client";

import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";

export function OrderRequestForm() {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);

    const form = new FormData(event.currentTarget);
    const dueDateRaw = String(form.get("dueDate") || "").trim();

    const payload = {
      customerName: String(form.get("customerName") || "").trim(),
      customerEmail: String(form.get("customerEmail") || "").trim(),
      title: String(form.get("title") || "").trim(),
      quantity: Number(form.get("quantity") || 0),
      dueDate: dueDateRaw ? new Date(`${dueDateRaw}T00:00:00.000Z`).toISOString() : undefined,
      notes: String(form.get("notes") || "").trim() || undefined
    };

    try {
      const response = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        throw new Error("Could not create order. Check required fields and try again.");
      }

      const result: { orderId: string } = await response.json();
      router.push(`/orders/${result.orderId}`);
      router.refresh();
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Failed to submit order");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form className="form-grid" onSubmit={onSubmit}>
      <label>
        Contact Name
        <input name="customerName" required placeholder="Jane Collins" />
      </label>

      <label>
        Contact Email
        <input name="customerEmail" type="email" required placeholder="ops@crowdclick.com.au" />
      </label>

      <label>
        Job Title
        <input name="title" required placeholder="Membership Forms" />
      </label>

      <label>
        Quantity
        <input name="quantity" type="number" min={1} required placeholder="5000" />
      </label>

      <label>
        Due Date
        <input name="dueDate" type="date" />
      </label>

      <label className="full">
        Job Notes
        <textarea
          name="notes"
          rows={5}
          placeholder="Paper stock, finishing, delivery constraints, approval notes"
        />
      </label>

      {error ? <p className="form-error">{error}</p> : null}

      <div className="form-actions full">
        <button className="btn btn-primary" disabled={isSubmitting} type="submit">
          {isSubmitting ? "Submitting..." : "Create Order"}
        </button>
      </div>
    </form>
  );
}
