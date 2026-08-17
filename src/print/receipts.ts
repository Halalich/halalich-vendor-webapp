import { parsePrice } from '../domain/price';
import type { Order } from '../types';

function esc(value: string | undefined | null): string {
  return (value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function money(amount: number): string {
  return `EUR ${amount.toFixed(2)}`;
}

function itemRows(order: Order, useVendorPrice: boolean): string {
  return order.items
    .map((item) => {
      const unit = useVendorPrice ? item.vendor_price : item.price_per_unit;
      const line = item.quantity * parsePrice(unit);
      const note = item.instructions
        ? `<div class="note">Note: ${esc(item.instructions)}</div>`
        : '';
      return `<tr>
        <td>${esc(item.product_name)}${note}</td>
        <td class="qty">${item.quantity}</td>
        <td class="price">${money(line)}</td>
      </tr>`;
    })
    .join('');
}

function vendorTotals(order: Order): string {
  return `<div class="total">Total: ${money(order.vendor_cart_total)}</div>`;
}

function userTotals(order: Order): string {
  const lines: string[] = [`<div>Cart total: ${money(order.cart_total)}</div>`];
  if (order.coupon_code) {
    lines.push(`<div>Coupon: ${esc(order.coupon_code)}</div>`);
  }
  if (order.discounted_cart_total > 0 && order.discounted_cart_total < order.cart_total) {
    const discount = order.cart_total - order.discounted_cart_total;
    lines.push(`<div>Discount: EUR -${discount.toFixed(2)}</div>`);
  }
  if (order.delivery_fee > 0) {
    lines.push(`<div>Delivery fee: ${money(order.delivery_fee)}</div>`);
  }
  if (order.small_order_fee > 0) {
    lines.push(`<div>Small order fee: ${money(order.small_order_fee)}</div>`);
  }
  lines.push(`<div class="total">Total: ${money(order.total_price)}</div>`);
  return lines.join('');
}

function receiptHtml(order: Order, type: 'Vendor' | 'User'): string {
  const useVendorPrice = type === 'Vendor';
  const bell =
    type === 'User' && order.delivery_address?.bell_name
      ? `<div>Bell Name: ${esc(order.delivery_address.bell_name)}</div>`
      : '';
  return `
    <section class="receipt">
      <h1>HALALICH ${type} RECEIPT</h1>
      <div>Order Created At: ${esc(order.order_date)}</div>
      <div>Order ID: ${esc(order.order_id)}</div>
      ${bell}
      <div>Vendor: ${esc(order.vendor_name)}</div>
      <table>
        <thead>
          <tr><th>Item</th><th>Qty</th><th>Total</th></tr>
        </thead>
        <tbody>${itemRows(order, useVendorPrice)}</tbody>
      </table>
      ${useVendorPrice ? vendorTotals(order) : userTotals(order)}
      <p class="thanks">THANK YOU FOR<br/>SHOPPING WITH<br/>HALALICH</p>
    </section>
  `;
}

export function printOrderReceipts(order: Order): void {
  const popup = window.open('', '_blank', 'width=420,height=900');
  if (!popup) {
    throw new Error('Pop-up blocked. Allow pop-ups to print receipts.');
  }
  popup.document.write(`<!doctype html>
<html>
<head>
  <title>Halalich receipts ${order.order_id}</title>
  <style>
    body { font-family: ui-monospace, SFMono-Regular, Menlo, monospace; margin: 16px; color: #111; }
    .receipt { border: 1px dashed #999; padding: 16px; margin-bottom: 24px; width: 320px; }
    h1 { font-size: 14px; text-align: center; letter-spacing: 0.04em; }
    table { width: 100%; border-collapse: collapse; margin: 12px 0; font-size: 12px; }
    th, td { text-align: left; padding: 4px 0; vertical-align: top; }
    th:last-child, td.price, td.qty { text-align: right; }
    .note { font-size: 11px; color: #444; }
    .total { font-weight: 700; margin-top: 8px; }
    .thanks { text-align: center; font-size: 12px; margin-top: 16px; }
    @media print { body { margin: 0; } .receipt { border: none; page-break-after: always; } }
  </style>
</head>
<body>
  ${receiptHtml(order, 'Vendor')}
  ${receiptHtml(order, 'User')}
  <script>window.onload = function () { window.print(); }<\/script>
</body>
</html>`);
  popup.document.close();
}
