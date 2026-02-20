import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { compare } from "bcryptjs";
import { prisma } from "@/lib/db";

export const { handlers, auth, signIn, signOut } = NextAuth({
  session: { strategy: "jwt" },
  providers: [
    Credentials({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" }
      },
      async authorize(credentials) {
        const email = String(credentials?.email || "").toLowerCase().trim();
        const password = String(credentials?.password || "");

        if (!email || !password) {
          return null;
        }

        const user = await prisma.userAccount.findUnique({ where: { email } });
        if (!user || !user.isActive) {
          return null;
        }

        const isValidPassword = await compare(password, user.passwordHash);
        if (!isValidPassword) {
          return null;
        }

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          userType: user.userType,
          companyId: user.companyId,
          customerId: user.customerId
        };
      }
    })
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.role = (user as { role?: string }).role ?? "CUSTOMER";
        token.userType = (user as { userType?: string }).userType === "INTERNAL" ? "INTERNAL" : "CLIENT";
        token.companyId = (user as { companyId?: string | null }).companyId ?? null;
        token.customerId = (user as { customerId?: string | null }).customerId ?? null;
        token.uid = user.id;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = String(token.uid || "");
        session.user.role = String(token.role || "CUSTOMER") as "CUSTOMER" | "STAFF" | "ADMIN";
        session.user.userType = String(token.userType || "CLIENT") as "INTERNAL" | "CLIENT";
        session.user.companyId = token.companyId ?? null;
        session.user.customerId = token.customerId ?? null;
      }
      return session;
    }
  },
  pages: {
    signIn: "/login"
  }
});
