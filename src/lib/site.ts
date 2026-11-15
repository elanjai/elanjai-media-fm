// Tolerates scheme-less ("example.com") and trailing-slash values so a
// misconfigured env var can never produce an invalid absolute URL.
const siteUrl = (
  process.env.NEXT_PUBLIC_SITE_URL || "elanjai-fm.up.railway.app"
).replace(/\/+$/, "");

export const SITE = {
  name: "Elanjai Media FM",
  shortName: "Elanjai FM",
  description:
    "Listen to 290+ live Indian radio stations online for free — Tamil, Hindi, Malayalam, Telugu, Kannada, Punjabi and more. No sign-up, no app.",
  url: /^https?:\/\//i.test(siteUrl) ? siteUrl : `https://${siteUrl}`,
  language: "en",
} as const;
