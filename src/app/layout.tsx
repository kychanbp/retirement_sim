import type { Metadata } from "next";
import { ClientProviders } from "../components/ClientProviders";
import "./globals.css";

export const metadata: Metadata = {
  title: "Household Retirement Simulator",
  description:
    "Monte Carlo simulation for household financial planning",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">
        <ClientProviders>{children}</ClientProviders>
      </body>
    </html>
  );
}
