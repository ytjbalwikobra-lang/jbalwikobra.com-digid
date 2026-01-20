/**
 * Tier Styling Utilities
 * Centralized tier-based styling for consistent product card appearance
 * 
 * Used by: ProductsGrid, ProductCard components
 */

export type TierSlug = 'pelajar' | 'reguler' | 'premium' | string | undefined;

interface TierStyles {
  /** Badge styling for game/tier labels */
  badge: string;
  /** Image frame gradient styling */
  imageFrame: string;
  /** Card wrapper styling */
  wrapper: string;
  /** Tier accent bar color */
  accent: string;
}

const TIER_STYLES: Record<string, TierStyles> = {
  pelajar: {
    badge: 'bg-blue-500/25 text-blue-100 border-blue-400/70',
    imageFrame: 'bg-gradient-to-br from-blue-600/80 via-blue-600/50 to-cyan-600/80 border border-blue-400/60 shadow-inner shadow-blue-500/20',
    wrapper: 'bg-blue-600/20 border-blue-400/50 hover:bg-blue-600/25 hover:ring-2 ring-blue-400/30',
    accent: 'bg-blue-400',
  },
  reguler: {
    badge: 'bg-zinc-500/25 text-zinc-100 border-zinc-400/70',
    imageFrame: 'bg-gradient-to-br from-zinc-600/80 via-zinc-600/50 to-gray-600/80 border border-zinc-400/60 shadow-inner shadow-black/20',
    wrapper: 'bg-zinc-700/20 border-zinc-400/50 hover:bg-zinc-700/25 hover:ring-2 ring-zinc-400/30',
    accent: 'bg-zinc-300',
  },
  premium: {
    badge: 'bg-amber-500/25 text-amber-100 border-amber-400/70',
    imageFrame: 'bg-gradient-to-br from-amber-600/80 via-amber-500/50 to-yellow-600/80 border border-amber-400/60 shadow-inner shadow-amber-500/20',
    wrapper: 'bg-amber-600/20 border-amber-400/50 hover:bg-amber-600/25 hover:ring-2 ring-amber-400/30',
    accent: 'bg-amber-400',
  },
  default: {
    badge: 'bg-white/15 text-white/90 border-white/25',
    imageFrame: 'bg-gradient-to-br from-slate-700/80 via-slate-700/50 to-gray-700/80 border border-slate-500/50 shadow-inner shadow-black/20',
    wrapper: 'bg-white/10 border-white/20 hover:bg-white/15 hover:ring-2 ring-white/20',
    accent: 'bg-white/70',
  },
};

/**
 * Get all tier-based styles for a product card
 * @param tierSlug - The tier slug (pelajar, reguler, premium)
 * @returns Object with badge, imageFrame, wrapper, and accent class names
 */
export function getTierStyles(tierSlug: TierSlug): TierStyles {
  if (!tierSlug) return TIER_STYLES.default;
  const key = tierSlug.toLowerCase();
  return TIER_STYLES[key] || TIER_STYLES.default;
}

/**
 * Get badge class for tier/game labels
 */
export function getTierBadgeClass(tierSlug: TierSlug): string {
  return getTierStyles(tierSlug).badge;
}

/**
 * Get image frame class
 */
export function getTierImageFrameClass(tierSlug: TierSlug): string {
  return getTierStyles(tierSlug).imageFrame;
}

/**
 * Get card wrapper class
 */
export function getTierWrapperClass(tierSlug: TierSlug): string {
  return getTierStyles(tierSlug).wrapper;
}

/**
 * Get tier accent bar class
 */
export function getTierAccentClass(tierSlug: TierSlug): string {
  return getTierStyles(tierSlug).accent;
}
