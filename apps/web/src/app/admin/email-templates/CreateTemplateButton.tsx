"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface Company {
  id: string;
  name: string;
}

interface CreateTemplateButtonProps {
  companies: Company[];
}

export function CreateTemplateButton({ companies }: CreateTemplateButtonProps) {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    const formData = new FormData(e.currentTarget);
    const payload = {
      name: formData.get("name") as string,
      subject: formData.get("subject") as string,
      textBody: formData.get("textBody") as string,
      htmlBody: (formData.get("htmlBody") as string) || null,
      description: (formData.get("description") as string) || null,
      companyId: (formData.get("companyId") as string) || null,
      isActive: true
    };

    try {
      const response = await fetch("/api/admin/email-templates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to create template");
      }

      const { template } = await response.json();
      setIsOpen(false);
      router.push(`/admin/email-templates/${template.id}`);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create template");
    } finally {
      setIsLoading(false);
    }
  }

  const defaultTemplateNames = [
    "ORDER_CREATED",
    "STATUS_UPDATE",
    "PROOF_REVIEW",
    "PROOF_CUSTOMER_RESPONSE",
    "WELCOME",
    "PASSWORD_RESET"
  ];

  return (
    <>
      <button className="btn btn-primary admin-modal-trigger" onClick={() => setIsOpen(true)} type="button">
        + Create Template
      </button>

      {isOpen && (
        <div className="admin-modal-overlay" onClick={() => setIsOpen(false)}>
          <div className="admin-modal" onClick={(e) => e.stopPropagation()}>
            <h2>Create Email Template</h2>
            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label htmlFor="name">Template Name</label>
                <select id="name" name="name" required>
                  <option value="">Select a template type...</option>
                  {defaultTemplateNames.map((name) => (
                    <option key={name} value={name}>
                      {name.replace(/_/g, " ")}
                    </option>
                  ))}
                  <option value="CUSTOM">Custom (enter manually)</option>
                </select>
              </div>

              <div className="form-group">
                <label htmlFor="companyId">Company (optional)</label>
                <select id="companyId" name="companyId">
                  <option value="">System Default</option>
                  {companies.map((company) => (
                    <option key={company.id} value={company.id}>
                      {company.name}
                    </option>
                  ))}
                </select>
                <span className="help-text">
                  If not specified, this becomes a system-wide default template
                </span>
              </div>

              <div className="form-group">
                <label htmlFor="subject">Email Subject</label>
                <input
                  id="subject"
                  name="subject"
                  type="text"
                  required
                  placeholder="e.g., Your order has been received"
                />
              </div>

              <div className="form-group">
                <label htmlFor="textBody">Plain Text Body</label>
                <textarea
                  id="textBody"
                  name="textBody"
                  rows={6}
                  required
                  placeholder="Use {{variableName}} for dynamic content..."
                />
                <span className="help-text">
                  Available variables: orderId, status, customerName, etc.
                </span>
              </div>

              <div className="form-group">
                <label htmlFor="htmlBody">
                  HTML Body <span className="optional">(optional)</span>
                </label>
                <textarea
                  id="htmlBody"
                  name="htmlBody"
                  rows={6}
                  placeholder="<html>...</html>"
                />
              </div>

              <div className="form-group">
                <label htmlFor="description">
                  Description <span className="optional">(optional)</span>
                </label>
                <input
                  id="description"
                  name="description"
                  type="text"
                  placeholder="What this template is used for"
                />
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
                  {isLoading ? "Creating..." : "Create Template"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
