"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { signOut } from "next-auth/react";

export function LogoutButton() {
  const router = useRouter();
  const [pending, setPending] = useState(false);

  async function logout() {
    setPending(true);
    await signOut({ redirect: false });
    router.push("/login");
    router.refresh();
  }

  return (
    <button className="btn" disabled={pending} onClick={logout} type="button">
      {pending ? "Signing out..." : "Sign Out"}
    </button>
  );
}
