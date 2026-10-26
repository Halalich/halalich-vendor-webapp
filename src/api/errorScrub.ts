/** Drops emails, long digit runs (phones, card-like numbers) and URL query strings before a report leaves the browser. */
export function scrubText(raw: string, max: number): string {
  return raw
    .replace(/\S+@\S+/g, 'email')
    .replace(/(https?:\/\/[^\s?)]+)\?\S*/g, '$1')
    .replace(/\d{6,}/g, 'n')
    .slice(0, max);
}
