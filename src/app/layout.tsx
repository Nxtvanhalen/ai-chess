import type { Metadata, Viewport } from "next";
import "./globals.css";
import ServiceWorkerRegistration from "@/components/ServiceWorkerRegistration";

export const metadata: Metadata = {
  metadataBase: new URL(
    process.env.NODE_ENV === 'production'
      ? 'https://chess.chrisbergstrom.com'
      : 'http://localhost:3000'
  ),
  title: "Chester AI Chess",
  description: "Play chess with Chester, your witty AI companion",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Chester AI Chess",
  },
  openGraph: {
    title: "Chester AI Chess",
    description: "Play chess with Chester, your witty AI companion",
    url: "https://chess.chrisbergstrom.com",
    siteName: "Chester AI Chess",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "Chester AI Chess - Your intelligent chess companion",
      },
    ],
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Chester AI Chess",
    description: "Play chess with Chester, your witty AI companion",
    images: ["/og-image.png"],
  },
  icons: {
    icon: [
      { url: "/icons/icon-16x16.png", sizes: "16x16", type: "image/png" },
      { url: "/icons/icon-32x32.png", sizes: "32x32", type: "image/png" },
      { url: "/icons/icon-192x192.png", sizes: "192x192", type: "image/png" },
    ],
    apple: [
      { url: "/icons/apple-icon-180x180.png", sizes: "180x180", type: "image/png" },
    ],
  },
  other: {
    "mobile-web-app-capable": "yes",
    "apple-mobile-web-app-capable": "yes",
    "apple-mobile-web-app-status-bar-style": "black-translucent",
    "format-detection": "telephone=no",
    "HandheldFriendly": "True",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
  themeColor: "#1a0d2e",
  minimumScale: 1,
  // Note: interactive-widget removed to fix Render deployment warnings
  // CSS-based keyboard handling works universally across all platforms
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">
        <ServiceWorkerRegistration />
        {children}
      </body>
    </html>
  );
}
