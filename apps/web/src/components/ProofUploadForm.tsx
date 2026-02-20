"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function ProofUploadForm({ orderId }: { orderId: string }) {
  const router = useRouter();
  const [file, setFile] = useState<File | null>(null);
  const [pending, setPending] = useState(false);
  const [result, setResult] = useState<string | null>(null);

  async function uploadFile() {
    if (!file) {
      setResult("Choose a file before uploading.");
      return;
    }

    setPending(true);
    setResult(null);

    try {
      const presignResponse = await fetch("/api/uploads/presign", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orderId,
          fileName: file.name,
          contentType: file.type || "application/octet-stream"
        })
      });

      if (!presignResponse.ok) {
        throw new Error("Could not create upload URL.");
      }

      const payload: { uploadUrl: string } = await presignResponse.json();
      const uploadResponse = await fetch(payload.uploadUrl, {
        method: "PUT",
        headers: { "Content-Type": file.type || "application/octet-stream" },
        body: file
      });

      if (!uploadResponse.ok) {
        throw new Error("Upload failed.");
      }

      setResult("Upload complete.");
      setFile(null);
      router.refresh();
    } catch (error) {
      setResult(error instanceof Error ? error.message : "Upload failed.");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="status-form">
      <label>
        Upload proof/artwork
        <input
          type="file"
          onChange={(event) => {
            const chosen = event.target.files?.[0] || null;
            setFile(chosen);
          }}
        />
      </label>

      <button className="btn" disabled={pending} onClick={uploadFile} type="button">
        {pending ? "Uploading..." : "Upload File"}
      </button>

      {result ? <span className="muted-text">{result}</span> : null}
    </div>
  );
}
