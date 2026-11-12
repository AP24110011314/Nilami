function getWindowOriginFallback(): string {
  if (typeof window !== 'undefined' && window.location?.origin) {
    return window.location.origin;
  }
  return '';
}

const rawApiUrl = (import.meta.env.VITE_API_URL as string | undefined)?.trim();
const rawSocketUrl = (import.meta.env.VITE_SOCKET_URL as string | undefined)?.trim();
const rawProxyTarget = (import.meta.env.VITE_API_PROXY_TARGET as string | undefined)?.trim();

export const API_BASE_URL =
  rawApiUrl ||
  (rawProxyTarget ? `${rawProxyTarget.replace(/\/$/, '')}/api` : `${getWindowOriginFallback()}/api`);

export const API_ORIGIN = API_BASE_URL.replace(/\/api\/?$/, '').replace(/\/$/, '');

export const SOCKET_BASE_URL = rawSocketUrl || API_ORIGIN || getWindowOriginFallback();

export const PAYMENT_PROVIDER =
  ((import.meta.env.VITE_PAYMENT_PROVIDER as string | undefined)?.trim().toLowerCase() as
    | 'stripe'
    | 'razorpay'
    | 'mock'
    | undefined) || 'razorpay';

