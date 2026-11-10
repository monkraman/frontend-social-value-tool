/** Matches the CSS breakpoint where the app switches to its mobile layout (see index.css). */
export const MOBILE_BREAKPOINT_PX = 960;

export function isNarrowViewport(): boolean {
  return typeof window !== 'undefined' && window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT_PX}px)`).matches;
}

/** Wide data tables don't fit on phones; start in card view there. */
export function defaultCollectionView(): 'list' | 'cards' {
  return isNarrowViewport() ? 'cards' : 'list';
}
