import type { Product } from '../types';

/**
 * The body of a product update.
 *
 * A `product_qty` sent with a product update REPLACES the stock on hand (and the POS stock). The
 * quantity held here is the one loaded earlier, and sales and orders keep changing stock, so it
 * is left out unless the caller says the vendor really set it. An unrelated edit (a price change,
 * the Active switch) then leaves the live stock alone.
 */
export function toProductPayload(product: Product, options: { sendQty?: boolean } = {}) {
  return {
    product_id: product.product_id,
    category_id: product.category_id,
    product_name: product.product_name,
    product_description: product.product_description,
    product_price: product.product_price,
    ...(options.sendQty ? { product_qty: product.product_qty } : {}),
    product_image: product.product_image ?? undefined,
    product_status: product.product_status,
    product_is_per_kg: product.product_is_per_kg,
  };
}
