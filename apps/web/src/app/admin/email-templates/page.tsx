export const dynamic = 'force-dynamic';

import Link from "next/link";
import { prisma } from "@/lib/db";
import { CreateTemplateButton } from "./CreateTemplateButton";

export default async function EmailTemplatesPage() {
  const [templates, companies] = await Promise.all([
    prisma.emailTemplate.findMany({
      orderBy: [
        { companyId: "asc" },
        { name: "asc" }
      ],
      include: {
        company: { select: { id: true, name: true } }
      }
    }),
    prisma.company.findMany({
      orderBy: { name: "asc" },
      select: { id: true, name: true }
    })
  ]);

  const systemTemplates = templates.filter((t) => !t.companyId);
  const companyTemplates = templates.filter((t) => t.companyId);

  return (
    <div className="admin-page">
      <div className="admin-header">
        <div>
          <h1>Email Templates</h1>
          <p>Customize email templates for system and company communications.</p>
        </div>
        <CreateTemplateButton companies={companies} />
      </div>

      <div className="templates-section">
        <h2>System Templates</h2>
        <p className="section-description">
          Default templates used when no company-specific template exists
        </p>
        <div className="templates-grid">
          {systemTemplates.map((template) => (
            <TemplateCard key={template.id} template={template} />
          ))}
          {systemTemplates.length === 0 && (
            <p className="empty-state">No system templates created yet</p>
          )}
        </div>
      </div>

      <div className="templates-section">
        <h2>Company Templates</h2>
        <p className="section-description">
          Templates specific to individual companies
        </p>
        <div className="templates-grid">
          {companyTemplates.map((template) => (
            <TemplateCard key={template.id} template={template} />
          ))}
          {companyTemplates.length === 0 && (
            <p className="empty-state">No company-specific templates created yet</p>
          )}
        </div>
      </div>

    </div>
  );
}

function TemplateCard({ template }: { template: any }) {
  const variables = extractVariables(template.textBody);

  return (
    <Link href={`/admin/email-templates/${template.id}`} className="template-card">
      <div className="template-header">
        <h3>{template.name}</h3>
        {template.isDefault && <span className="badge badge-default">Default</span>}
        {!template.isActive && <span className="badge badge-inactive">Inactive</span>}
      </div>
      
      {template.company && (
        <div className="template-company">
          🏢 {template.company.name}
        </div>
      )}
      
      <div className="template-subject">{template.subject}</div>
      
      {template.description && (
        <div className="template-description">{template.description}</div>
      )}
      
      {variables.length > 0 && (
        <div className="template-variables">
          {variables.map((v) => (
            <code key={v} className="template-variable">{v}</code>
          ))}
        </div>
      )}

    </Link>
  );
}

function extractVariables(text: string): string[] {
  const matches = text.match(/\{\{(\w+)\}\}/g);
  return matches ? [...new Set(matches)] : [];
}
