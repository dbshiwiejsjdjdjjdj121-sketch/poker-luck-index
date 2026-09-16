import { ImageResponse } from "next/og";
import { destinationById, festivalBySlug } from "@/lib/guide-data";
import { dateRange } from "@/lib/guide-utils";

export const revalidate = 3600;

export async function GET(_request: Request, { params }: { params: Promise<{ slug: string }> }) {
  const festival = festivalBySlug((await params).slug);
  if (!festival) return new Response("Guide not found", { status: 404 });
  const destination = destinationById(festival.destinationId);

  // An original editorial title card, not an organizer's poster or a venue photo.
  // Only stable, visible facts are used; no inferred prices or entry availability.
  return new ImageResponse(
    <div style={{ display: "flex", flexDirection: "column", width: "100%", height: "100%", background: "#0a1425", color: "#f5f1e7", padding: "50px 60px", justifyContent: "space-between", borderLeft: "12px solid #dbbd78" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", fontSize: 21, letterSpacing: 3 }}>
        <span style={{ color: "#dbbd78" }}>ALL IN / POKER GUIDE</span>
        <span style={{ color: "#a2b0c4", letterSpacing: 1 }}>FESTIVAL GUIDE</span>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
        <div style={{ display: "flex", fontSize: festival.name.length > 70 ? 43 : festival.name.length > 48 ? 51 : 62, fontWeight: 700, lineHeight: 1.12 }}>{festival.name}</div>
        <div style={{ display: "flex", fontSize: 29, color: "#dbbd78" }}>{destination.city}, {destination.country}</div>
        <div style={{ display: "flex", fontSize: 29 }}>{dateRange(festival.startDate, festival.endDate)}</div>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 12, borderTop: "1px solid #344154", paddingTop: 22 }}>
        <div style={{ display: "flex", fontSize: 22 }}>Key buy-ins · Venue · Travel · Official links</div>
        <div style={{ display: "flex", fontSize: 18, color: "#a2b0c4" }}>Independent guide · allinpokerai.com</div>
      </div>
    </div>,
    { width: 1200, height: 630 },
  );
}
