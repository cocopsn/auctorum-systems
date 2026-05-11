import type { Metadata, Viewport } from "next";
import "./globals.css";
import { CookieConsent } from "@/components/CookieConsent";

export const metadata: Metadata = {
  title: "Concierge AI Médico — Auctorum Systems",
  description: "Portal de gestión de consultorio médico con IA",
  applicationName: "Auctorum Med",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Auctorum Med",
  },
  formatDetection: { telephone: false },
  manifest: "/manifest.json",
  icons: {
    icon: [
      { url: "/favicon-32.png", sizes: "32x32", type: "image/png" },
      { url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [
      { url: "/apple-touch-icon.png", sizes: "180x180" },
      { url: "/icons/icon-152.png", sizes: "152x152" },
      { url: "/icons/icon-192.png", sizes: "192x192" },
    ],
  },
};

export const viewport: Viewport = {
  themeColor: "#0891B2",
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  viewportFit: "cover",
};

const SW_REGISTER = `
if ('serviceWorker' in navigator) {
  window.addEventListener('load', function () {
    navigator.serviceWorker.register('/sw.js', { scope: '/' }).catch(function () {});
  });
}
`;

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin="anonymous"
        />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&family=JetBrains+Mono:wght@400;500;600&display=swap"
          rel="stylesheet"
        />
        {/* iOS PWA hints (Apple still doesn't honour the manifest fully) */}
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="Auctorum Med" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="msapplication-TileColor" content="#0891B2" />
        <meta name="msapplication-tap-highlight" content="no" />
      </head>
      <body className="font-sora antialiased">
        {children}
        {/*
          Cookie banner mounts globally. The component checks the
          authenticated-route paths internally — currently it renders
          everywhere; we accept the duplicate "you're already in" feel
          inside the dashboard because the dismiss persists in
          localStorage forever per browser. Move into a route-group
          if the dashboard noise gets complaints.
        */}
        <CookieConsent />
        <script dangerouslySetInnerHTML={{ __html: SW_REGISTER }} />
      </body>
    </html>
  );
}
