import type { Metadata, Viewport } from "next";
import { Geist_Mono, Nunito } from "next/font/google";
import { Toaster } from "@/components/ui/toaster";
import "./globals.css";
import "react-toastify/dist/ReactToastify.css";
import "./notifications.css";

const nunito = Nunito({
  variable: "--font-nunito",
  subsets: ["latin"],
  weight: ["400", "500", "700"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL("https://flenvn.app"),
  title: {
    default: "FLENVN",
    template: "%s | FLENVN",
  },
  description:
    "Build English vocabulary with smart flashcards, contextual explanations, focused review, and quick learning games.",
  applicationName: "FLENVN",
  appleWebApp: {
    capable: true,
    title: "FLENVN",
    statusBarStyle: "default",
  },
  icons: {
    apple: "/pwa-icon-192.png",
  },
  keywords: [
    "English vocabulary",
    "flashcards",
    "learn English",
    "vocabulary games",
    "spaced repetition",
    "FLENVN",
  ],
  creator: "FLENVN",
  publisher: "FLENVN",
  openGraph: {
    type: "website",
    siteName: "FLENVN",
    title: "FLENVN",
    description:
      "Build English vocabulary with smart flashcards, contextual explanations, focused review, and quick learning games.",
  },
  twitter: {
    card: "summary",
    title: "FLENVN",
    description:
      "Build English vocabulary with smart flashcards, contextual explanations, focused review, and quick learning games.",
  },
  robots: {
    index: true,
    follow: true,
  },
};

export const viewport: Viewport = {
  themeColor: "#2131dc",
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${nunito.className} ${nunito.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        {children}
        <Toaster />
      </body>
    </html>
  );
}
