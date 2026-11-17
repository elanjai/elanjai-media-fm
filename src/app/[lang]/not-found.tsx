import Link from "@/components/LangLink";
import { getDictionary } from "@/i18n";

export default async function NotFound() {
  const dict = await getDictionary();
  return (
    <div className="py-24 text-center">
      <p className="text-6xl font-black text-border">404</p>
      <h1 className="mt-2 text-xl font-bold text-ink">{dict.notFound.title}</h1>
      <p className="mt-2 text-muted">{dict.notFound.body}</p>
      <Link
        href="/"
        className="mt-6 inline-block rounded-full bg-accent px-6 py-2 font-semibold text-accent-ink shadow-md transition hover:brightness-105"
      >
        {dict.notFound.back}
      </Link>
    </div>
  );
}
