/**
 * AI scan packs sold as consumable in-app purchases (App Store / Google Play via RevenueCat).
 * Product IDs must match App Store Connect, Google Play Console and the RevenueCat dashboard;
 * prices come from the stores. Shared by the paywall and the server that grants credits.
 */

export const SCAN_PACKS = {
  calfit_scans_20: { credits: 20, title: '20 AI scans' },
  calfit_scans_100: { credits: 100, title: '100 AI scans' },
} as const;

export type ScanPackId = keyof typeof SCAN_PACKS;

/** Pack for a store product id. Google Play ids can carry a ":base-plan" suffix. */
export function scanPackFor(productId: string) {
  const id = productId.split(':')[0] as ScanPackId;
  return id in SCAN_PACKS ? { id, ...SCAN_PACKS[id] } : null;
}
