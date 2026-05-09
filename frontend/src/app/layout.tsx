import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Bolzano LeadGen",
  description: "Lead generation dashboard for Bolzano businesses",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="bg-gray-50 text-gray-900 antialiased">{children}</body>
    </html>
  );
}
