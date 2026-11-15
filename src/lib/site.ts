import stationsJson from "../../data/stations.json";

// Tolerates scheme-less ("example.com") and trailing-slash values so a
// misconfigured env var can never produce an invalid absolute URL.
const siteUrl = (
  process.env.NEXT_PUBLIC_SITE_URL || "elanjai-fm.up.railway.app"
).replace(/\/+$/, "");

// Derived from the catalog so marketing copy never drifts from reality.
const liveCount = (stationsJson as { is_active?: boolean }[]).filter(
  (s) => s.is_active !== false
).length;
const stationCount = Math.floor(liveCount / 10) * 10;

// Contact addresses — override per mailbox with env vars before launch.
const contactEmail =
  process.env.NEXT_PUBLIC_CONTACT_EMAIL || "contact@elanjai.media";

export const SITE = {
  name: "Elanjai Media FM",
  shortName: "Elanjai FM",
  stationCount,
  description: `Listen to ${stationCount}+ live Indian radio stations online for free — Tamil, Hindi, Malayalam, Telugu, Kannada, Punjabi and more. No sign-up, no app.`,
  url: /^https?:\/\//i.test(siteUrl) ? siteUrl : `https://${siteUrl}`,
  language: "en",
  email: {
    general: contactEmail,
    stations: process.env.NEXT_PUBLIC_STATIONS_EMAIL || contactEmail,
    dmca: process.env.NEXT_PUBLIC_DMCA_EMAIL || contactEmail,
    grievance: process.env.NEXT_PUBLIC_GRIEVANCE_EMAIL || contactEmail,
  },
} as const;
