import type { Order } from '../types';

export interface EarningsSummary {
  thisMonthEarnings: number;
  lastMonthEarnings: number;
  totalEarnings: number;
  thisMonthOrders: number;
  totalOrders: number;
  earningsGrowthPercent: number;
  thisMonthShareOfTotalEarningsPercent: number;
  thisMonthShareOfTotalOrdersPercent: number;
  skippedDates: number;
}

function vendorRevenue(order: Order): number {
  return order.vendor_cart_total > 0 ? order.vendor_cart_total : order.cart_total;
}

function parseMonth(orderDate: string | undefined | null): { year: number; month: number } | null {
  if (orderDate == null || orderDate === '') return null;
  const trimmed = orderDate.trim();

  const tryDate = (d: Date): { year: number; month: number } | null => {
    if (Number.isNaN(d.getTime())) return null;
    return { year: d.getFullYear(), month: d.getMonth() + 1 };
  };

  const iso = /^(\d{4})-(\d{2})-(\d{2})[T ](\d{2}):(\d{2}):(\d{2})(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})?$/;
  const match = trimmed.match(iso);
  if (match) {
    return { year: Number(match[1]), month: Number(match[2]) };
  }

  return tryDate(new Date(trimmed));
}

function yearMonthKey(year: number, month: number): string {
  return `${year}-${String(month).padStart(2, '0')}`;
}

function minusOneMonth(year: number, month: number): { year: number; month: number } {
  if (month === 1) return { year: year - 1, month: 12 };
  return { year, month: month - 1 };
}

/** Pure earnings math over DELIVERED orders. Matches Android EarningsCalculator. */
export function calculateEarnings(
  deliveredOrders: Order[],
  current: { year: number; month: number } = {
    year: new Date().getFullYear(),
    month: new Date().getMonth() + 1,
  },
): EarningsSummary {
  const last = minusOneMonth(current.year, current.month);
  const currentKey = yearMonthKey(current.year, current.month);
  const lastKey = yearMonthKey(last.year, last.month);

  const s: EarningsSummary = {
    thisMonthEarnings: 0,
    lastMonthEarnings: 0,
    totalEarnings: 0,
    thisMonthOrders: 0,
    totalOrders: 0,
    earningsGrowthPercent: 0,
    thisMonthShareOfTotalEarningsPercent: 0,
    thisMonthShareOfTotalOrdersPercent: 0,
    skippedDates: 0,
  };

  let thisMonthOrderCount = 0;

  for (const order of deliveredOrders) {
    const revenue = vendorRevenue(order);
    s.totalEarnings += revenue;
    s.totalOrders += 1;

    const orderMonth = parseMonth(order.order_date);
    if (orderMonth == null) {
      s.skippedDates += 1;
      continue;
    }
    const key = yearMonthKey(orderMonth.year, orderMonth.month);
    if (key === currentKey) {
      s.thisMonthEarnings += revenue;
      thisMonthOrderCount += 1;
    } else if (key === lastKey) {
      s.lastMonthEarnings += revenue;
    }
  }

  s.thisMonthOrders = thisMonthOrderCount;

  if (s.lastMonthEarnings === 0) {
    s.earningsGrowthPercent = s.thisMonthEarnings > 0 ? 100 : 0;
  } else {
    s.earningsGrowthPercent =
      ((s.thisMonthEarnings - s.lastMonthEarnings) / s.lastMonthEarnings) * 100;
  }
  s.thisMonthShareOfTotalEarningsPercent =
    s.totalEarnings === 0 ? 0 : (s.thisMonthEarnings / s.totalEarnings) * 100;
  s.thisMonthShareOfTotalOrdersPercent =
    s.totalOrders === 0 ? 0 : (thisMonthOrderCount * 100) / s.totalOrders;

  return s;
}
