export const dynamic = 'force-dynamic';

import { prisma } from "@/lib/db";
import { notFound } from "next/navigation";
import { CompanySettingsForm } from "./CompanySettingsForm";

interface CompanySettingsPageProps {
  params: Promise<{ id: string }>;
}

export default async function CompanySettingsPage({ params }: CompanySettingsPageProps) {
  const { id } = await params;
  
  const [company, settings] = await Promise.all([
    prisma.company.findUnique({ where: { id } }),
    prisma.companySettings.findUnique({ where: { companyId: id } })
  ]);

  if (!company) {
    notFound();
  }

  // Create default settings if they don't exist
  const companySettings = settings || await prisma.companySettings.create({
    data: { companyId: id }
  });

  return (
    <div className="admin-page">
      <div className="admin-header">
        <div>
          <h1>Company Settings</h1>
          <p>Configure settings for {company.name}</p>
        </div>
      </div>

      <CompanySettingsForm 
        companyId={id}
        companyName={company.name}
        initialSettings={companySettings}
      />

    </div>
  );
}
