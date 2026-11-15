import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import FavoriteButton from "@/components/FavoriteButton";
import Icon from "@/components/Icon";
import LiveBadge from "@/components/LiveBadge";
import NowPlayingCard from "@/components/NowPlayingCard";
import PlayButton from "@/components/PlayButton";
import ReportButton from "@/components/ReportButton";
import ShareButton from "@/components/ShareButton";
import StationCard from "@/components/StationCard";
import StationLogo from "@/components/StationLogo";
import {
  describeStation,
  getCity,
  getNetwork,
  getRelated,
  getStationBySlug,
  getStations,
  getStationsByNetwork,
  toPublic,
} from "@/lib/data";
import { breadcrumbJsonLd, faqJsonLd, radioStationJsonLd } from "@/lib/jsonld";
import { SITE } from "@/lib/site";
import type { Station } from "@/lib/types";

type Props = { params: Promise<{ slug: string }> };

export function generateStaticParams() {
  return getStations().map((s) => ({ slug: s.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const s = getStationBySlug(slug);
  if (!s) return { title: "Station not found" };
  const title = `${s.name} — Listen Live Free`;
  const description = describeStation(s);
  return {
    title,
    description,
    alternates: { canonical: `${SITE.url}/station/${s.slug}` },
    openGraph: { title, description, url: `${SITE.url}/station/${s.slug}` },
  };
}

/** FAQ block shared by the visible section and FAQPage JSON-LD. */
function stationFaqs(s: Station): { q: string; a: string }[] {
  const lang = s.languages
    .map((l) => l[0].toUpperCase() + l.slice(1))
    .join(" and ");
  const faqs: { q: string; a: string }[] = [
    {
      q: `How do I listen to ${s.name} online?`,
      a: `Press the play button on this page — ${s.name} streams live 24/7 on ${SITE.name}, free and with no sign-up.`,
    },
  ];
  if (s.frequency_mhz) {
    faqs.push({
      q: `What frequency is ${s.name} on?`,
      a: `${s.name} broadcasts on ${s.frequency_mhz} FM in ${s.city ? getCity(s.city)?.name ?? s.city : "its home market"}. Outside the broadcast area, stream it live here from anywhere.`,
    });
  }
  faqs.push(
    {
      q: `Is ${s.name} free to listen to?`,
      a: `Yes — listening is free on ${SITE.name}. ${s.name} is a ${lang} radio station${s.network ? ` on the ${getNetwork(s.network)?.name ?? s.network} network` : ""}, streaming around the clock.`,
    },
    {
      q: `Can I listen on my phone or tablet?`,
      a: `Yes. ${SITE.name} works in any modern browser on phones, tablets and computers — no app install needed. Add this page to your home screen for one-tap access.`,
    }
  );
  return faqs;
}

export default async function StationPage({ params }: Props) {
  const { slug } = await params;
  const s = getStationBySlug(slug);
  if (!s) notFound();

  const pub = toPublic(s);
  const related = getRelated(s).map(toPublic);
  const lang = s.languages[0] ?? "india";
  const primary = s.streams[0];
  const genreCount = getStations().filter((x) => x.languages.includes(lang)).length;
  const city = s.city ? getCity(s.city) : null;
  const network = s.network ? getNetwork(s.network) : null;
  const networkStations = s.network ? getStationsByNetwork(s.network) : [];
  const faqs = stationFaqs(s);
  const description = describeStation(s);

  return (
    <div className="py-5">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(radioStationJsonLd(s)) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd(faqs)) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(
            breadcrumbJsonLd([
              { name: "Home", url: SITE.url },
              { name: lang, url: `${SITE.url}/genre/${lang}` },
              { name: s.name, url: `${SITE.url}/station/${s.slug}` },
            ])
          ),
        }}
      />

      {/* Header — back to genre + share */}
      <div className="flex items-center gap-3">
        <Link
          href={`/genre/${lang}`}
          aria-label={`Back to ${lang} stations`}
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-border bg-surface text-ink transition hover:border-brand-2/50"
        >
          <Icon name="chevL" size={16} />
        </Link>
        <nav aria-label="Breadcrumb" className="min-w-0 flex-1 truncate text-xs text-muted">
          <Link href="/" className="hover:text-ink">Home</Link>
          <span className="mx-1.5">/</span>
          <Link href={`/genre/${lang}`} className="capitalize hover:text-ink">
            {lang}
          </Link>
        </nav>
        <ShareButton slug={s.slug} name={s.name} />
      </div>

      {/* Hero card — deep green, big art, live chip, tags */}
      <section className="relative mt-4 overflow-hidden rounded-[26px] bg-gradient-to-br from-[#11543c] to-brand p-5 text-brand-ink shadow-lg shadow-brand/20">
        <div
          aria-hidden
          className="pointer-events-none absolute -right-10 -top-10 h-44 w-44 rounded-full bg-accent/15"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute -bottom-20 -left-16 h-44 w-44 rounded-full bg-white/5"
        />
        <div className="relative md:flex md:items-center md:gap-6">
          <div className="flex items-start justify-between gap-3">
            <StationLogo
              src={pub.favicon}
              fallbackSrc={pub.faviconAlt}
              name={s.name}
              size={84}
              className="h-[84px] w-[84px] shrink-0 md:h-[120px] md:w-[120px]"
            />
            <LiveBadge />
          </div>
          <div className="min-w-0">
            <h1 className="mt-4 font-display text-2xl font-semibold tracking-tight md:mt-0 md:text-3xl">
              {s.name}
              {s.name_native && (
                <span className="mt-1 block text-lg font-normal text-brand-ink/80">
                  {s.name_native}
                </span>
              )}
            </h1>
            <p className="mt-1 text-xs text-brand-ink/75">
              {pub.language} · {s.country}
              {primary?.bitrate
                ? ` · ${primary.bitrate} kbps ${primary.codec} · ≈ ${Math.round(primary.bitrate * 0.45)} MB/hr`
                : ""}
            </p>
            {s.tags.length > 0 && (
              <div className="mt-3.5 flex flex-wrap gap-2">
                {s.tags.slice(0, 4).map((t) => (
                  <span
                    key={t}
                    className="rounded-full bg-white/10 px-2.5 py-1 text-xs font-medium text-brand-ink/85"
                  >
                    {t}
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Metadata chips — city / frequency / network / category */}
      {(city || s.frequency_mhz || network || s.categories.length > 0) && (
        <div className="mt-4 flex flex-wrap gap-2">
          {city && (
            <Link
              href={`/city/${city.slug}`}
              className="hit flex items-center gap-1.5 rounded-full border border-border bg-surface px-3 text-xs font-semibold text-ink transition hover:border-brand-2/50"
            >
              <Icon name="home" size={13} />
              {city.name}
            </Link>
          )}
          {network && (
            <Link
              href={`/network/${network.slug}`}
              className="hit flex items-center gap-1.5 rounded-full border border-border bg-surface px-3 text-xs font-semibold text-ink transition hover:border-brand-2/50"
            >
              <Icon name="radio" size={13} />
              {network.name}
            </Link>
          )}
          {s.frequency_mhz && (
            <span className="flex items-center gap-1.5 rounded-full border border-border bg-surface px-3 py-2.5 text-xs font-semibold text-ink">
              <Icon name="signal" size={13} />
              {s.frequency_mhz} FM
            </span>
          )}
          {s.categories.slice(0, 3).map((c) => (
            <Link
              key={c}
              href={`/category/${c}`}
              className="hit flex items-center rounded-full border border-border bg-surface px-3 text-xs font-semibold capitalize text-ink transition hover:border-brand-2/50"
            >
              {c}
            </Link>
          ))}
        </div>
      )}

      {/* CTA row — play FAB + heart + homepage */}
      <div className="mt-5 flex items-center gap-4">
        <PlayButton station={pub} queue={related.length ? related : [pub]} size={56} />
        <div className="min-w-0 flex-1">
          <p className="text-[13px] font-semibold text-ink">Tap to listen live</p>
          <p className="mt-0.5 text-xs text-muted">Free · no sign-up</p>
        </div>
        <FavoriteButton station={pub} size={44} />
        {s.homepage && (
          <a
            href={s.homepage}
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Official site"
            title="Official site"
            className="flex h-11 w-11 items-center justify-center rounded-full border border-border bg-surface text-muted transition hover:text-ink"
          >
            <Icon name="globe" size={20} strokeWidth={1.7} />
          </a>
        )}
      </div>

      <div className="mt-5">
        <NowPlayingCard station={pub} />
      </div>

      {/* About — unique per-station copy (F-2.7) */}
      <section aria-labelledby="about" className="mt-8">
        <h2 id="about" className="font-display text-[16.5px] font-semibold text-ink">
          About {s.name}
        </h2>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted">
          {description}
        </p>
      </section>

      {/* Stream options — every catalog variant */}
      {s.streams.length > 0 && (
        <section aria-labelledby="streams" className="mt-8">
          <h2 id="streams" className="font-display text-[16.5px] font-semibold text-ink">
            Stream quality
          </h2>
          <p className="mt-1 text-xs text-muted">
            The player picks the best stream for your connection and falls back automatically.
          </p>
          <ul className="mt-3 space-y-2">
            {s.streams.map((st, i) => (
              <li
                key={st.url}
                className="flex items-center gap-3 rounded-[14px] border border-border bg-surface px-4 py-3 text-[13px]"
              >
                <span className="font-semibold text-ink">
                  {st.bitrate > 0 ? `${st.bitrate} kbps` : "Adaptive"}
                </span>
                <span className="text-muted uppercase">{st.codec}</span>
                {st.hls && (
                  <span className="rounded-full bg-brand-2/10 px-2 py-0.5 text-[11px] font-semibold text-brand-2 dark:text-accent">
                    HLS
                  </span>
                )}
                {i === 0 && (
                  <span className="ml-auto rounded-full bg-accent/15 px-2 py-0.5 text-[11px] font-semibold text-brand-2 dark:text-accent">
                    Default
                  </span>
                )}
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* FAQ — visible + FAQPage JSON-LD */}
      <section aria-labelledby="faq" className="mt-8">
        <h2 id="faq" className="font-display text-[16.5px] font-semibold text-ink">
          Frequently asked questions
        </h2>
        <div className="mt-3 space-y-2">
          {faqs.map((f) => (
            <details
              key={f.q}
              className="group rounded-[14px] border border-border bg-surface px-4 py-3 open:pb-3.5"
            >
              <summary className="flex cursor-pointer list-none items-center justify-between gap-3 text-[13px] font-semibold text-ink marker:hidden">
                {f.q}
                <Icon
                  name="chevD"
                  size={14}
                  className="shrink-0 text-muted transition group-open:rotate-180"
                />
              </summary>
              <p className="mt-2 text-[13px] leading-relaxed text-muted">{f.a}</p>
            </details>
          ))}
        </div>
      </section>

      {/* More from this network */}
      {network && networkStations.length > 1 && (
        <section aria-labelledby="network-more" className="mt-8">
          <div className="mb-3 flex items-baseline justify-between">
            <h2 id="network-more" className="font-display text-[16.5px] font-semibold text-ink">
              More from {network.name}
            </h2>
            <Link
              href={`/network/${network.slug}`}
              className="text-xs font-semibold text-brand-2 dark:text-accent"
            >
              All {networkStations.length} →
            </Link>
          </div>
          <div className="rail -mx-4 flex gap-3 overflow-x-auto px-4 pb-1 lg:mx-0 lg:grid lg:grid-cols-6 lg:overflow-visible lg:px-0">
            {networkStations
              .filter((x) => x.slug !== s.slug)
              .slice(0, 6)
              .map((x) => {
                const p = toPublic(x);
                return (
                  <div key={x.id} className="w-[130px] shrink-0 lg:w-auto">
                    <StationCard station={p} queue={networkStations.map(toPublic)} />
                  </div>
                );
              })}
          </div>
        </section>
      )}

      {related.length > 0 && (
        <section aria-labelledby="related" className="mt-8">
          <div className="mb-3 flex items-baseline justify-between">
            <h2 id="related" className="font-display text-[16.5px] font-semibold text-ink">
              {city ? `More ${city.name} & ${lang} stations` : `More ${lang} stations`}
            </h2>
            <Link
              href={`/genre/${lang}`}
              className="text-xs font-semibold text-brand-2 dark:text-accent"
            >
              All {genreCount} →
            </Link>
          </div>
          <div className="rail -mx-4 flex gap-3 overflow-x-auto px-4 pb-1 lg:mx-0 lg:grid lg:grid-cols-6 lg:overflow-visible lg:px-0">
            {related.map((r) => (
              <div key={r.id} className="w-[130px] shrink-0 lg:w-auto">
                <StationCard station={r} queue={related} />
              </div>
            ))}
          </div>
        </section>
      )}

      <div className="mt-8 flex justify-center border-t border-border pt-5">
        <ReportButton slug={s.slug} />
      </div>
    </div>
  );
}
