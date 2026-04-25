import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Apex Intelligence | Virtual F1 Race Engineer",
  description:
    "A motion-first F1 experience for exploring telemetry, pit-window reasoning, and explainable AI race strategy.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
