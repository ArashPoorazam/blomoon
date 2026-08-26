import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Blomoon",
  description: "Explore live entertainment streams on a focused interactive globe."
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
