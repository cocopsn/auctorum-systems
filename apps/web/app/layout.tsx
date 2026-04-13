import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL("https://auctorum.com.mx"),
  title: "Auctorum — Software de Gestión Inteligente",
  description:
    "Plataformas inteligentes con IA para automatizar operaciones, conectar con clientes, y escalar tu empresa.",
  keywords: [
    "concierge médico",
    "gestión consultorio",
    "citas médicas",
    "WhatsApp médico",
    "facturación CFDI",
    "Auctorum",
    "SaaS médico",
  ],
  authors: [{ name: "Armando Flores" }],
  icons: {
    icon: [
      { url: "/favicon-32.png", sizes: "32x32", type: "image/png" },
      { url: "/logo.png", sizes: "512x512", type: "image/png" },
    ],
    apple: "/apple-touch-icon.png",
  },
  themeColor: "#020617",
  openGraph: {
    title: "Auctorum — Software de Gestión Inteligente",
    description:
      "Plataformas inteligentes con IA para automatizar tu negocio.",
    url: "https://auctorum.com.mx",
    siteName: "Auctorum Systems",
    locale: "es_MX",
    type: "website",
    images: [
      { url: "/logo.png", width: 512, height: 512, alt: "Auctorum Systems" },
    ],
  },
};

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
      </head>
      <body className="antialiased font-sans">{children}</body>
    </html>
  );
}
