import { describe, expect, it } from 'vitest';
import { scrubText } from './errorScrub';

describe('scrubText', () => {
  it('removes emails, long digit runs and URL queries', () => {
    const out = scrubText('fail for a@b.com phone 491701234567 at https://x.test/api?token=abc', 500);
    expect(out).toBe('fail for email phone n at https://x.test/api');
  });

  it('keeps short numbers such as http statuses', () => {
    expect(scrubText('HTTP 500 from /api/orders', 500)).toBe('HTTP 500 from /api/orders');
  });

  it('truncates to the max length', () => {
    expect(scrubText('x'.repeat(50), 10)).toHaveLength(10);
  });
});
