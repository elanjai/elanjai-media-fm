import { SITE } from "./site";
import type { Station } from "./types";

export function radioStationJsonLd(s: Station) {
  return {
    "@context": "https://schema.org",
    "@type": "RadioStation",
    "@id": `${SITE.url}/station/${s.slug}#station`,
    mainEntityOfPage: `${SITE.url}/station/${s.slug}`,
    url: `${SITE.url}/station/${s.slug}`,
    name: s.name,
    description:
      s.description ??
      `Listen to ${s.name} live online — free ${s.languages.join(", ")} radio streaming 24/7 on ${SITE.name}.`,
    genre: [...s.languages, ...s.categories],
    image: s.favicon || `${SITE.url}/icon.svg`,
    areaServed: s.country || "India",
    inLanguage: s.languages,
    potentialAction: {
      "@type": "ListenAction",
      target: `${SITE.url}/station/${s.slug}`,
    },
    ...(s.homepage ? { sameAs: [s.homepage] } : {}),
  };
}

export function breadcrumbJsonLd(
  items: { name: string; url: string }[]
) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((it, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: it.name,
      item: it.url,
    })),
  };
}

export function faqJsonLd(faqs: { q: string; a: string }[]) {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqs.map((f) => ({
      "@type": "Question",
      name: f.q,
      acceptedAnswer: { "@type": "Answer", text: f.a },
    })),
  };
}

export function websiteJsonLd() {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: SITE.name,
    url: SITE.url,
    potentialAction: {
      "@type": "SearchAction",
      target: `${SITE.url}/search?q={search_term_string}`,
      "query-input": "required name=search_term_string",
    },
  };
}
