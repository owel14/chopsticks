import type { MetadataRoute } from "next";
import {
  BACKGROUND_COLOR,
  SITE_DESCRIPTION,
  SITE_NAME,
  THEME_COLOR,
} from "@/lib/seo";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Chopsticks – the hand game",
    short_name: SITE_NAME,
    description: SITE_DESCRIPTION,
    start_url: "/",
    display: "standalone",
    background_color: BACKGROUND_COLOR,
    theme_color: THEME_COLOR,
    categories: ["games"],
    icons: [
      { src: "/icon.png", sizes: "512x512", type: "image/png" },
      { src: "/apple-icon.png", sizes: "180x180", type: "image/png" },
    ],
  };
}
