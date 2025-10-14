import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { SessionProvider } from "@/components/SessionProvider";
import NotificationProvider from "@/components/providers/NotificationProvider";
import Footer from "@/components/Footer";
import PWAInstaller from "@/components/PWAInstaller";
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
  title: "Forum des Entreprises - ENSA Tétouan",
  description: "Plateforme de mise en relation étudiants-entreprises pour l'École Nationale des Sciences Appliquées de Tétouan. Découvrez les opportunités de stage, emploi et projets avec les entreprises partenaires.",
  keywords: ["forum entreprises", "ENSA Tétouan", "stages", "emploi", "PFA", "PFE", "étudiants", "entreprises", "recrutement"],
  authors: [{ name: "Association des Étudiants - ENSA Tétouan" }],
  creator: "ADE ENSA Tétouan",
  publisher: "Association des Étudiants - ENSA Tétouan",
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  openGraph: {
    type: "website",
    locale: "fr_FR",
    url: "https://forum-supanova.vercel.app",
    siteName: "Forum des Entreprises - ENSA Tétouan",
    title: "Forum des Entreprises - ENSA Tétouan",
    description: "Plateforme de mise en relation étudiants-entreprises pour l'École Nationale des Sciences Appliquées de Tétouan. Découvrez les opportunités de stage, emploi et projets avec les entreprises partenaires.",
    images: [
      {
        url: "/logos/LOGO ADE (1).png",
        width: 1200,
        height: 630,
        alt: "Logo ADE - ENSA Tétouan",
        type: "image/png",
      },
      {
        url: "/logos/LOGO ADE (1).png",
        width: 800,
        height: 600,
        alt: "Logo ADE - ENSA Tétouan",
        type: "image/png",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    site: "@ade.ensate",
    creator: "@ade.ensate",
    title: "Forum des Entreprises - ENSA Tétouan",
    description: "Plateforme de mise en relation étudiants-entreprises pour l'École Nationale des Sciences Appliquées de Tétouan. Découvrez les opportunités de stage, emploi et projets.",
    images: ["/logos/LOGO ADE (1).png"],
  },
  other: {
    "apple-mobile-web-app-capable": "yes",
    "apple-mobile-web-app-status-bar-style": "default",
    "apple-mobile-web-app-title": "Forum Supanova",
    "application-name": "Forum Supanova - ADE",
    "msapplication-TileColor": "#2880CA",
    "msapplication-config": "/browserconfig.xml",
    "theme-color": "#2880CA",
    "mobile-web-app-capable": "yes",
    "apple-touch-icon": "/icons/icon-192x192.png",
    "apple-touch-icon-precomposed": "/icons/icon-192x192.png",
    "apple-touch-startup-image": "/icons/icon-512x512.png",
  },
  manifest: "/manifest.json",
  verification: {
    google: "your-google-verification-code", // Replace with actual verification code
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fr">
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        <SessionProvider>
          <NotificationProvider>
            {children}
            <Footer />
            <PWAInstaller />
          </NotificationProvider>
        </SessionProvider>
      </body>
    </html>
  );
}
