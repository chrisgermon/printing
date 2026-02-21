"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { useToast } from "@/components/ToastProvider";

export function ProofReviewActions({ proofId }: { proofId: string }) {
  const router = useRouter();
  const { addToast } = useToast();
  const [note, setNote] = useState("");
  const [pending, setPending] = useState<"APPROVED" | "REJECTED" | null>(null);
  const [result, setResult] = useState<string | null>(null);

  async function submit(action: "APPROVED" | "REJECTED") {
    setPending(action);
    setResult(null);

    try {
      const response = await fetch(`/api/proofs/${proofId}/review`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, note: note || undefined })
      });

      if (!response.ok) {
        throw new Error("Unable to submit proof review.");
      }

      const msg = action === "APPROVED" ? "Proof approved" : "Proof rejected";
      setResult(msg);
      addToast(msg, "success");
      setNote("");
      router.refresh();
    } catch (error) {
      const errMsg = error instanceof Error ? error.message : "Review failed";
      setResult(errMsg);
      addToast("Failed to submit review. Please try again.", "error");
    } finally {
      setPending(null);
    }
  }

  return (
    <div className="review-actions">
      <input placeholder="Review note (optional)" value={note} onChange={(event) => setNote(event.target.value)} />
      <div className="action-row">
        <button className="btn btn-primary" disabled={pending !== null} onClick={() => submit("APPROVED")} type="button">
          {pending === "APPROVED" ? "Approving..." : "Approve"}
        </button>
        <button className="btn" disabled={pending !== null} onClick={() => submit("REJECTED")} type="button">
          {pending === "REJECTED" ? "Rejecting..." : "Reject"}
        </button>
      </div>
      {result ? <span className="muted-text">{result}</span> : null}
    </div>
  );
}
