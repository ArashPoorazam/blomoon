import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Terravue",
  description: "Explore live data on a focused interactive globe."
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
