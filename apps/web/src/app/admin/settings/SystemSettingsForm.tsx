"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { SystemSettings } from "@prisma/client";

interface SystemSettingsFormProps {
  initialSettings: Record<string, SystemSettings[]>;
}

const categories = [
  { id: "email", label: "Email", icon: "📧" },
  { id: "postmark", label: "Postmark", icon: "📨" },
  { id: "mailgun", label: "Mailgun", icon: "📬" },
  { id: "storage", label: "Storage (Spaces)", icon: "💾" },
  { id: "notifications", label: "Notifications", icon: "🔔" },
  { id: "security", label: "Security", icon: "🔒" }
];

export function SystemSettingsForm({ initialSettings }: SystemSettingsFormProps) {
  const router = useRouter();
  const [activeCategory, setActiveCategory] = useState("email");
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [editing, setEditing] = useState<Record<string, boolean>>({});

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setIsLoading(true);
    setMessage(null);

    const formData = new FormData(e.currentTarget);
    const settings: Record<string, { value: string; isSensitive: boolean }> = {};

    categories.forEach((cat) => {
      const catSettings = initialSettings[cat.id] || [];
      catSettings.forEach((setting) => {
        const value = formData.get(`setting-${setting.key}`) as string;
        if (value !== null) {
          settings[setting.key] = {
            value,
            isSensitive: setting.isSensitive
          };
        }
      });
    });

    try {
      for (const [key, { value, isSensitive }] of Object.entries(settings)) {
        const response = await fetch("/api/admin/settings", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            key,
            value,
            category: activeCategory,
            isSensitive
          })
        });

        if (!response.ok) {
          const data = await response.json();
          throw new Error(data.error || `Failed to save ${key}`);
        }
      }

      setMessage({ type: "success", text: "Settings saved successfully" });
      router.refresh();
    } catch (err) {
      setMessage({ type: "error", text: err instanceof Error ? err.message : "Failed to save settings" });
    } finally {
      setIsLoading(false);
    }
  }

  async function handleDelete(key: string) {
    if (!confirm(`Are you sure you want to delete the setting "${key}"?`)) {
      return;
    }

    try {
      const response = await fetch(`/api/admin/settings?key=${encodeURIComponent(key)}`, {
        method: "DELETE"
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to delete setting");
      }

      router.refresh();
    } catch (err) {
      setMessage({ type: "error", text: err instanceof Error ? err.message : "Failed to delete setting" });
    }
  }

  async function handleAddSetting(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setIsLoading(true);
    setMessage(null);

    const formData = new FormData(e.currentTarget);
    const key = formData.get("newKey") as string;
    const value = formData.get("newValue") as string;
    const description = formData.get("newDescription") as string;
    const isSensitive = formData.get("newIsSensitive") === "on";

    try {
      const response = await fetch("/api/admin/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          key,
          value,
          category: activeCategory,
          description,
          isSensitive
        })
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to add setting");
      }

      setMessage({ type: "success", text: "Setting added successfully" });
      e.currentTarget.reset();
      router.refresh();
    } catch (err) {
      setMessage({ type: "error", text: err instanceof Error ? err.message : "Failed to add setting" });
    } finally {
      setIsLoading(false);
    }
  }

  const currentSettings = initialSettings[activeCategory] || [];
  const activeCategoryMeta = categories.find((c) => c.id === activeCategory);

  return (
    <div className="settings-container">
      <div className="category-tabs">
        {categories.map((cat) => (
          <button
            key={cat.id}
            type="button"
            className={`category-tab ${activeCategory === cat.id ? "active" : ""}`}
            onClick={() => setActiveCategory(cat.id)}
          >
            <span>{cat.icon}</span> {cat.label}
          </button>
        ))}
      </div>

      <div className="settings-content">
        {message && <div className={`message ${message.type}`}>{message.text}</div>}

        <form onSubmit={handleSubmit} className="settings-section">
          <div className="section-header">
            <h3>
              {activeCategoryMeta?.icon} {activeCategoryMeta?.label} Settings
            </h3>
          </div>

          {currentSettings.length === 0 ? (
            <p className="empty-state">No settings in this category yet.</p>
          ) : (
            <div className="settings-list">
              {currentSettings.map((setting) => (
                <div key={setting.key} className="setting-row">
                  <div className="setting-info">
                    <label htmlFor={`setting-${setting.key}`} className="setting-key">
                      {setting.key}
                      {setting.isSensitive && <span className="badge badge-sensitive">Sensitive</span>}
                    </label>
                    {setting.description && <span className="setting-description">{setting.description}</span>}
                  </div>
                  <div className="setting-input">
                    {editing[setting.key] ? (
                      <input
                        id={`setting-${setting.key}`}
                        name={`setting-${setting.key}`}
                        type={setting.isSensitive ? "password" : "text"}
                        defaultValue={setting.isSensitive ? "" : setting.value}
                        placeholder={setting.isSensitive ? "••••••••" : "Enter value"}
                        autoFocus
                      />
                    ) : (
                      <div className="setting-value">{setting.isSensitive ? "••••••••" : setting.value}</div>
                    )}
                    <button
                      type="button"
                      className="btn btn-small"
                      onClick={() => setEditing((prev) => ({ ...prev, [setting.key]: !prev[setting.key] }))}
                    >
                      {editing[setting.key] ? "Cancel" : "Edit"}
                    </button>
                    <button
                      type="button"
                      className="btn btn-small btn-danger"
                      onClick={() => handleDelete(setting.key)}
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="form-actions-inline-end">
            <button type="submit" className="btn btn-primary" disabled={isLoading}>
              {isLoading ? "Saving..." : "Save Changes"}
            </button>
          </div>
        </form>

        <div className="add-setting-section">
          <h4>Add New Setting</h4>
          <form onSubmit={handleAddSetting} className="add-setting-form">
            <div className="form-row">
              <input
                name="newKey"
                type="text"
                placeholder="Setting key (e.g., EMAIL_TIMEOUT)"
                required
              />
              <input name="newValue" type="text" placeholder="Value" required />
            </div>
            <input name="newDescription" type="text" placeholder="Description (optional)" />
            <label className="checkbox">
              <input name="newIsSensitive" type="checkbox" />
              Sensitive value (masked in UI)
            </label>
            <button type="submit" className="btn btn-secondary" disabled={isLoading}>
              Add Setting
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
