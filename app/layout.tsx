import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import Image from "next/image";
import "./globals.css";
import {
  SITE_DESCRIPTION,
  SITE_NAME,
  SITE_TITLE,
  SITE_URL,
  THEME_COLOR,
} from "@/lib/seo";

const inter = Inter({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-inter",
});

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: SITE_TITLE,
    template: `%s | ${SITE_NAME}`,
  },
  description: SITE_DESCRIPTION,
  applicationName: SITE_NAME,
  category: "games",
  openGraph: {
    type: "website",
    siteName: SITE_NAME,
    locale: "en_US",
    title: SITE_TITLE,
    description: SITE_DESCRIPTION,
  },
  twitter: {
    card: "summary_large_image",
    title: SITE_TITLE,
    description: SITE_DESCRIPTION,
  },
};

export const viewport: Viewport = {
  themeColor: THEME_COLOR,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={inter.variable}>
      <body>
        {children}
        {/*
          Warms the browser cache with the exact optimized variants <Hand> renders
          (same src/width/height => same /_next/image URLs), so a hand never flickers
          when its finger count changes. Replaces hard-coded <link rel="preload"> tags
          that fetched the full-size PNGs, which next/image never actually requests.
        */}
        <div hidden aria-hidden="true">
          {[0, 1, 2, 3, 4].map((n) => (
            <Image
              key={n}
              src={`/img/${n}.png`}
              alt=""
              width={80}
              height={80}
              loading="eager"
              fetchPriority="low"
            />
          ))}
        </div>
      </body>
    </html>
  );
}
