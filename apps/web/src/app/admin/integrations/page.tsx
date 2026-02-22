"use client";

import { useState } from "react";

export default function IntegrationsPage() {
  const [activeTab, setActiveTab] = useState<"postmark" | "mailgun" | "spaces">("postmark");
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string; details?: any } | null>(null);

  async function handleTest(config: Record<string, string>) {
    setIsTesting(true);
    setTestResult(null);

    try {
      const response = await fetch("/api/admin/integrations/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ provider: activeTab, config })
      });

      const data = await response.json();

      if (response.ok) {
        setTestResult({ success: true, message: data.message, details: data.details });
      } else {
        setTestResult({ success: false, message: data.error || "Test failed" });
      }
    } catch (err) {
      setTestResult({ success: false, message: err instanceof Error ? err.message : "Test failed" });
    } finally {
      setIsTesting(false);
    }
  }

  return (
    <div className="admin-page">
      <div className="admin-header">
        <h1>Integrations</h1>
        <p>Configure and test third-party service integrations.</p>
      </div>

      <div className="integration-tabs">
        <button className={`integration-tab ${activeTab === "postmark" ? "active" : ""}`} type="button" onClick={() => setActiveTab("postmark")}>
          📨 Postmark
        </button>
        <button className={`integration-tab ${activeTab === "mailgun" ? "active" : ""}`} type="button" onClick={() => setActiveTab("mailgun")}>
          📬 Mailgun
        </button>
        <button className={`integration-tab ${activeTab === "spaces" ? "active" : ""}`} type="button" onClick={() => setActiveTab("spaces")}>
          💾 DigitalOcean Spaces
        </button>
      </div>

      <div className="integration-panel">
        {activeTab === "postmark" && <PostmarkTest onTest={handleTest} isTesting={isTesting} />}
        {activeTab === "mailgun" && <MailgunTest onTest={handleTest} isTesting={isTesting} />}
        {activeTab === "spaces" && <SpacesTest onTest={handleTest} isTesting={isTesting} />}

        {testResult && (
          <div className={`integration-result ${testResult.success ? "integration-result-success" : "integration-result-error"}`}>
            <h4>
              {testResult.success ? "✅ Connection Successful" : "❌ Connection Failed"}
            </h4>
            <p>{testResult.message}</p>
            {testResult.details && (
              <pre>
                {JSON.stringify(testResult.details, null, 2)}
              </pre>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

interface TestFormProps {
  onTest: (config: Record<string, string>) => void;
  isTesting: boolean;
}

function PostmarkTest({ onTest, isTesting }: TestFormProps) {
  const [token, setToken] = useState("");

  return (
    <div>
      <h3>Test Postmark Connection</h3>
      <p className="section-description">
        Enter your Postmark server token to test the connection.
      </p>
      <div className="form-group">
        <label>
          Server Token
        </label>
        <input
          type="password"
          value={token}
          onChange={(e) => setToken(e.target.value)}
          placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
        />
      </div>
      <button
        className="btn btn-primary"
        onClick={() => onTest({ POSTMARK_SERVER_TOKEN: token })}
        disabled={isTesting || !token}
        type="button"
      >
        {isTesting ? "Testing..." : "Test Connection"}
      </button>
    </div>
  );
}

function MailgunTest({ onTest, isTesting }: TestFormProps) {
  const [domain, setDomain] = useState("");
  const [apiKey, setApiKey] = useState("");

  return (
    <div>
      <h3>Test Mailgun Connection</h3>
      <p className="section-description">
        Enter your Mailgun domain and API key to test the connection.
      </p>
      <div className="integration-grid-2">
        <div className="form-group">
          <label>Domain</label>
          <input
            type="text"
            value={domain}
            onChange={(e) => setDomain(e.target.value)}
            placeholder="mg.yourdomain.com"
          />
        </div>
        <div className="form-group">
          <label>API Key</label>
          <input
            type="password"
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            placeholder="key-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
          />
        </div>
      </div>
      <button
        className="btn btn-primary"
        onClick={() => onTest({ MAILGUN_DOMAIN: domain, MAILGUN_API_KEY: apiKey })}
        disabled={isTesting || !domain || !apiKey}
        type="button"
      >
        {isTesting ? "Testing..." : "Test Connection"}
      </button>
    </div>
  );
}

function SpacesTest({ onTest, isTesting }: TestFormProps) {
  const [region, setRegion] = useState("nyc3");
  const [endpoint, setEndpoint] = useState("https://nyc3.digitaloceanspaces.com");
  const [bucket, setBucket] = useState("");
  const [accessKey, setAccessKey] = useState("");
  const [secretKey, setSecretKey] = useState("");

  return (
    <div>
      <h3>Test DigitalOcean Spaces Connection</h3>
      <p className="section-description">
        Enter your Spaces configuration to test the connection.
      </p>
      <div className="integration-grid-2">
        <div className="form-group">
          <label>Region</label>
          <select value={region} onChange={(e) => setRegion(e.target.value)}>
            <option value="nyc3">NYC3 (New York)</option>
            <option value="ams3">AMS3 (Amsterdam)</option>
            <option value="sfo3">SFO3 (San Francisco)</option>
            <option value="sgp1">SGP1 (Singapore)</option>
            <option value="fra1">FRA1 (Frankfurt)</option>
            <option value="syd1">SYD1 (Sydney)</option>
          </select>
        </div>
        <div className="form-group">
          <label>Bucket Name</label>
          <input
            type="text"
            value={bucket}
            onChange={(e) => setBucket(e.target.value)}
            placeholder="my-bucket"
          />
        </div>
      </div>
      <div className="form-group">
        <label>Endpoint</label>
        <input
          type="text"
          value={endpoint}
          onChange={(e) => setEndpoint(e.target.value)}
          placeholder="https://nyc3.digitaloceanspaces.com"
        />
      </div>
      <div className="integration-grid-2">
        <div className="form-group">
          <label>Access Key</label>
          <input
            type="text"
            value={accessKey}
            onChange={(e) => setAccessKey(e.target.value)}
            placeholder="DO00xxxxxxxxxxxxxxxx"
          />
        </div>
        <div className="form-group">
          <label>Secret Key</label>
          <input
            type="password"
            value={secretKey}
            onChange={(e) => setSecretKey(e.target.value)}
            placeholder="••••••••••••••••••••••••••"
          />
        </div>
      </div>
      <button
        className="btn btn-primary"
        onClick={() => onTest({
          SPACES_REGION: region,
          SPACES_ENDPOINT: endpoint,
          SPACES_BUCKET: bucket,
          SPACES_ACCESS_KEY: accessKey,
          SPACES_SECRET_KEY: secretKey
        })}
        disabled={isTesting || !bucket || !accessKey || !secretKey}
        type="button"
      >
        {isTesting ? "Testing..." : "Test Connection"}
      </button>
    </div>
  );
}
