export const dynamic = 'force-dynamic';

import { prisma } from "@/lib/db";
import { SystemSettingsForm } from "./SystemSettingsForm";

export default async function SystemSettingsPage() {
  const settings = await prisma.systemSettings.findMany({
    orderBy: [{ category: "asc" }, { key: "asc" }]
  });

  // Group settings by category
  const grouped = settings.reduce((acc, setting) => {
    if (!acc[setting.category]) {
      acc[setting.category] = [];
    }
    acc[setting.category].push(setting);
    return acc;
  }, {} as Record<string, typeof settings>);

  return (
    <div className="admin-page">
      <div className="admin-header">
        <div>
          <h1>System Settings</h1>
          <p>Configure global system-wide settings.</p>
        </div>
      </div>

      <SystemSettingsForm initialSettings={grouped} />

    </div>
  );
}
