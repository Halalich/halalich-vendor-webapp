import { describe, expect, it } from 'vitest';
import { toProductPayload } from './productPayload';
import type { Product } from '../types';

const product = {
  product_id: 'p1',
  category_id: 'c1',
  product_name: 'Mutton',
  product_description: '',
  product_price: 12,
  product_qty: 8,
  product_status: 'active',
  product_is_per_kg: true,
} as Product;

describe('toProductPayload', () => {
  it('leaves the quantity out unless asked, so a price edit or the Active switch cannot put stale stock back', () => {
    const payload = toProductPayload(product);
    expect(payload).not.toHaveProperty('product_qty');
    expect(payload).toMatchObject({ product_id: 'p1', category_id: 'c1', product_price: 12, product_status: 'active' });
  });

  it('sends the quantity when the vendor set it', () => {
    expect(toProductPayload({ ...product, product_qty: 20 }, { sendQty: true })).toMatchObject({ product_qty: 20 });
  });
});
