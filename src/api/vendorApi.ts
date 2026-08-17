import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { apiClient } from './client';
import { getDisplayError, isWriteSuccess } from './writeResponse';
import type { Category, Order, Product, Vendor, WriteResponse } from '../types';
import { mapApiCategories, mapApiOrder } from '../domain/orders';
import { storage } from '../firebase/config';

export class WriteFailedError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'WriteFailedError';
  }
}

function assertWrite(body: WriteResponse, fallback: string): WriteResponse {
  if (!isWriteSuccess(body)) {
    throw new WriteFailedError(getDisplayError(body) ?? fallback);
  }
  return body;
}

export async function fetchVendor(vendorId: string): Promise<Vendor> {
  const map = await apiClient.get<Record<string, Vendor>>(`/api/vendors/${vendorId}`);
  const first = map[vendorId] ?? Object.values(map)[0];
  if (!first) {
    throw new Error('Vendor not found');
  }
  return { ...first, vendor_id: vendorId };
}

export async function updateVendor(vendorId: string, vendor: Vendor): Promise<WriteResponse> {
  const body = await apiClient.post<WriteResponse>(`/api/vendors/${vendorId}`, vendor);
  return assertWrite(body, 'Failed to update vendor');
}

export async function fetchCategories(vendorId: string): Promise<Category[]> {
  const map = await apiClient.get<Record<string, Record<string, unknown>>>(
    `/api/vendors/${vendorId}/categories`,
  );
  return mapApiCategories(map);
}

export async function createCategory(vendorId: string, catName: string): Promise<WriteResponse> {
  const body = await apiClient.post<WriteResponse>(
    `/api/vendors/${vendorId}/categories/create`,
    { cat_name: catName },
  );
  return assertWrite(body, 'Failed to create category');
}

export async function updateCategory(
  vendorId: string,
  categoryId: string,
  catName: string,
): Promise<WriteResponse> {
  const body = await apiClient.post<WriteResponse>(
    `/api/vendors/${vendorId}/categories/${categoryId}`,
    { cat_name: catName, cat_id: categoryId },
  );
  return assertWrite(body, 'Failed to update category');
}

export async function fetchOrders(vendorId: string): Promise<Order[]> {
  const map = await apiClient.get<Record<string, Record<string, unknown>>>(
    `/api/orders/vendor/${vendorId}`,
  );
  if (!map) return [];
  return Object.entries(map).map(([id, raw]) => mapApiOrder(id, raw));
}

export async function updateOrderStatus(
  orderId: string,
  orderStatus: string,
): Promise<WriteResponse> {
  const body = await apiClient.post<WriteResponse>(`/api/orders/${orderId}`, {
    order_status: orderStatus,
  });
  return assertWrite(body, 'Failed to update order');
}

export interface ProductWritePayload {
  product_name: string;
  product_description: string;
  product_price: number;
  product_qty: number;
  product_image?: string | null;
  product_status?: string;
  product_is_per_kg: boolean;
  product_id?: string;
  category_id?: string;
}

export async function createProduct(
  vendorId: string,
  categoryId: string,
  product: ProductWritePayload,
): Promise<WriteResponse> {
  const body = await apiClient.post<WriteResponse>(
    `/api/vendors/${vendorId}/categories/${categoryId}/products/create`,
    product,
  );
  return assertWrite(body, 'Failed to add product');
}

export async function updateProduct(
  vendorId: string,
  categoryId: string,
  productId: string,
  product: ProductWritePayload,
): Promise<WriteResponse> {
  const body = await apiClient.post<WriteResponse>(
    `/api/vendors/${vendorId}/categories/${categoryId}/products/${productId}`,
    product,
  );
  return assertWrite(body, 'Failed to update product');
}

export async function uploadVendorImage(
  vendorId: string,
  file: File,
  folder: 'products' | 'branding',
): Promise<string> {
  const stamp = Date.now();
  const path =
    folder === 'products'
      ? `vendors/${vendorId}/products/${stamp}.jpg`
      : `vendors/${vendorId}/${stamp}.jpg`;
  const storageRef = ref(storage, path);
  await uploadBytes(storageRef, file);
  return getDownloadURL(storageRef);
}

export function toProductPayload(product: Product): ProductWritePayload {
  return {
    product_id: product.product_id,
    category_id: product.category_id,
    product_name: product.product_name,
    product_description: product.product_description,
    product_price: product.product_price,
    product_qty: product.product_qty,
    product_image: product.product_image ?? undefined,
    product_status: product.product_status,
    product_is_per_kg: product.product_is_per_kg,
  };
}
