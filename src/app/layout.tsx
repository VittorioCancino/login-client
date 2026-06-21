import type { Metadata } from "next";

import "./globals.css";

export const metadata: Metadata = {
  title: "CLLS | CE-Lab Login Server",
  description: "Computer Engineering LAB Login Server.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="min-h-dvh bg-[radial-gradient(circle_at_50%_-10%,rgba(56,189,248,0.18),transparent_28rem),linear-gradient(180deg,#020617_0%,#07111f_100%)] text-ce-text antialiased">
        {children}
      </body>
    </html>
  );
}
