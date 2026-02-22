"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function CreateCompanyButton() {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    const formData = new FormData(e.currentTarget);
    const name = String(formData.get("name"));
    const isInternal = formData.get("isInternal") === "on";

    try {
      const response = await fetch("/api/admin/companies", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, isInternal })
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to create company");
      }

      setIsOpen(false);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create company");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <>
      <button className="btn btn-primary admin-modal-trigger" onClick={() => setIsOpen(true)} type="button">
        + Create Company
      </button>

      {isOpen && (
        <div className="admin-modal-overlay" onClick={() => setIsOpen(false)}>
          <div className="admin-modal admin-modal-sm" onClick={(e) => e.stopPropagation()}>
            <h2>Create Company</h2>
            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label>
                  Company Name
                </label>
                <input
                  name="name"
                  type="text"
                  required
                  placeholder="e.g., CrowdClick Agency"
                />
              </div>

              <div className="form-group">
                <label className="checkbox">
                  <input name="isInternal" type="checkbox" defaultChecked />
                  Internal Company (your print shop)
                </label>
              </div>

              {error && <p className="message error">{error}</p>}

              <div className="admin-modal-actions">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setIsOpen(false)}
                  disabled={isLoading}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={isLoading}
                >
                  {isLoading ? "Creating..." : "Create Company"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
