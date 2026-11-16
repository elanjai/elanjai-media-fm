import { ImageResponse } from "next/og";
import { getCity, getStationBySlug } from "@/lib/data";

/**
 * Per-station Open Graph image — /og/<slug>.png (F-3.4).
 * Text-only card (brand green, station name, city/frequency) so it renders
 * without depending on remote logo availability.
 */
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ file: string }> }
) {
  const { file } = await params;
  const slug = file.replace(/\.png$/, "");
  const s = getStationBySlug(slug);
  const name = s?.name ?? "Elanjai FM";
  const city = s?.city ? getCity(s.city)?.name : null;
  const sub = s
    ? [
        s.languages[0] ? s.languages[0][0].toUpperCase() + s.languages[0].slice(1) : null,
        city,
        s.frequency_mhz ? `${s.frequency_mhz} FM` : null,
      ]
        .filter(Boolean)
        .join(" · ")
    : "India's radio, all in one place";

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "flex-end",
          background: "linear-gradient(135deg, #11543c 0%, #07130c 100%)",
          padding: 64,
          fontFamily: "sans-serif",
        }}
      >
        <div
          style={{
            position: "absolute",
            top: -120,
            right: -120,
            width: 420,
            height: 420,
            borderRadius: 999,
            background: "rgba(253,224,71,0.14)",
          }}
        />
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 14,
            color: "#fde047",
            fontSize: 28,
            fontWeight: 700,
            letterSpacing: 1,
            textTransform: "uppercase",
          }}
        >
          ● Live radio
        </div>
        <div
          style={{
            marginTop: 18,
            color: "white",
            fontSize: 76,
            fontWeight: 800,
            lineHeight: 1.05,
            display: "-webkit-box",
            overflow: "hidden",
          }}
        >
          {name}
        </div>
        <div style={{ marginTop: 18, color: "rgba(255,255,255,0.75)", fontSize: 34 }}>
          {sub}
        </div>
        <div
          style={{
            marginTop: 40,
            display: "flex",
            alignItems: "center",
            gap: 16,
            color: "#fde047",
            fontSize: 32,
            fontWeight: 700,
          }}
        >
          ▶ Listen free on Elanjai FM
        </div>
      </div>
    ),
    { width: 1200, height: 630 }
  );
}
