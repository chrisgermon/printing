import Link from "next/link";
import { OrderRequestForm } from "@/components/OrderRequestForm";
import { requireSession } from "@/lib/auth";

export default async function NewOrderPage() {
  await requireSession();

  return (
    <div className="stack-lg">
      <div className="breadcrumb">
        <Link href="/orders">Orders</Link>
        <span>/</span>
        <span>New Order</span>
      </div>

      <article className="panel hero">
        <div>
          <h1>New Print Order</h1>
          <p>Capture customer requirements, quantity, and delivery timing in one submission.</p>
        </div>
      </article>

      <article className="panel section">
        <h2>Order Request Form</h2>
        <OrderRequestForm />
      </article>
    </div>
  );
}
