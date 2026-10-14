import type { Metadata } from "next";
import { notFound } from "next/navigation";
import OnlineGamePage from "@/components/online/OnlineGamePage";
import { isRoomCode } from "@/lib/online/roomCode";
import { SITE_NAME } from "@/lib/seo";

const INVITE_TITLE = "Join my Chopsticks game";
const SHARE_IMAGE = {
  url: "/opengraph-image",
  width: 1200,
  height: 630,
  alt: "Chopsticks – the hand game",
};
const INVITE_DESCRIPTION =
  "You've been invited to a live game of Chopsticks. Open the link, enter your name and play.";

// Rooms are private, short-lived pages: keep them out of search results, but
// give shared links a friendly social preview.
export const metadata: Metadata = {
  title: "Online game",
  robots: { index: false, follow: false },
  openGraph: {
    type: "website",
    siteName: SITE_NAME,
    title: INVITE_TITLE,
    description: INVITE_DESCRIPTION,
    images: [SHARE_IMAGE],
  },
  twitter: {
    card: "summary_large_image",
    title: INVITE_TITLE,
    description: INVITE_DESCRIPTION,
    images: [SHARE_IMAGE],
  },
};

export default async function OnlineRoomRoute({
  params,
}: {
  params: Promise<{ roomCode: string }>;
}) {
  const { roomCode } = await params;

  // This dynamic segment sits at the site root, so it also receives every
  // unknown URL. Return a real 404 for anything that isn't a room code instead
  // of a 200 "soft 404" that search engines would treat as a valid page.
  if (roomCode !== "create" && !isRoomCode(roomCode)) notFound();

  return <OnlineGamePage roomCode={roomCode} />;
}
