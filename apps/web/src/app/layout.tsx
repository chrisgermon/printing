import type { Metadata } from "next";
import { Manrope, Sora } from "next/font/google";
import React from "react";
import { ToastProvider } from "@/components/ToastProvider";
import "./globals.css";

const manrope = Manrope({
  subsets: ["latin"],
  variable: "--font-body"
});

const sora = Sora({
  subsets: ["latin"],
  variable: "--font-display"
});

export const metadata: Metadata = {
  title: "PrintPress",
  description: "Print management portal"
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={`${manrope.variable} ${sora.variable}`}>
        <ToastProvider>{children}</ToastProvider>
      </body>
    </html>
  );
}
