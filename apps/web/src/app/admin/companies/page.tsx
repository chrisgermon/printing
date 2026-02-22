export const dynamic = 'force-dynamic';

import Link from "next/link";
import { prisma } from "@/lib/db";
import { CreateCompanyButton } from "./CreateCompanyButton";

export default async function AdminCompaniesPage() {
  const companies = await prisma.company.findMany({
    orderBy: { name: "asc" },
    include: {
      _count: {
        select: { customers: true, userAccounts: true }
      },
      settings: true
    }
  });

  return (
    <div className="admin-page">
      <div className="admin-header admin-header--split">
        <div>
          <h1>Companies</h1>
          <p>Manage companies and their settings.</p>
        </div>
        <div className="admin-header-actions">
          <CreateCompanyButton />
        </div>
      </div>

      <div className="admin-card-grid">
        {companies.map((company) => (
          <div key={company.id} className="admin-card">
            <div className="admin-card-header">
              <h3 className="admin-card-title">{company.name}</h3>
              {company.isInternal && (
                <span className="badge badge-internal">
                  Internal
                </span>
              )}
            </div>

            <div className="company-stats">
              <div className="company-stat">
                <span className="company-stat-value">{company._count.customers}</span>
                <span className="company-stat-label">Customers</span>
              </div>
              <div className="company-stat">
                <span className="company-stat-value">{company._count.userAccounts}</span>
                <span className="company-stat-label">Users</span>
              </div>
            </div>

            <div className="kv-list">
              {company.settings ? (
                <>
                  <div className="kv-row">
                    <span className="kv-label">From:</span>
                    <span className="kv-value">{company.settings.emailFromAddress || "Not set"}</span>
                  </div>
                  <div className="kv-row">
                    <span className="kv-label">Portal:</span>
                    <span className={`kv-value ${company.settings.enableCustomerPortal ? "status-enabled" : "status-disabled"}`}>
                      {company.settings.enableCustomerPortal ? "✓ Enabled" : "✗ Disabled"}
                    </span>
                  </div>
                  <div className="kv-row">
                    <span className="kv-label">Proofs:</span>
                    <span className={`kv-value ${company.settings.enableProofWorkflow ? "status-enabled" : "status-disabled"}`}>
                      {company.settings.enableProofWorkflow ? "✓ Enabled" : "✗ Disabled"}
                    </span>
                  </div>
                </>
              ) : (
                <p className="help-text">Using default settings</p>
              )}
            </div>

            <div className="company-actions">
              <Link href={`/admin/companies/${company.id}/settings`} className="btn btn-primary">
                Settings
              </Link>
              <Link href={`/admin/companies/${company.id}`} className="btn btn-secondary">
                Details
              </Link>
            </div>
          </div>
        ))}
      </div>

      {companies.length === 0 && (
        <div className="empty-state">
          <p>No companies found. Create your first company to get started.</p>
        </div>
      )}
    </div>
  );
}
