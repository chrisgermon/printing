import "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      role: "CUSTOMER" | "STAFF" | "ADMIN";
      userType: "INTERNAL" | "CLIENT";
      companyId?: string | null;
      customerId?: string | null;
      name?: string | null;
      email?: string | null;
    };
  }

  interface User {
    role: "CUSTOMER" | "STAFF" | "ADMIN";
    userType: "INTERNAL" | "CLIENT";
    companyId?: string | null;
    customerId?: string | null;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    uid?: string;
    role?: "CUSTOMER" | "STAFF" | "ADMIN";
    userType?: "INTERNAL" | "CLIENT";
    companyId?: string | null;
    customerId?: string | null;
  }
}
