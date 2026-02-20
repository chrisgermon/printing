import Link from "next/link";
import { requireSession } from "@/lib/auth";
import { LogoutButton } from "@/components/LogoutButton";

export default async function HomePage() {
  const session = await requireSession();
  const kpis = [
    { label: "Active Jobs", value: "48" },
    { label: "Proofs Waiting", value: "11" },
    { label: "Shipping Today", value: "19" },
    { label: "At Risk", value: "3" }
  ];

  const pipeline = [
    { name: "CC-2409 · Product Sheets", detail: "12,000 units · Due Tue", status: "Proof Sent" },
    { name: "CC-2410 · Event Flyers", detail: "8,500 units · Due Wed", status: "Printing" },
    { name: "CC-2412 · Invoice Books", detail: "2,100 units · Due Fri", status: "Awaiting Approval" }
  ];

  const proofQueue = [
    { name: "Warehouse Signage v3", detail: "Uploaded by Madison", status: "Needs Review" },
    { name: "Price List A2", detail: "Uploaded by Elias", status: "Client Review" },
    { name: "Membership Form", detail: "Uploaded by Team", status: "Approved" }
  ];

  const plans = [
    { name: "Starter", price: "$149", features: ["1 team", "Core order tracking", "Email notifications"] },
    {
      name: "Growth",
      price: "$349",
      features: ["5 team seats", "Proof approvals", "Delivery tracking", "Client portal branding"],
      featured: true
    },
    {
      name: "Scale",
      price: "$799",
      features: ["Unlimited seats", "Advanced workflow rules", "Priority support", "Custom integrations"]
    }
  ];

  const featureMatrix = [
    { feature: "Estimating", starter: true, growth: true, scale: true },
    { feature: "Customer Portal", starter: false, growth: true, scale: true },
    { feature: "Proof Approval Flow", starter: false, growth: true, scale: true },
    { feature: "Delivery Tracking", starter: false, growth: true, scale: true },
    { feature: "Advanced Automation", starter: false, growth: false, scale: true },
    { feature: "API Integrations", starter: false, growth: false, scale: true }
  ];

  const mark = (value: boolean) => (value ? "Yes" : "No");

  return (
    <main className="portal-shell">
      <div className="portal-grid">
        <aside className="panel sidebar">
          <h2 className="brand">PrintPress</h2>
          <div className="nav">
            <button className="active">Operations</button>
            <button>Orders</button>
            <button>Proofs</button>
            <button>Clients</button>
            <button>Delivery</button>
            <button>Billing</button>
          </div>
        </aside>

        <section className="main">
          <article className="panel hero">
            <div>
              <h1>Agency Print Operations</h1>
              <p>
                Track every job from quote to delivered with approval checkpoints and CRM timelines. Signed in as{" "}
                {session.name} ({session.role}).
              </p>
            </div>
            <div className="hero-side">
              <div className="badge">SLA 96.4% this month</div>
              <LogoutButton />
            </div>
          </article>

          <div className="action-row">
            <Link className="btn btn-primary" href="/orders/new">
              New Order
            </Link>
            <Link className="btn" href="/orders">
              Order List
            </Link>
            <Link className="btn" href="/orders/demo-cc-2410">
              View Sample Order
            </Link>
            {session.role !== "CUSTOMER" ? <Link className="btn" href="/clients/client-crowdclick">View Sample Client</Link> : null}
            {session.role === "ADMIN" ? <Link className="btn" href="/admin/users">User Admin</Link> : null}
          </div>

          <div className="kpi-grid">
            {kpis.map((kpi) => (
              <article key={kpi.label} className="panel kpi-card">
                <div className="kpi-label">{kpi.label}</div>
                <div className="kpi-value">{kpi.value}</div>
              </article>
            ))}
          </div>

          <div className="content-grid">
            <article className="panel section">
              <h2>Production Pipeline</h2>
              <div className="list">
                {pipeline.map((item) => (
                  <div key={item.name} className="row">
                    <div>
                      <strong>{item.name}</strong>
                      <span>{item.detail}</span>
                    </div>
                    <div className="pill">{item.status}</div>
                  </div>
                ))}
              </div>
            </article>

            <article className="panel section">
              <h2>Proof Queue</h2>
              <div className="list">
                {proofQueue.map((item) => (
                  <div key={item.name} className="row">
                    <div>
                      <strong>{item.name}</strong>
                      <span>{item.detail}</span>
                    </div>
                    <div className="pill">{item.status}</div>
                  </div>
                ))}
              </div>
            </article>
          </div>

          <article className="panel plans">
            <h2>Plan Options</h2>
            <div className="plan-grid">
              {plans.map((plan) => (
                <div key={plan.name} className={`plan ${plan.featured ? "featured" : ""}`}>
                  <h3>{plan.name}</h3>
                  <div className="price">{plan.price}/mo</div>
                  <ul>
                    {plan.features.map((feature) => (
                      <li key={feature}>{feature}</li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
            <div className="matrix-wrap">
              <table className="matrix">
                <thead>
                  <tr>
                    <th>Features</th>
                    <th>Starter</th>
                    <th>Growth</th>
                    <th>Scale</th>
                  </tr>
                </thead>
                <tbody>
                  {featureMatrix.map((row) => (
                    <tr key={row.feature}>
                      <td>{row.feature}</td>
                      <td>{mark(row.starter)}</td>
                      <td>{mark(row.growth)}</td>
                      <td>{mark(row.scale)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </article>
        </section>
      </div>
    </main>
  );
}
