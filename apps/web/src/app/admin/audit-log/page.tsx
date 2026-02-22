"use client";

import { useState, useEffect } from "react";

interface AuditLog {
  id: string;
  actorEmail: string;
  actorRole: string;
  action: string;
  resource: string;
  resourceId: string | null;
  details: Record<string, unknown> | null;
  companyId: string | null;
  ipAddress: string | null;
  createdAt: string;
}

interface PaginationInfo {
  page: number;
  limit: number;
  total: number;
  pages: number;
}

const actionClasses: Record<string, string> = {
  CREATE: "log-action-create",
  UPDATE: "log-action-update",
  DELETE: "log-action-delete",
  LOGIN: "log-action-login",
  LOGOUT: "log-action-logout"
};

const resourceIcons: Record<string, string> = {
  USER: "👤",
  COMPANY: "🏢",
  COMPANY_SETTINGS: "⚙️",
  EMAIL_TEMPLATE: "📧",
  SYSTEM_SETTINGS: "🔧",
  ORDER: "📦",
  CUSTOMER: "🧑",
  PROOF: "📄",
  COMMUNICATION: "💬"
};

export default function AuditLogPage() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [pagination, setPagination] = useState<PaginationInfo>({ page: 1, limit: 50, total: 0, pages: 1 });
  const [loading, setLoading] = useState(false);
  const [filters, setFilters] = useState({
    action: "",
    resource: "",
    actorEmail: ""
  });

  useEffect(() => {
    fetchLogs();
  }, [pagination.page]);

  async function fetchLogs() {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: String(pagination.page),
        limit: String(pagination.limit),
        ...(filters.action && { action: filters.action }),
        ...(filters.resource && { resource: filters.resource }),
        ...(filters.actorEmail && { actorEmail: filters.actorEmail })
      });

      const response = await fetch(`/api/admin/audit-log?${params}`);
      if (!response.ok) throw new Error("Failed to fetch logs");

      const data = await response.json();
      setLogs(data.logs);
      setPagination(data.pagination);
    } catch (error) {
      console.error("Failed to fetch audit logs:", error);
    } finally {
      setLoading(false);
    }
  }

  function handleFilterSubmit(e: React.FormEvent) {
    e.preventDefault();
    setPagination((p) => ({ ...p, page: 1 }));
    fetchLogs();
  }

  return (
    <div className="admin-page">
      <div className="admin-header">
        <div>
          <h1>Audit Log</h1>
          <p>Track all system activity and changes.</p>
        </div>
      </div>

      <div className="filters-panel">
        <form onSubmit={handleFilterSubmit} className="filters-form">
          <div className="filter-group">
            <label>Action</label>
            <select
              value={filters.action}
              onChange={(e) => setFilters((f) => ({ ...f, action: e.target.value }))}
            >
              <option value="">All Actions</option>
              <option value="CREATE">Create</option>
              <option value="UPDATE">Update</option>
              <option value="DELETE">Delete</option>
              <option value="LOGIN">Login</option>
              <option value="LOGOUT">Logout</option>
            </select>
          </div>
          <div className="filter-group">
            <label>Resource</label>
            <select
              value={filters.resource}
              onChange={(e) => setFilters((f) => ({ ...f, resource: e.target.value }))}
            >
              <option value="">All Resources</option>
              <option value="USER">User</option>
              <option value="COMPANY">Company</option>
              <option value="COMPANY_SETTINGS">Company Settings</option>
              <option value="EMAIL_TEMPLATE">Email Template</option>
              <option value="SYSTEM_SETTINGS">System Settings</option>
              <option value="ORDER">Order</option>
            </select>
          </div>
          <div className="filter-group">
            <label>Actor Email</label>
            <input
              type="text"
              value={filters.actorEmail}
              onChange={(e) => setFilters((f) => ({ ...f, actorEmail: e.target.value }))}
              placeholder="Search by email..."
            />
          </div>
          <button type="submit" className="btn btn-primary">
            Apply Filters
          </button>
        </form>
      </div>

      <div className="logs-panel">
        {loading ? (
          <div className="loading">Loading...</div>
        ) : logs.length === 0 ? (
          <div className="empty-state">No audit logs found</div>
        ) : (
          <>
            <div className="logs-list">
              {logs.map((log) => (
                <div key={log.id} className="log-entry">
                  <div className="log-icon">
                    {resourceIcons[log.resource] || "📋"}
                  </div>
                  <div className="log-content">
                    <div className="log-header">
                      <span
                        className={`log-action ${actionClasses[log.action] || "log-action-logout"}`}
                      >
                        {log.action}
                      </span>
                      <span className="log-resource">{log.resource}</span>
                      <span className="log-time">
                        {new Date(log.createdAt).toLocaleString()}
                      </span>
                    </div>
                    <div className="log-actor">
                      {log.actorEmail} ({log.actorRole})
                      {log.ipAddress && <span className="log-ip">IP: {log.ipAddress}</span>}
                    </div>
                    {log.details && Object.keys(log.details).length > 0 && (
                      <details className="log-details">
                        <summary>View Details</summary>
                        <pre>{JSON.stringify(log.details, null, 2)}</pre>
                      </details>
                    )}
                  </div>
                </div>
              ))}
            </div>

            <div className="pagination">
              <button
                className="btn"
                disabled={pagination.page <= 1}
                onClick={() => setPagination((p) => ({ ...p, page: p.page - 1 }))}
              >
                Previous
              </button>
              <span className="page-info">
                Page {pagination.page} of {pagination.pages} ({pagination.total} total)
              </span>
              <button
                className="btn"
                disabled={pagination.page >= pagination.pages}
                onClick={() => setPagination((p) => ({ ...p, page: p.page + 1 }))}
              >
                Next
              </button>
            </div>
          </>
        )}
      </div>

    </div>
  );
}
