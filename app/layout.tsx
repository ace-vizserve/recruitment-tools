import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: "MRF Links Generator - HFSE",
    template: "%s | MRF Links Generator - HFSE",
  },
  description: "A minimal web app for HFSE recruiters to instantly generate and manage GEG, Indeed, and MyCareers job application links, replicating the functionality of the generate_mrf_links.sh script with a browser-based form and local history.",
  keywords: [
    "HFSE",
    "MRF Links",
    "Job Application Links",
    "URL Generator",
    "Recruiter Tools",
    "Next.js",
    "Web App",
    "GEG",
    "Indeed",
    "MyCareers",
  ],
  authors: [{ name: "HFSE Internal", url: "https://hfse.edu.sg" }],
  creator: "HFSE Development Team",
  publisher: "HFSE International School",
  metadataBase: new URL("https://hfse.edu.sg"), // Replace with actual deployment URL
  openGraph: {
    title: "MRF Links Generator - HFSE",
    description: "Instantly generate and manage job application links for HFSE GEG, Indeed, and MyCareers.",
    url: "https://hfse.edu.sg", // Replace with actual deployment URL
    siteName: "MRF Links Generator",
    images: [
      {
        url: "/opengraph-image.jpg", // Relative to metadataBase
        width: 1200,
        height: 630,
        alt: "MRF Links Generator for HFSE",
      },
    ],
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "MRF Links Generator - HFSE",
    description: "Instantly generate and manage job application links for HFSE GEG, Indeed, and MyCareers.",
    images: ["/twitter-image.jpg"], // Relative to metadataBase
    creator: "@HFSEOfficial", // Replace with actual Twitter handle if exists
  },
  // Optional: Favicons and other icons
  icons: {
    icon: "/geg logo.png",
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
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
