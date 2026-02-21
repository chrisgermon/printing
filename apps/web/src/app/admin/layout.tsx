import { requireSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import { AdminSidebar } from "@/components/AdminSidebar";
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

  return (
    <div className="admin-layout">
      <AdminSidebar name={session.name} role={session.role} />
      <main className="admin-main">
        {children}
      </main>
    </div>
  );
}
