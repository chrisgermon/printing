import Link from "next/link";
import { prisma } from "@/lib/db";

export default async function AdminDashboardPage() {
  // Get quick stats
  const [
    companyCount,
    userCount,
    customerCount,
    orderCount,
    pendingJobs,
    recentAuditLogs
  ] = await Promise.all([
    prisma.company.count().catch(() => 0),
    prisma.userAccount.count().catch(() => 0),
    prisma.customer.count().catch(() => 0),
    prisma.order.count().catch(() => 0),
    prisma.outboxJob.count({ where: { status: "PENDING" } }).catch(() => 0),
    prisma.auditLog.findMany({
      orderBy: { createdAt: "desc" },
      take: 10
    }).catch(() => [])
  ]);

  const stats = [
    { label: "Companies", value: companyCount, href: "/admin/companies" },
    { label: "Users", value: userCount, href: "/admin/users" },
    { label: "Customers", value: customerCount, href: "/clients" },
    { label: "Orders", value: orderCount, href: "/orders" },
    { label: "Pending Jobs", value: pendingJobs, href: "/admin/integrations" }
  ];

  return (
    <div className="admin-page">
      <div className="admin-header">
        <h1>Admin Dashboard</h1>
        <p>Manage your PrintPress system configuration and monitor activity.</p>
      </div>

      <div className="stats-grid">
        {stats.map((stat) => (
          <Link key={stat.label} href={stat.href} className="stat-card">
            <span className="stat-value">{stat.value}</span>
            <span className="stat-label">{stat.label}</span>
          </Link>
        ))}
      </div>

      <div className="admin-grid">
        <div className="admin-section">
          <h2>Quick Actions</h2>
          <div className="quick-actions">
            <Link href="/admin/companies" className="quick-action">
              <span className="quick-action-icon">+</span>
              <span>Create Company</span>
            </Link>
            <Link href="/admin/email-templates" className="quick-action">
              <span className="quick-action-icon">+</span>
              <span>New Email Template</span>
            </Link>
            <Link href="/admin/integrations" className="quick-action">
              <span className="quick-action-icon">⚡</span>
              <span>Test Integrations</span>
            </Link>
            <Link href="/admin/settings" className="quick-action">
              <span className="quick-action-icon">⚙️</span>
              <span>System Settings</span>
            </Link>
          </div>
        </div>

        <div className="admin-section">
          <h2>Recent Activity</h2>
          <div className="activity-list">
            {recentAuditLogs.length === 0 ? (
              <p className="empty-state">No recent activity</p>
            ) : (
              recentAuditLogs.map((log) => (
                <div key={log.id} className="activity-item">
                  <div className="activity-meta">
                    <span className="activity-action">{log.action}</span>
                    <span className="activity-resource">{log.resource}</span>
                    <span className="activity-time">
                      {new Date(log.createdAt).toLocaleString()}
                    </span>
                  </div>
                  <div className="activity-actor">
                    {log.actorEmail}
                  </div>
                </div>
              ))
            )}
          </div>
          <Link href="/admin/audit-log" className="view-all-link">
            View all activity →
          </Link>
        </div>
      </div>
    </div>
  );
}
