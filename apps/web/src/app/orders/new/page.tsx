import Link from "next/link";
import { OrderRequestForm } from "@/components/OrderRequestForm";
import { requireSession } from "@/lib/auth";

export default async function NewOrderPage() {
  await requireSession();

  return (
    <main className="portal-shell">
      <div className="stack-lg">
        <article className="panel hero">
          <div>
            <h1>New Print Order</h1>
            <p>Capture customer requirements, quantity, and delivery timing in one submission.</p>
          </div>
          <Link className="btn" href="/">
            Back to Dashboard
          </Link>
        </article>

        <article className="panel section">
          <h2>Order Request Form</h2>
          <OrderRequestForm />
        </article>
      </div>
    </main>
  );
}
