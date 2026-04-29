import type { Metadata } from "next";
import "./globals.css";

const siteTitle = "Apex Intelligence | Virtual F1 Race Engineer";
const siteDescription =
  "Mission-control UX for telemetry analysis, pit-window reasoning, and explainable Formula 1 strategy signals.";

export const metadata: Metadata = {
  metadataBase: new URL("https://apex-intelligence.local"),
  title: {
    default: siteTitle,
    template: "%s | Apex Intelligence",
  },
  description: siteDescription,
  applicationName: "Apex Intelligence",
  keywords: [
    "Formula 1",
    "F1 telemetry",
    "race engineer",
    "agentic AI",
    "motorsport strategy",
    "mission control",
  ],
  icons: {
    icon: [
      { url: "/favicon.ico" },
      { url: "/icon.png", type: "image/png", sizes: "256x256" },
    ],
    apple: [{ url: "/apple-icon.png", sizes: "256x256", type: "image/png" }],
    shortcut: ["/favicon.ico"],
  },
  manifest: "/manifest.webmanifest",
  openGraph: {
    title: siteTitle,
    description: siteDescription,
    siteName: "Apex Intelligence",
    type: "website",
  },
  twitter: {
    card: "summary",
    title: siteTitle,
    description: siteDescription,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full flex flex-col" suppressHydrationWarning>
        {children}
      </body>
    </html>
  );
}
