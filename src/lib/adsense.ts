/**
 * AdSense env surface (F-4.3) — kept in its own module so both the
 * server AdSlot fallback and the client AdSenseUnit read the same
 * NEXT_PUBLIC_* constants without crossing the module boundary.
 * Unset = the whole feature ships dark.
 */
export const ADSENSE_CLIENT = process.env.NEXT_PUBLIC_ADSENSE_CLIENT ?? "";
export const ADSENSE_SLOT = process.env.NEXT_PUBLIC_ADSENSE_SLOT ?? "";
export const adsenseConfigured = () => Boolean(ADSENSE_CLIENT && ADSENSE_SLOT);
