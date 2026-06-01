import type { Metadata } from "next";
import { Rubik } from "next/font/google";
import "./globals.css";

// Rubik supports Hebrew beautifully
const rubik = Rubik({ subsets: ["latin", "hebrew"] });

export const metadata: Metadata = {
  title: "BizManager",
  description: "ניהול עסק קטן - לקוחות, תורים ועוד",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "BizManager",
  },
  icons: { apple: "/icons/apple-touch-icon.png" },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="he" dir="rtl">
      <head>
        <meta name="theme-color" content="#1d4ed8" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="BizManager" />
        <link rel="apple-touch-icon" href="/icons/apple-touch-icon.png" />
      </head>
      <body className={`${rubik.className} antialiased`}>
        {children}
      </body>
    </html>
  );
}
