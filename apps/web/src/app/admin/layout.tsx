import Link from "next/link";
import { requireSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import { UserNav } from "@/components/UserNav";
import "./admin.css";

export default async function AdminLayout({
  children
}: {
  children: React.ReactNode;
}) {
  const session = await requireSession(["ADMIN"]);

  if (session.role !== "ADMIN") {
    redirect("/");
  }

  const navItems = [
    { href: "/admin", label: "Dashboard", icon: "\u{1F4CA}" },
    { href: "/admin/users", label: "Users", icon: "\u{1F465}" },
    { href: "/admin/companies", label: "Companies", icon: "\u{1F3E2}" },
    { href: "/admin/email-templates", label: "Email Templates", icon: "\u{1F4E7}" },
    { href: "/admin/integrations", label: "Integrations", icon: "\u{1F50C}" },
    { href: "/admin/settings", label: "Settings", icon: "\u2699\uFE0F" },
    { href: "/admin/audit-log", label: "Audit Log", icon: "\u{1F4CB}" }
  ];

  return (
    <div className="admin-layout">
      <aside className="admin-sidebar">
        <div className="admin-brand">
          <h2>Admin Panel</h2>
          <span className="admin-version">PrintPress v1</span>
        </div>
        <nav className="admin-nav">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="admin-nav-item"
            >
              <span className="admin-nav-icon">{item.icon}</span>
              {item.label}
            </Link>
          ))}
        </nav>
        <div className="admin-footer">
          <Link href="/" className="admin-back-link">
            &larr; Back to Portal
          </Link>
          <UserNav name={session.name} role={session.role} variant="admin" />
        </div>
      </aside>
      <main className="admin-main">
        {children}
      </main>
    </div>
  );
}
