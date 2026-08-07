import type { Metadata } from "next";
import { Geist, Geist_Mono, JetBrains_Mono, Poppins } from "next/font/google";
import { Toaster } from "../components/ui/sonner";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

// Poppins and JetBrains Mono used to arrive via a Google Fonts @import inside
// styled-jsx. Self-hosting them through next/font keeps the woff2 files
// same-origin, which is what lets the dashboard PNG export inline them —
// cross-origin font fetches are the usual reason an exported image renders in
// a fallback face.
const poppins = Poppins({
  variable: "--font-poppins",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-jetbrains",
  subsets: ["latin"],
  display: "swap",
});

const APP_NAME = "HFSE Internal Tools";
const APP_DESCRIPTION =
  "A centralized suite of internal tools for HFSE recruiters and staff, including link generators, workflow utilities, and productivity features.";

export const metadata: Metadata = {
  title: {
    default: APP_NAME,
    template: `%s | ${APP_NAME}`,
  },
  description: APP_DESCRIPTION,
  keywords: [
    "HFSE",
    "Internal Tools",
    "Recruiter Tools",
    "Workflow Automation",
    "URL Generator",
    "Productivity",
    "Next.js",
    "Web App",
  ],
  authors: [{ name: "HFSE Development Team", url: "https://hfse.edu.sg" }],
  creator: "HFSE Development Team",
  publisher: "HFSE International School",
  metadataBase: new URL("https://hfse.edu.sg"), // Replace with production URL if different
  openGraph: {
    title: APP_NAME,
    description: APP_DESCRIPTION,
    url: "https://hfse.edu.sg",
    siteName: APP_NAME,
    images: [
      {
        url: "/opengraph-image.jpg",
        width: 1200,
        height: 630,
        alt: "HFSE Internal Tools Platform",
      },
    ],
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: APP_NAME,
    description: APP_DESCRIPTION,
    images: ["/twitter-image.jpg"],
  },
  icons: {
    icon: "/favicon.png",
  },
  manifest: "/site.webmanifest",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} ${poppins.variable} ${jetbrainsMono.variable} antialiased`}>
        {children}
        <Toaster richColors position="top-right" />
      </body>
    </html>
  );
}
