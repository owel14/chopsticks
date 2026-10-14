import { ImageResponse } from "next/og";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { BACKGROUND_COLOR, SITE_NAME, THEME_COLOR } from "@/lib/seo";

export const alt = "Chopsticks – the hand game, playable free online against an AI or a friend";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

async function handDataUri(value: number): Promise<string> {
  const file = await readFile(join(process.cwd(), "public", "img", `${value}.png`));
  return `data:image/png;base64,${file.toString("base64")}`;
}

export default async function OpengraphImage() {
  const [one, two, three] = await Promise.all([handDataUri(1), handDataUri(2), handDataUri(3)]);

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "0 70px",
          background: BACKGROUND_COLOR,
        }}
      >
        <div style={{ display: "flex", flexDirection: "column", maxWidth: 540 }}>
          <div style={{ fontSize: 112, fontWeight: 700, color: THEME_COLOR, letterSpacing: -3 }}>
            {SITE_NAME}
          </div>
          <div style={{ marginTop: 16, fontSize: 40, color: "#111827", lineHeight: 1.25 }}>
            The classic hand game. Play free vs AI or a friend.
          </div>
          <div
            style={{
              marginTop: 40,
              display: "flex",
              alignSelf: "flex-start",
              padding: "16px 40px",
              borderRadius: 9999,
              background: THEME_COLOR,
              color: "white",
              fontSize: 30,
              fontWeight: 600,
            }}
          >
            Play now
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center" }}>
          <img src={one} width={170} height={170} alt="" style={{ transform: "rotate(-12deg)" }} />
          <img src={two} width={190} height={190} alt="" style={{ marginLeft: -30 }} />
          <img src={three} width={170} height={170} alt="" style={{ marginLeft: -30, transform: "rotate(12deg)" }} />
        </div>
      </div>
    ),
    size
  );
}
