/**
 * Language helpers for the first-run picker, ordering and voice search.
 * Genre slugs double as language ids in the catalog.
 */

/** Native-script labels shown on the picker chips. */
export const NATIVE_NAMES: Record<string, string> = {
  tamil: "தமிழ்",
  hindi: "हिन्दी",
  telugu: "తెలుగు",
  malayalam: "മലയാളം",
  kannada: "ಕನ್ನಡ",
  punjabi: "ਪੰਜਾਬੀ",
  urdu: "اردو",
  bengali: "বাংলা",
  marathi: "मराठी",
  gujarati: "ગુજરાતી",
  odia: "ଓଡ଼ିଆ",
  assamese: "অসমীয়া",
  bhojpuri: "भोजपुरी",
  konkani: "कोंकणी",
  maithili: "मैथिली",
  rajasthani: "राजस्थानी",
  kashmiri: "कॉशुर",
  sindhi: "سنڌي",
  nepali: "नेपाली",
  sanskrit: "संस्कृतम्",
  tulu: "ತುಳು",
  manipuri: "মৈতৈলোন্",
  english: "English",
  india: "English & more",
};

/** BCP-47 primary subtag → catalog genre slug. */
export const LOCALE_TO_GENRE: Record<string, string> = {
  ta: "tamil",
  hi: "hindi",
  te: "telugu",
  ml: "malayalam",
  kn: "kannada",
  pa: "punjabi",
  ur: "urdu",
  bn: "bengali",
  mr: "marathi",
  gu: "gujarati",
  or: "odia",
  as: "assamese",
  bho: "bhojpuri",
  kok: "konkani",
  mai: "maithili",
  raj: "rajasthani",
  ks: "kashmiri",
  sd: "sindhi",
  ne: "nepali",
  sa: "sanskrit",
  tcy: "tulu",
  mni: "manipuri",
};

/** Web Speech API locale for each language (voice search). */
export const GENRE_TO_SPEECH_LOCALE: Record<string, string> = {
  tamil: "ta-IN",
  hindi: "hi-IN",
  telugu: "te-IN",
  malayalam: "ml-IN",
  kannada: "kn-IN",
  punjabi: "pa-IN",
  urdu: "ur-IN",
  bengali: "bn-IN",
  marathi: "mr-IN",
  gujarati: "gu-IN",
  odia: "or-IN",
  nepali: "ne-NP",
  english: "en-IN",
  india: "en-IN",
};

/** Guess preferred genres from the browser's accepted languages. */
export function langsFromNavigator(nav: {
  languages?: readonly string[];
  language?: string;
}): string[] {
  const out: string[] = [];
  for (const tag of nav.languages ?? (nav.language ? [nav.language] : [])) {
    const slug = LOCALE_TO_GENRE[tag.split("-")[0].toLowerCase()];
    if (slug && !out.includes(slug)) out.push(slug);
  }
  return out;
}

/**
 * Order genre slugs by preference: chosen languages first (in the order the
 * user picked them), everything else keeps its server order.
 */
export function orderByLangs<T extends { slug: string }>(
  items: T[],
  langs: string[]
): T[] {
  if (!langs.length) return items;
  const rank = new Map(langs.map((slug, i) => [slug, i]));
  return [...items].sort(
    (a, b) =>
      (rank.get(a.slug) ?? Number.MAX_SAFE_INTEGER) -
      (rank.get(b.slug) ?? Number.MAX_SAFE_INTEGER)
  );
}
