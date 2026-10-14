import type { Metadata } from "next";
import HomeGame from "@/components/HomeGame";
import GameInfo from "@/components/seo/GameInfo";
import JsonLd from "@/components/seo/JsonLd";
import { SITE_DESCRIPTION, SITE_NAME, SITE_TITLE, SITE_URL } from "@/lib/seo";

export const metadata: Metadata = {
  alternates: { canonical: "/" },
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true, "max-image-preview": "large", "max-snippet": -1 },
  },
  openGraph: {
    type: "website",
    siteName: SITE_NAME,
    locale: "en_US",
    url: "/",
    title: SITE_TITLE,
    description: SITE_DESCRIPTION,
  },
};

const structuredData = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "WebSite",
      "@id": `${SITE_URL}/#website`,
      url: `${SITE_URL}/`,
      name: SITE_NAME,
      description: SITE_DESCRIPTION,
      inLanguage: "en",
    },
    {
      "@type": "WebApplication",
      "@id": `${SITE_URL}/#app`,
      url: `${SITE_URL}/`,
      name: "Chopsticks",
      alternateName: "Chopsticks hand game",
      description: SITE_DESCRIPTION,
      applicationCategory: "GameApplication",
      genre: "Strategy",
      operatingSystem: "Any (web browser)",
      browserRequirements: "Requires a modern browser with JavaScript enabled",
      inLanguage: "en",
      isAccessibleForFree: true,
      numberOfPlayers: { "@type": "QuantitativeValue", minValue: 1, maxValue: 2 },
      offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
      isPartOf: { "@id": `${SITE_URL}/#website` },
    },
  ],
};

export default function Home() {
  return (
    <main>
      <h1 className="sr-only">Chopsticks – the hand game, free to play online</h1>
      <HomeGame />
      <GameInfo />
      <JsonLd data={structuredData} />
    </main>
  );
}
