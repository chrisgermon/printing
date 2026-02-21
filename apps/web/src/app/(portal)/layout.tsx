import { requireSession } from "@/lib/auth";
import { PortalSidebar } from "@/components/PortalSidebar";

export default async function PortalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await requireSession();

  return (
    <div className="portal-shell">
      <div className="portal-grid">
        <PortalSidebar
          name={session.name}
          role={session.role}
          userType={session.userType}
        />
        <section className="main">{children}</section>
      </div>
    </div>
  );
}
