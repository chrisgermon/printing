"use client";

import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import { useToast } from "@/components/ToastProvider";

export function CommunicationComposer({
  customerId,
  orderId,
  defaultTo
}: {
  customerId: string;
  orderId?: string;
  defaultTo: string;
}) {
  const router = useRouter();
  const { addToast } = useToast();
  const [pending, setPending] = useState(false);
  const [result, setResult] = useState<string | null>(null);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setResult(null);

    const form = new FormData(event.currentTarget);
    const payload = {
      customerId,
      orderId,
      toEmail: String(form.get("toEmail") || "").trim(),
      subject: String(form.get("subject") || "").trim(),
      body: String(form.get("body") || "").trim()
    };

    try {
      const response = await fetch("/api/communications/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        throw new Error("Could not queue communication.");
      }

      setResult("Communication queued");
      addToast("Email queued for delivery", "success");
      event.currentTarget.reset();
      router.refresh();
    } catch (error) {
      const msg = error instanceof Error ? error.message : "Failed to send";
      setResult(msg);
      addToast("Failed to send message. Please try again.", "error");
    } finally {
      setPending(false);
    }
  }

  return (
    <form className="status-form" onSubmit={onSubmit}>
      <label>
        To
        <input defaultValue={defaultTo} name="toEmail" required type="email" />
      </label>
      <label>
        Subject
        <input name="subject" required />
      </label>
      <label>
        Message
        <textarea name="body" required rows={4} />
      </label>
      <button className="btn btn-primary" disabled={pending} type="submit">
        {pending ? "Queueing..." : "Send Message"}
      </button>
      {result ? <span className="muted-text">{result}</span> : null}
    </form>
  );
}
