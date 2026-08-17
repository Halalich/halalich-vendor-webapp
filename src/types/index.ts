export type OrderStatus =
  | 'pending'
  | 'accepted'
  | 'ready_for_pickup'
  | 'out_for_delivery'
  | 'delivered'
  | 'cancelled'
  | string;

export interface VendorContact {
  email?: string;
  phone?: string;
}

export interface VendorAddress {
  street?: string;
  city?: string;
  country?: string;
  zipcode?: string;
}

export interface Vendor {
  vendor_id?: string;
  vendor_name?: string;
  vendor_description?: string;
  vendor_contact?: VendorContact;
  vendor_address?: VendorAddress;
  vendor_cover_image?: string;
  vendor_logo?: string;
}

export interface Product {
  product_id: string;
  product_name: string;
  product_description: string;
  product_price: number;
  product_qty: number;
  product_image?: string | null;
  product_status?: string;
  product_is_per_kg: boolean;
  category_id: string;
}

export interface Category {
  cat_id: string;
  cat_name: string;
  products: Product[];
}

export interface DeliveryAddress {
  street?: string;
  city?: string;
  country?: string;
  zipcode?: string;
  bell_name?: string;
}

export interface OrderItem {
  order_id?: string;
  product_name: string;
  quantity: number;
  price_per_unit: string;
  vendor_price: string;
  vendor_id?: string;
  instructions?: string;
  discount_percentage?: number;
}

export interface Order {
  order_id: string;
  batch_delivery_id?: string;
  items: OrderItem[];
  order_date?: string;
  payment_method?: string;
  payment_status?: string;
  order_status: OrderStatus;
  total_price: number;
  user_id?: string;
  delivery_address?: DeliveryAddress;
  vendor_id?: string;
  cart_total: number;
  vendor_cart_total: number;
  discounted_cart_total: number;
  coupon_code?: string;
  delivery_fee: number;
  small_order_fee: number;
  tax?: number;
  is_pickup?: string;
  scheduled_pickup_time?: string;
  vendor_name?: string;
  delivery_date?: string;
}

export interface WriteResponse {
  id?: string;
  message?: string;
  error?: string | null;
  errors?: string | null;
}

export interface OrderBuckets {
  pendingPickup: Order[];
  pendingDelivery: Order[];
  accepted: Order[];
  readyForPickup: Order[];
  outForDelivery: Order[];
  delivered: Order[];
  cancelled: Order[];
  all: Order[];
}

export const emptyBuckets = (): OrderBuckets => ({
  pendingPickup: [],
  pendingDelivery: [],
  accepted: [],
  readyForPickup: [],
  outForDelivery: [],
  delivered: [],
  cancelled: [],
  all: [],
});
