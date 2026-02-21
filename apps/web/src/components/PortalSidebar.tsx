"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { UserNav } from "@/components/UserNav";

type PortalSidebarProps = {
  name: string;
  role: string;
  userType: string;
};

export function PortalSidebar({ name, role, userType }: PortalSidebarProps) {
  const pathname = usePathname();

  const navItems = [
    { href: "/", label: "Dashboard", staffOnly: true },
    { href: "/orders", label: "Orders", staffOnly: false },
    { href: "/clients", label: "Clients", staffOnly: true },
  ].filter((item) => !item.staffOnly || ["STAFF", "ADMIN"].includes(role));

  const disabledNavItems = ["Proofs", "Delivery", "Billing"];

  function isActive(href: string) {
    if (href === "/") return pathname === "/";
    return pathname === href || pathname.startsWith(href + "/");
  }

  return (
    <aside className="panel sidebar">
      <h2 className="brand">PrintPress</h2>
      <div className="nav">
        {navItems.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={`nav-link${isActive(item.href) ? " active" : ""}`}
          >
            {item.label}
          </Link>
        ))}
        {disabledNavItems.map((label) => (
          <button key={label} className="nav-disabled" disabled type="button">
            {label}
            <span className="nav-soon">Soon</span>
          </button>
        ))}
      </div>
      <div className="sidebar-footer">
        {role === "ADMIN" && (
          <Link href="/admin" className="nav-link nav-admin">
            Admin Panel
          </Link>
        )}
        <UserNav name={name} role={role} />
      </div>
    </aside>
  );
}
