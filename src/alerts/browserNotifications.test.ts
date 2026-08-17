import { describe, expect, it } from 'vitest';
import { newOrderNotificationCopy } from './browserNotifications';

describe('newOrderNotificationCopy', () => {
  it('matches the Android/FCM new-order title and body', () => {
    const copy = newOrderNotificationCopy(3, 'abc123');
    expect(copy.title).toBe('New order received');
    expect(copy.body).toBe('You have a new order (3 items).');
    expect(copy.tag).toBe('order-abc123');
    expect(copy.url).toBe('/orders');
  });

  it('strips trailing .0 from item counts', () => {
    expect(newOrderNotificationCopy(2, 'x').body).toBe('You have a new order (2 items).');
  });
});
