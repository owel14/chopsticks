export const SITE_NAME = "Chopsticks";

/** Canonical origin of the deployed frontend. Override with NEXT_PUBLIC_SITE_URL (e.g. for a custom domain). */
export const SITE_URL = (
  process.env.NEXT_PUBLIC_SITE_URL || "https://chopsticks-online.vercel.app"
).replace(/\/$/, "");

export const SITE_TITLE = "Chopsticks Game – Play Free Online vs AI or Friends";

export const SITE_DESCRIPTION =
  "Play the Chopsticks hand game free in your browser. Beat an AI on easy, medium or hard, or send a room code to a friend for a live match. No sign-up needed.";

export const THEME_COLOR = "#6366f1";
export const BACKGROUND_COLOR = "#f8f7ff";
