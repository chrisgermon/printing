"use client";

import { FormEvent, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { signIn } from "next-auth/react";

export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setPending(true);

    const form = new FormData(event.currentTarget);
    const payload = {
      email: String(form.get("email") || "").trim(),
      password: String(form.get("password") || "")
    };

    try {
      const next = searchParams.get("next") || "/";
      const result = await signIn("credentials", {
        email: payload.email,
        password: payload.password,
        redirect: false,
        callbackUrl: next
      });

      if (!result?.ok) {
        throw new Error("Login failed. Check fields and try again.");
      }

      router.push(next);
      router.refresh();
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Login failed");
    } finally {
      setPending(false);
    }
  }

  return (
    <form className="form-grid" onSubmit={onSubmit}>
      <label>
        Email
        <input name="email" type="email" required placeholder="sam@crowdclick.com.au" />
      </label>

      <label>
        Password
        <input name="password" type="password" required placeholder="Your password" />
      </label>

      {error ? <p className="form-error">{error}</p> : null}

      <div className="form-actions full">
        <button className="btn btn-primary" disabled={pending} type="submit">
          {pending ? "Signing in..." : "Sign In"}
        </button>
      </div>
    </form>
  );
}
