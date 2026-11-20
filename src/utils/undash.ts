// The tool never shows em dashes: they read as machine-written. Text from the AI and from the
// workbook passes through here before it reaches the screen or a bid.
const EM = /\s*\u2014\s*/g;

export const undashText = (s: string): string => (s.includes('\u2014') ? s.replace(EM, (m) => (m.trim() === m ? '-' : ' - ')).replace(/^ - | - $/g, '').trim() || '-' : s);

/** Every string inside a JSON-like value, with em dashes replaced. */
export function undash<T>(value: T): T {
  if (typeof value === 'string') return undashText(value) as T;
  if (Array.isArray(value)) return value.map(undash) as T;
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.entries(value as Record<string, unknown>).map(([k, v]) => [k, undash(v)])) as T;
  }
  return value;
}
