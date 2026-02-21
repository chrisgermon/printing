"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { signOut } from "next-auth/react";

export function UserNav({
  name,
  role,
  variant = "portal"
}: {
  name: string;
  role: string;
  variant?: "admin" | "portal";
}) {
  const router = useRouter();
  const [pending, setPending] = useState(false);

  async function logout() {
    setPending(true);
    await signOut({ redirect: false });
    router.push("/login");
    router.refresh();
  }

  if (variant === "admin") {
    return (
      <div className="admin-user-nav">
        <div className="admin-user-info">
          <span className="admin-user-name">{name}</span>
          <span className="admin-user-role">{role}</span>
        </div>
        <button
          className="admin-logout-btn"
          disabled={pending}
          onClick={logout}
          type="button"
        >
          {pending ? "..." : "Sign Out"}
        </button>
      </div>
    );
  }

  return (
    <div className="user-nav">
      <div className="user-nav-info">
        <strong className="user-nav-name">{name}</strong>
        <span className="user-nav-role">{role}</span>
      </div>
      <button
        className="btn user-nav-logout"
        disabled={pending}
        onClick={logout}
        type="button"
      >
        {pending ? "..." : "Sign Out"}
      </button>
    </div>
  );
}
