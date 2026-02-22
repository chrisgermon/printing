"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface Company {
  id: string;
  name: string;
}

interface Template {
  id: string;
  name: string;
  subject: string;
  textBody: string;
  htmlBody: string | null;
  description: string | null;
  companyId: string | null;
  company: { id: string; name: string } | null;
  isActive: boolean;
  isDefault: boolean;
}

interface TemplateEditorProps {
  template: Template;
  companies: Company[];
}

const availableVariables = [
  { name: "orderId", description: "The order ID (e.g., ORD-123456)" },
  { name: "status", description: "Order status (e.g., RECEIVED, PRINTING)" },
  { name: "customerName", description: "Customer's full name" },
  { name: "customerEmail", description: "Customer's email address" },
  { name: "orderTitle", description: "The order/job title" },
  { name: "quantity", description: "Order quantity" },
  { name: "dueDate", description: "Order due date" },
  { name: "proofStatus", description: "Proof review status" },
  { name: "proofNotes", description: "Proof review notes" },
  { name: "companyName", description: "Company name" },
  { name: "appUrl", description: "Application URL" }
];

export function TemplateEditor({ template, companies }: TemplateEditorProps) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [previewData, setPreviewData] = useState<Record<string, string>>({
    orderId: "ORD-123456",
    status: "PRINTING",
    customerName: "John Doe",
    customerEmail: "john@example.com",
    orderTitle: "Business Cards",
    quantity: "500",
    dueDate: "2024-03-15",
    companyName: "CrowdClick",
    appUrl: "https://printpress.example.com"
  });
  const [showPreview, setShowPreview] = useState(false);
  void companies;

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setIsLoading(true);
    setMessage(null);

    const formData = new FormData(e.currentTarget);
    const payload = {
      subject: formData.get("subject") as string,
      textBody: formData.get("textBody") as string,
      htmlBody: (formData.get("htmlBody") as string) || null,
      description: (formData.get("description") as string) || null,
      isActive: formData.get("isActive") === "on"
    };

    try {
      const response = await fetch(`/api/admin/email-templates/${template.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to update template");
      }

      setMessage({ type: "success", text: "Template updated successfully" });
      router.refresh();
    } catch (err) {
      setMessage({ type: "error", text: err instanceof Error ? err.message : "Failed to update template" });
    } finally {
      setIsLoading(false);
    }
  }

  async function handleDelete() {
    if (!confirm("Are you sure you want to delete this template? This action cannot be undone.")) {
      return;
    }

    setIsDeleting(true);
    try {
      const response = await fetch(`/api/admin/email-templates/${template.id}`, {
        method: "DELETE"
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to delete template");
      }

      router.push("/admin/email-templates");
    } catch (err) {
      setMessage({ type: "error", text: err instanceof Error ? err.message : "Failed to delete template" });
      setIsDeleting(false);
    }
  }

  function generatePreview(text: string): string {
    return text.replace(/\{\{(\w+)\}\}/g, (match, variable) => {
      return previewData[variable] || match;
    });
  }

  return (
    <form onSubmit={handleSubmit} className="template-editor">
      {message && (
        <div className={`message ${message.type}`}>
          {message.text}
        </div>
      )}

      <div className="editor-layout">
        <div className="editor-main">
          <div className="form-group">
            <label>Template Name</label>
            <input type="text" value={template.name} disabled className="monospace" />
            <span className="help-text">Template names cannot be changed</span>
          </div>

          <div className="form-group">
            <label htmlFor="subject">Email Subject</label>
            <input
              id="subject"
              name="subject"
              type="text"
              defaultValue={template.subject}
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="description">Description</label>
            <input
              id="description"
              name="description"
              type="text"
              defaultValue={template.description || ""}
              placeholder="What this template is used for"
            />
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>Scope</label>
              <input
                type="text"
                value={template.company ? template.company.name : "System Default"}
                disabled
              />
            </div>
            <div className="form-group checkbox-group">
              <label className="checkbox">
                <input
                  name="isActive"
                  type="checkbox"
                  defaultChecked={template.isActive}
                />
                Template Active
              </label>
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="textBody">Plain Text Body</label>
            <textarea
              id="textBody"
              name="textBody"
              rows={12}
              defaultValue={template.textBody}
              required
              className="monospace"
            />
            <span className="help-text">
              Use {"{{variableName}}"} syntax for dynamic content
            </span>
          </div>

          <div className="form-group">
            <label htmlFor="htmlBody">
              HTML Body <span className="optional">(optional)</span>
            </label>
            <textarea
              id="htmlBody"
              name="htmlBody"
              rows={12}
              defaultValue={template.htmlBody || ""}
              className="monospace"
              placeholder="<html>...</html>"
            />
          </div>

          <div className="form-actions">
            <button type="submit" className="btn btn-primary" disabled={isLoading}>
              {isLoading ? "Saving..." : "Save Template"}
            </button>
            {!template.isDefault && (
              <button
                type="button"
                className="btn btn-danger"
                onClick={handleDelete}
                disabled={isDeleting}
              >
                {isDeleting ? "Deleting..." : "Delete Template"}
              </button>
            )}
          </div>
        </div>

        <div className="editor-sidebar">
          <div className="sidebar-section">
            <h3>Available Variables</h3>
            <p className="section-description">Click to copy to clipboard</p>
            <div className="variables-list">
              {availableVariables.map((variable) => (
                <button
                  key={variable.name}
                  type="button"
                  className="variable-item"
                  onClick={() => navigator.clipboard.writeText(`{{${variable.name}}}`)}
                  title={variable.description}
                >
                  <code>{`{{${variable.name}}}`}</code>
                  <span className="variable-desc">{variable.description}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="sidebar-section">
            <h3>
              Preview
              <button
                type="button"
                className="toggle-preview"
                onClick={() => setShowPreview(!showPreview)}
              >
                {showPreview ? "Hide" : "Show"}
              </button>
            </h3>
            {showPreview && (
              <>
                <div className="preview-data">
                  {Object.entries(previewData).map(([key, value]) => (
                    <div key={key} className="preview-field">
                      <label>{key}</label>
                      <input
                        type="text"
                        value={value}
                        onChange={(e) =>
                          setPreviewData((d) => ({ ...d, [key]: e.target.value }))
                        }
                      />
                    </div>
                  ))}
                </div>
                <div className="preview-output">
                  <h4>Subject Preview</h4>
                  <div className="preview-text">
                    {generatePreview(template.subject)}
                  </div>
                  <h4>Body Preview</h4>
                  <pre className="preview-text">
                    {generatePreview(template.textBody)}
                  </pre>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </form>
  );
}
