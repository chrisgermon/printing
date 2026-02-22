"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CompanySettings } from "@prisma/client";

interface CompanySettingsFormProps {
  companyId: string;
  companyName: string;
  initialSettings: CompanySettings;
}

export function CompanySettingsForm({ 
  companyId, 
  companyName, 
  initialSettings 
}: CompanySettingsFormProps) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [activeTab, setActiveTab] = useState<"general" | "email" | "features">("general");

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setIsLoading(true);
    setMessage(null);

    const formData = new FormData(e.currentTarget);
    const payload = {
      // Email
      emailFromName: formData.get("emailFromName") as string || null,
      emailFromAddress: formData.get("emailFromAddress") as string || null,
      emailReplyTo: formData.get("emailReplyTo") as string || null,
      useCustomEmailProvider: formData.get("useCustomEmailProvider") === "on",
      customPostmarkToken: formData.get("customPostmarkToken") as string || null,
      customMailgunDomain: formData.get("customMailgunDomain") as string || null,
      customMailgunApiKey: formData.get("customMailgunApiKey") as string || null,
      
      // Features
      enableProofWorkflow: formData.get("enableProofWorkflow") === "on",
      enableCustomerPortal: formData.get("enableCustomerPortal") === "on",
      enableAutoNotifications: formData.get("enableAutoNotifications") === "on",
      requireProofApproval: formData.get("requireProofApproval") === "on",
      
      // Branding
      brandLogoUrl: formData.get("brandLogoUrl") as string || null,
      brandPrimaryColor: formData.get("brandPrimaryColor") as string || null,
      customEmailFooter: formData.get("customEmailFooter") as string || null,
      
      // Notifications
      notifyOnOrderCreated: formData.get("notifyOnOrderCreated") === "on",
      notifyOnStatusUpdate: formData.get("notifyOnStatusUpdate") === "on",
      notifyOnProofReview: formData.get("notifyOnProofReview") === "on",
      notifyOnProofResponse: formData.get("notifyOnProofResponse") === "on"
    };

    try {
      const response = await fetch(`/api/admin/companies/${companyId}/settings`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to save settings");
      }

      setMessage({ type: "success", text: "Settings saved successfully" });
      router.refresh();
    } catch (err) {
      setMessage({ type: "error", text: err instanceof Error ? err.message : "Failed to save settings" });
    } finally {
      setIsLoading(false);
    }
  }

  const tabs = [
    { id: "general", label: "General", icon: "⚙️" },
    { id: "email", label: "Email & Branding", icon: "📧" },
    { id: "features", label: "Features & Notifications", icon: "🔔" }
  ];

  return (
    <form onSubmit={handleSubmit} className="settings-form">
      <div className="tabs">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            className={`tab ${activeTab === tab.id ? "active" : ""}`}
            onClick={() => setActiveTab(tab.id as typeof activeTab)}
          >
            <span>{tab.icon}</span> {tab.label}
          </button>
        ))}
      </div>

      {message && (
        <div className={`message ${message.type}`}>
          {message.text}
        </div>
      )}

      {/* General Tab */}
      {activeTab === "general" && (
        <div className="tab-content">
          <h3>Company Information</h3>
          <p className="section-description">
            Basic settings for {companyName}
          </p>
          
          <div className="form-group">
            <label>Company ID</label>
            <input type="text" value={companyId} disabled />
            <span className="help-text">This is the unique identifier for this company</span>
          </div>
        </div>
      )}

      {/* Email Tab */}
      {activeTab === "email" && (
        <div className="tab-content">
          <h3>Email Configuration</h3>
          <p className="section-description">
            Configure how emails are sent for this company
          </p>

          <div className="form-group">
            <label htmlFor="emailFromName">From Name</label>
            <input
              id="emailFromName"
              name="emailFromName"
              type="text"
              defaultValue={initialSettings.emailFromName || ""}
              placeholder="e.g., CrowdClick Print"
            />
          </div>

          <div className="form-group">
            <label htmlFor="emailFromAddress">From Email Address</label>
            <input
              id="emailFromAddress"
              name="emailFromAddress"
              type="email"
              defaultValue={initialSettings.emailFromAddress || ""}
              placeholder="e.g., noreply@crowdclick.com.au"
            />
          </div>

          <div className="form-group">
            <label htmlFor="emailReplyTo">Reply-To Address</label>
            <input
              id="emailReplyTo"
              name="emailReplyTo"
              type="email"
              defaultValue={initialSettings.emailReplyTo || ""}
              placeholder="e.g., support@crowdclick.com.au"
            />
          </div>

          <div className="form-group checkbox">
            <label>
              <input
                name="useCustomEmailProvider"
                type="checkbox"
                defaultChecked={initialSettings.useCustomEmailProvider}
              />
              Use Custom Email Provider
            </label>
            <span className="help-text">
              If enabled, this company will use its own Postmark/Mailgun credentials
            </span>
          </div>

          <div className="subsection">
            <h4>Custom Postmark Settings</h4>
            <div className="form-group">
              <label htmlFor="customPostmarkToken">Server Token</label>
              <input
                id="customPostmarkToken"
                name="customPostmarkToken"
                type="password"
                defaultValue={initialSettings.customPostmarkToken || ""}
                placeholder="••••••••"
              />
            </div>
          </div>

          <div className="subsection">
            <h4>Custom Mailgun Settings</h4>
            <div className="form-row">
              <div className="form-group">
                <label htmlFor="customMailgunDomain">Domain</label>
                <input
                  id="customMailgunDomain"
                  name="customMailgunDomain"
                  type="text"
                  defaultValue={initialSettings.customMailgunDomain || ""}
                  placeholder="mg.yourdomain.com"
                />
              </div>
              <div className="form-group">
                <label htmlFor="customMailgunApiKey">API Key</label>
                <input
                  id="customMailgunApiKey"
                  name="customMailgunApiKey"
                  type="password"
                  defaultValue={initialSettings.customMailgunApiKey || ""}
                  placeholder="key-••••••••"
                />
              </div>
            </div>
          </div>

          <div className="subsection">
            <h4>Branding</h4>
            <div className="form-group">
              <label htmlFor="brandLogoUrl">Logo URL</label>
              <input
                id="brandLogoUrl"
                name="brandLogoUrl"
                type="url"
                defaultValue={initialSettings.brandLogoUrl || ""}
                placeholder="https://cdn.example.com/logo.png"
              />
            </div>

            <div className="form-group">
              <label htmlFor="brandPrimaryColor">Primary Color</label>
              <div className="color-input">
                <input
                  id="brandPrimaryColor"
                  name="brandPrimaryColor"
                  type="color"
                  defaultValue={initialSettings.brandPrimaryColor || "#1a1a2e"}
                />
                <input
                  type="text"
                  defaultValue={initialSettings.brandPrimaryColor || "#1a1a2e"}
                  placeholder="#1a1a2e"
                  pattern="^#[0-9A-Fa-f]{6}$"
                />
              </div>
            </div>

            <div className="form-group">
              <label htmlFor="customEmailFooter">Custom Email Footer</label>
              <textarea
                id="customEmailFooter"
                name="customEmailFooter"
                rows={3}
                defaultValue={initialSettings.customEmailFooter || ""}
                placeholder="Copyright 2024 Your Company. All rights reserved."
              />
            </div>
          </div>
        </div>
      )}

      {/* Features Tab */}
      {activeTab === "features" && (
        <div className="tab-content">
          <h3>Feature Toggles</h3>
          <p className="section-description">
            Enable or disable features for this company
          </p>

          <div className="toggle-list">
            <label className="toggle-item">
              <div className="toggle-info">
                <span className="toggle-label">Proof Workflow</span>
                <span className="toggle-description">Enable proof upload and approval process</span>
              </div>
              <input
                name="enableProofWorkflow"
                type="checkbox"
                defaultChecked={initialSettings.enableProofWorkflow}
              />
            </label>

            <label className="toggle-item">
              <div className="toggle-info">
                <span className="toggle-label">Customer Portal</span>
                <span className="toggle-description">Allow customers to view orders and respond to proofs</span>
              </div>
              <input
                name="enableCustomerPortal"
                type="checkbox"
                defaultChecked={initialSettings.enableCustomerPortal}
              />
            </label>

            <label className="toggle-item">
              <div className="toggle-info">
                <span className="toggle-label">Auto Notifications</span>
                <span className="toggle-description">Automatically send email notifications</span>
              </div>
              <input
                name="enableAutoNotifications"
                type="checkbox"
                defaultChecked={initialSettings.enableAutoNotifications}
              />
            </label>

            <label className="toggle-item">
              <div className="toggle-info">
                <span className="toggle-label">Require Proof Approval</span>
                <span className="toggle-description">Orders require proof approval before printing</span>
              </div>
              <input
                name="requireProofApproval"
                type="checkbox"
                defaultChecked={initialSettings.requireProofApproval}
              />
            </label>
          </div>

          <h3>Notification Events</h3>
          <p className="section-description">
            Choose which events trigger email notifications
          </p>

          <div className="toggle-list">
            <label className="toggle-item">
              <div className="toggle-info">
                <span className="toggle-label">Order Created</span>
                <span className="toggle-description">Send notification when a new order is created</span>
              </div>
              <input
                name="notifyOnOrderCreated"
                type="checkbox"
                defaultChecked={initialSettings.notifyOnOrderCreated}
              />
            </label>

            <label className="toggle-item">
              <div className="toggle-info">
                <span className="toggle-label">Status Updates</span>
                <span className="toggle-description">Send notification when order status changes</span>
              </div>
              <input
                name="notifyOnStatusUpdate"
                type="checkbox"
                defaultChecked={initialSettings.notifyOnStatusUpdate}
              />
            </label>

            <label className="toggle-item">
              <div className="toggle-info">
                <span className="toggle-label">Proof Review</span>
                <span className="toggle-description">Send notification when proof is reviewed by staff</span>
              </div>
              <input
                name="notifyOnProofReview"
                type="checkbox"
                defaultChecked={initialSettings.notifyOnProofReview}
              />
            </label>

            <label className="toggle-item">
              <div className="toggle-info">
                <span className="toggle-label">Proof Response</span>
                <span className="toggle-description">Send notification when customer responds to proof</span>
              </div>
              <input
                name="notifyOnProofResponse"
                type="checkbox"
                defaultChecked={initialSettings.notifyOnProofResponse}
              />
            </label>
          </div>
        </div>
      )}

      <div className="form-actions">
        <button type="submit" className="btn btn-primary" disabled={isLoading}>
          {isLoading ? "Saving..." : "Save Settings"}
        </button>
      </div>

    </form>
  );
}
