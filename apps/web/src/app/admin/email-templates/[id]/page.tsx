export const dynamic = 'force-dynamic';

import { prisma } from "@/lib/db";
import { notFound } from "next/navigation";
import { TemplateEditor } from "./TemplateEditor";

interface EmailTemplatePageProps {
  params: Promise<{ id: string }>;
}

export default async function EmailTemplatePage({ params }: EmailTemplatePageProps) {
  const { id } = await params;
  
  const template = await prisma.emailTemplate.findUnique({
    where: { id },
    include: {
      company: { select: { id: true, name: true } }
    }
  });

  if (!template) {
    notFound();
  }

  const companies = await prisma.company.findMany({
    orderBy: { name: "asc" },
    select: { id: true, name: true }
  });

  return (
    <div className="admin-page">
      <div className="admin-header">
        <div>
          <h1>Edit Email Template</h1>
          <p>{template.name} {template.company && `(${template.company.name})`}</p>
        </div>
      </div>

      <TemplateEditor template={template} companies={companies} />

    </div>
  );
}
