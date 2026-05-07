import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Echoes of Lumora",
  description: "Un mundo onírico compartido donde cada giro construye algo mayor. Juego social de colección y fantasía.",
  keywords: ["Echoes of Lumora", "slot game", "idle game", "collection", "fantasy", "social game"],
  authors: [{ name: "Lumora Studios" }],
  manifest: "/manifest.json",
  icons: {
    icon: "/icons/icon-192.png",
    apple: "/icons/icon-512.png",
  },
  openGraph: {
    title: "Echoes of Lumora",
    description: "Un mundo onírico compartido donde cada giro construye algo mayor",
    type: "website",
  },
};

export const viewport: Viewport = {
  themeColor: "#1a0a2e",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return children;
}
