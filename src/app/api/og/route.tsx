import { ImageResponse } from "next/og";
import { SITE_NAME, SITE_DESCRIPTION, buildAbsoluteUrl } from "@/lib/site";

export const runtime = "edge";

const imageSize = {
  width: 1200,
  height: 630,
};

function readParam(searchParams: URLSearchParams, key: string, fallback: string) {
  return searchParams.get(key)?.trim() || fallback;
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const view = readParam(searchParams, "view", "home");
  const luckScore = readParam(searchParams, "luck_score", "7");
  const scoreLabel = readParam(searchParams, "score_label", "Steady Night");
  const recommendedStyle = readParam(searchParams, "style", "Balanced");
  const coinFlipDecision = readParam(searchParams, "flip", "Call");
  const hands = readParam(searchParams, "hands", "AK 77 QJ");

  const isResult = view === "result";

  return new ImageResponse(
    (
      <div
        style={{
          alignItems: "stretch",
          background:
            "radial-gradient(circle at top left, rgba(123, 27, 46, 0.26), transparent 30%), radial-gradient(circle at top right, rgba(201, 165, 72, 0.18), transparent 34%), linear-gradient(180deg, #071611 0%, #0b2018 48%, #050c09 100%)",
          color: "#f7f1db",
          display: "flex",
          height: "100%",
          padding: "44px",
          width: "100%",
        }}
      >
        <div
          style={{
            background: "rgba(11, 17, 40, 0.82)",
            border: "1px solid rgba(235, 197, 99, 0.22)",
            borderRadius: "32px",
            boxShadow: "0 24px 80px rgba(4, 6, 18, 0.5)",
            display: "flex",
            flex: 1,
            flexDirection: "column",
            justifyContent: "space-between",
            overflow: "hidden",
            padding: "44px",
            position: "relative",
          }}
        >
          <div
            style={{
              color: "#f7dfa0",
              display: "flex",
              fontSize: 24,
              letterSpacing: "0.34em",
              textTransform: "uppercase",
            }}
          >
            {SITE_NAME}
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
            <div
              style={{
                color: "#ffffff",
                display: "flex",
                fontFamily: "serif",
              fontSize: 72,
              lineHeight: 1.05,
              maxWidth: "780px",
            }}
          >
              {isResult
                ? `${scoreLabel}.`
                : "Find your table read before the first hand."}
            </div>

            <div
              style={{
                color: "#aeb2d8",
                display: "flex",
                fontSize: 28,
                lineHeight: 1.4,
                maxWidth: "760px",
              }}
            >
              {isResult
                ? `${recommendedStyle} style. ${coinFlipDecision} the first coin flip. Hands to watch: ${hands}.`
                : SITE_DESCRIPTION}
            </div>
          </div>

          <div
            style={{
              alignItems: "flex-end",
              display: "flex",
              justifyContent: "space-between",
            }}
          >
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: 10,
              }}
            >
              <div
                style={{
                  color: "#f7dfa0",
                  display: "flex",
                  fontSize: 20,
                letterSpacing: "0.28em",
                textTransform: "uppercase",
              }}
            >
                {isResult ? "Luck Index" : "Daily Read"}
              </div>
              <div
                style={{
                  background:
                    "linear-gradient(180deg, #fff7dc 0%, #efcb7a 48%, #c28d2a 100%)",
                  color: "transparent",
                  display: "flex",
                  fontSize: isResult ? 132 : 82,
                  fontWeight: 800,
                  lineHeight: 0.95,
                  WebkitBackgroundClip: "text",
                }}
              >
                {isResult ? `${luckScore}/10` : "♠ ♥ ♦ ♣"}
              </div>
            </div>

            <div
              style={{
                alignItems: "center",
                border: "1px solid rgba(235, 197, 99, 0.22)",
                borderRadius: "24px",
                color: "#f7dfa0",
                display: "flex",
                fontSize: 22,
                gap: 12,
                padding: "18px 24px",
              }}
            >
              <div style={{ display: "flex" }}>{buildAbsoluteUrl("/")}</div>
            </div>
          </div>
        </div>
      </div>
    ),
    imageSize,
  );
}
