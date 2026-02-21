"use client";

import { FormEvent, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/ToastProvider";

type Company = { id: string; name: string };
type Customer = { id: string; name: string; email: string; companyId: string | null };
type User = {
  id: string;
  name: string;
  email: string;
  role: "CUSTOMER" | "STAFF" | "ADMIN";
  userType: "INTERNAL" | "CLIENT";
  isActive: boolean;
  companyId: string | null;
  customerId: string | null;
  company: { id: string; name: string } | null;
  customer: { id: string; name: string; email: string } | null;
};

export function UserManagementPanel({
  companies,
  customers,
  users
}: {
  companies: Company[];
  customers: Customer[];
  users: User[];
}) {
  const router = useRouter();
  const { addToast } = useToast();
  const [pending, setPending] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [newUserType, setNewUserType] = useState<"INTERNAL" | "CLIENT">("INTERNAL");
  const [newCompanyId, setNewCompanyId] = useState(companies[0]?.id || "");
  const [newRole, setNewRole] = useState<"CUSTOMER" | "STAFF" | "ADMIN">("STAFF");

  const filteredCustomers = useMemo(
    () => customers.filter((customer) => !newCompanyId || customer.companyId === newCompanyId),
    [customers, newCompanyId]
  );

  if (!companies.length) {
    return (
      <article className="panel section">
        <h2>No Companies Found</h2>
        <p className="muted-text">
          Create a company first using `npm --workspace @printpress/web run seed:org -- \"CrowdClick\"`.
        </p>
      </article>
    );
  }

  async function createUser(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setResult(null);

    const form = new FormData(event.currentTarget);
    const payload = {
      name: String(form.get("name") || "").trim(),
      email: String(form.get("email") || "").trim(),
      password: String(form.get("password") || ""),
      role: String(form.get("role") || "CUSTOMER"),
      userType: newUserType,
      companyId: String(form.get("companyId") || ""),
      customerId: newUserType === "CLIENT" ? String(form.get("customerId") || "") : undefined,
      isActive: true
    };

    try {
      const response = await fetch("/api/admin/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      if (!response.ok) {
        throw new Error("Failed to create user");
      }
      setResult("User created");
      addToast("User created successfully", "success");
      event.currentTarget.reset();
      router.refresh();
    } catch (error) {
      const msg = error instanceof Error ? error.message : "Failed to create user";
      setResult(msg);
      addToast("Failed to create user. Please try again.", "error");
    } finally {
      setPending(false);
    }
  }

  async function toggleUser(user: User) {
    setPending(true);
    setResult(null);
    try {
      const response = await fetch(`/api/admin/users/${user.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !user.isActive })
      });
      if (!response.ok) {
        throw new Error("Failed to update user");
      }
      const msg = `User ${!user.isActive ? "activated" : "disabled"}`;
      setResult(msg);
      addToast(msg, "success");
      router.refresh();
    } catch (error) {
      const errMsg = error instanceof Error ? error.message : "Failed to update user";
      setResult(errMsg);
      addToast("Failed to update user. Please try again.", "error");
    } finally {
      setPending(false);
    }
  }

  async function toggleRole(user: User) {
    const nextRole =
      user.userType === "CLIENT" ? "CUSTOMER" : user.role === "ADMIN" ? "STAFF" : "ADMIN";
    setPending(true);
    setResult(null);
    try {
      const response = await fetch(`/api/admin/users/${user.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role: nextRole })
      });
      if (!response.ok) {
        throw new Error("Failed to update role");
      }
      setResult(`Role updated to ${nextRole}`);
      addToast(`Role updated to ${nextRole}`, "success");
      router.refresh();
    } catch (error) {
      const errMsg = error instanceof Error ? error.message : "Failed to update role";
      setResult(errMsg);
      addToast("Failed to update role. Please try again.", "error");
    } finally {
      setPending(false);
    }
  }

  async function resetPassword(user: User) {
    const nextPassword = window.prompt(`Set new password for ${user.email} (min 8 chars):`);
    if (!nextPassword) return;
    setPending(true);
    setResult(null);
    try {
      const response = await fetch(`/api/admin/users/${user.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password: nextPassword })
      });
      if (!response.ok) {
        throw new Error("Failed to reset password");
      }
      setResult("Password reset");
      addToast("Password reset successfully", "success");
    } catch (error) {
      const errMsg = error instanceof Error ? error.message : "Failed to reset password";
      setResult(errMsg);
      addToast("Failed to reset password. Please try again.", "error");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="stack-lg">
      <article className="panel section">
        <h2>Create User</h2>
        <form className="form-grid" onSubmit={createUser}>
          <label>
            Name
            <input name="name" required />
          </label>
          <label>
            Email
            <input name="email" required type="email" />
          </label>
          <label>
            Password
            <input name="password" required type="password" />
          </label>
          <label>
            Role
            <select
              name="role"
              value={newRole}
              onChange={(event) => setNewRole(event.target.value as "CUSTOMER" | "STAFF" | "ADMIN")}
            >
              <option value="CUSTOMER">Customer</option>
              {newUserType === "INTERNAL" ? <option value="STAFF">Staff</option> : null}
              {newUserType === "INTERNAL" ? <option value="ADMIN">Admin</option> : null}
            </select>
          </label>
          <label>
            User Type
            <select
              name="userType"
              value={newUserType}
              onChange={(event) => {
                const nextType = event.target.value as "INTERNAL" | "CLIENT";
                setNewUserType(nextType);
                if (nextType === "CLIENT" && newRole !== "CUSTOMER") {
                  setNewRole("CUSTOMER");
                }
                if (nextType === "INTERNAL" && newRole === "CUSTOMER") {
                  setNewRole("STAFF");
                }
              }}
            >
              <option value="INTERNAL">Internal</option>
              <option value="CLIENT">Client</option>
            </select>
          </label>
          <label>
            Company
            <select name="companyId" value={newCompanyId} onChange={(event) => setNewCompanyId(event.target.value)} required>
              {companies.map((company) => (
                <option key={company.id} value={company.id}>
                  {company.name}
                </option>
              ))}
            </select>
          </label>
          {newUserType === "CLIENT" ? (
            <label>
              Client
              <select name="customerId" required>
                {filteredCustomers.map((customer) => (
                  <option key={customer.id} value={customer.id}>
                    {customer.name} ({customer.email})
                  </option>
                ))}
              </select>
            </label>
          ) : null}

          <div className="form-actions full">
            <button className="btn btn-primary" disabled={pending} type="submit">
              {pending ? "Saving..." : "Create User"}
            </button>
          </div>
          {result ? <span className="muted-text full">{result}</span> : null}
        </form>
      </article>

      <article className="panel section">
        <h2>Users</h2>
        <div className="list">
          {users.map((user) => (
            <div className="row" key={user.id}>
              <div>
                <strong>
                  {user.name} · {user.role}
                </strong>
                <span>
                  {user.email} · {user.userType} · {user.company?.name || "No Company"}
                  {user.customer ? ` · ${user.customer.name}` : ""}
                </span>
              </div>
              <div className="action-row">
                <button className="btn" disabled={pending} onClick={() => toggleUser(user)} type="button">
                  {user.isActive ? "Disable" : "Enable"}
                </button>
                <button className="btn" disabled={pending} onClick={() => toggleRole(user)} type="button">
                  {user.userType === "CLIENT" ? "Set Customer" : user.role === "ADMIN" ? "Set Staff" : "Set Admin"}
                </button>
                <button className="btn" disabled={pending} onClick={() => resetPassword(user)} type="button">
                  Reset Password
                </button>
              </div>
            </div>
          ))}
        </div>
      </article>
    </div>
  );
}
