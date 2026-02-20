import { LoginForm } from "@/components/LoginForm";
import { auth } from "@/auth";
import { redirect } from "next/navigation";

export default async function LoginPage() {
  const session = await auth();
  if (session?.user) {
    redirect("/");
  }

  return (
    <main className="portal-shell">
      <div className="center-wrap">
        <article className="panel section login-card">
          <h1>PrintPress Login</h1>
          <p className="muted-block">Sign in with your assigned email/password account.</p>
          <LoginForm />
        </article>
      </div>
    </main>
  );
}
