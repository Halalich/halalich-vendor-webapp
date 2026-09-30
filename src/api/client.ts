import type { Auth } from 'firebase/auth';
import { auth } from '../firebase/config';

export class ApiError extends Error {
  status?: number;
  code?: string;

  constructor(message: string, status?: number, code?: string) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
  }
}

const BASE_URL = import.meta.env.VITE_API_BASE_URL;

/** Auth sessions of linked vendors, keyed by vendor id. The primary vendor is not registered. */
const linkedAuth = new Map<string, Auth>();

export function registerVendorAuth(vendorId: string, instance: Auth): void {
  linkedAuth.set(vendorId, instance);
}

export function unregisterVendorAuth(vendorId: string): void {
  linkedAuth.delete(vendorId);
}

async function getToken(vendorId: string | undefined, forceRefresh = false): Promise<string> {
  // A linked vendor must never fall back to the primary token.
  const linked = vendorId ? linkedAuth.get(vendorId) : undefined;
  const user = linked ? linked.currentUser : auth.currentUser;
  if (!user) {
    throw new ApiError('Not authenticated', 401, 'NO_USER');
  }
  return user.getIdToken(forceRefresh);
}

async function parseJson(response: Response): Promise<unknown> {
  const text = await response.text();
  if (!text) return {};
  try {
    return JSON.parse(text) as unknown;
  } catch {
    return { message: text };
  }
}

async function request<T>(
  path: string,
  options: RequestInit = {},
  vendorId?: string,
  retried = false,
): Promise<T> {
  const token = await getToken(vendorId, retried);
  const headers = new Headers(options.headers);
  headers.set('Content-Type', 'application/json');
  headers.set('Authorization', `Bearer ${token}`);

  const response = await fetch(`${BASE_URL}${path}`, {
    ...options,
    headers,
  });

  if (response.status === 401 && !retried) {
    return request<T>(path, options, vendorId, true);
  }

  const data = await parseJson(response);

  if (!response.ok) {
    const body = data as { message?: string; error?: string; errors?: string };
    throw new ApiError(
      body.errors || body.message || body.error || `HTTP ${response.status}`,
      response.status,
    );
  }

  return data as T;
}

export const apiClient = {
  /** `vendorId` picks which signed-in vendor's token is used; defaults to the primary vendor. */
  get<T>(path: string, vendorId?: string): Promise<T> {
    return request<T>(path, { method: 'GET' }, vendorId);
  },
  post<T>(path: string, body?: unknown, vendorId?: string): Promise<T> {
    return request<T>(
      path,
      {
        method: 'POST',
        body: body === undefined ? undefined : JSON.stringify(body),
      },
      vendorId,
    );
  },
};
