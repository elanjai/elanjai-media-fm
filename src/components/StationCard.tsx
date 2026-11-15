import Link from "@/components/LangLink";
import type { PublicStation } from "@/lib/types";
import PlayButton from "./PlayButton";
import StationLogo from "./StationLogo";

/** Logo-forward card tile — big art, name+meta, corner play badge (design "card_tile"). */
export default function StationCard({
  station,
  queue,
}: {
  station: PublicStation;
  /** List this card belongs to — passed to the player as the next/prev queue. */
  queue?: PublicStation[];
}) {
  return (
    <div className="group relative rounded-[20px] border border-border bg-surface p-3 transition hover:-translate-y-0.5 hover:border-brand-2/50 hover:shadow-lg hover:shadow-brand/10">
      <Link
        href={`/station/${station.slug}`}
        className="absolute inset-0 z-[5] rounded-[20px]"
        aria-label={station.name}
      />
      <div className="relative">
        <StationLogo
          src={station.favicon}
          fallbackSrc={station.faviconAlt}
          name={station.name}
          size={200}
          className="aspect-square w-full"
        />
        <div className="absolute -bottom-2 -right-1.5 z-10 transition group-hover:scale-110">
          <PlayButton station={station} queue={queue} size={30} />
        </div>
      </div>
      <p className="mt-2.5 truncate text-[13px] font-semibold text-ink">{station.name}</p>
      <p className="mt-0.5 truncate text-xs capitalize text-muted">
        {station.genre} {station.bitrate ? `· ${station.bitrate}k` : ""}
      </p>
    </div>
  );
}
