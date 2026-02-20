import { auth } from "@/auth";
import { redirect } from "next/navigation";

export type UserRole = "CUSTOMER" | "STAFF" | "ADMIN";
export type UserType = "INTERNAL" | "CLIENT";
export type SessionUser = {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  userType: UserType;
  companyId?: string | null;
  customerId?: string | null;
};

export async function getSessionUser() {
  const session = await auth();
  if (!session?.user?.email) return null;
  return {
    id: session.user.id,
    name: session.user.name || session.user.email,
    email: session.user.email,
    role: session.user.role,
    userType: session.user.userType,
    companyId: session.user.companyId,
    customerId: session.user.customerId
  } satisfies SessionUser;
}

export async function requireSession(allowedRoles?: UserRole[]) {
  const user = await getSessionUser();
  if (!user) {
    redirect("/login");
  }

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    redirect("/");
  }

  return user;
}
