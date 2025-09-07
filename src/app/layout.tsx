import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "AI Chess - CLB Chess Butler",
  description: "A production-grade chess application with AI-powered commentary by your dignified Chess Butler",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
  },
  other: {
    "mobile-web-app-capable": "yes",
    "apple-mobile-web-app-capable": "yes",
    "apple-mobile-web-app-status-bar-style": "black-translucent",
    "format-detection": "telephone=no",
    // iOS keyboard accessory bar minimization
    "apple-touch-fullscreen": "yes",
    "apple-mobile-web-app-orientations": "portrait-any landscape-any",
    // Disable iOS input assistance features that create tall accessory bars
    "webkit-touch-callout": "no",
    "webkit-user-select": "none",
    "webkit-tap-highlight-color": "transparent",
    // Force minimal Safari UI
    "apple-mobile-web-app-capable": "yes",
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
  // Critical iOS Safari optimizations
  minimumScale: 1,
  interactiveWidget: "resizes-content"
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">
        {children}
      </body>
    </html>
  );
}
