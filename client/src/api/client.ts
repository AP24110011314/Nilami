import { useAuthStore, type User } from '../store/auth.js';

export interface HealthResponse {
  ok: boolean;
  mongo: string;
  redis: string;
  uptime: number;
  serverTime: string;
}

export class ApiError extends Error {
  public readonly status: number;
  public readonly code: string;
  public readonly details?: unknown;

  constructor(status: number, message: string, code = 'API_ERROR', details?: unknown) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

interface RequestOptions extends RequestInit {
  retryOn401?: boolean;
}

class ApiClient {
  private readonly baseUrl: string;
  private isRefreshing = false;
  private refreshSubscribers: Array<(token: string | null) => void> = [];

  constructor() {
    this.baseUrl = (import.meta.env.VITE_API_URL as string | undefined) ?? 'http://localhost:4000/api';
  }

  private onTokenRefreshed(token: string | null) {
    this.refreshSubscribers.forEach((callback) => callback(token));
    this.refreshSubscribers = [];
  }

  private addRefreshSubscriber(callback: (token: string | null) => void) {
    this.refreshSubscribers.push(callback);
  }

  public async request<T>(path: string, options: RequestOptions = {}): Promise<T> {
    const { retryOn401 = true, ...fetchOptions } = options;
    const url = `${this.baseUrl.replace(/\/$/, '')}/${path.replace(/^\//, '')}`;

    const headers = new Headers(fetchOptions.headers || {});
    if (!headers.has('Content-Type') && !(fetchOptions.body instanceof FormData)) {
      headers.set('Content-Type', 'application/json');
    }
    headers.set('Accept', 'application/json');

    // Attach Bearer token from in-memory store
    const token = useAuthStore.getState().accessToken;
    if (token && !headers.has('Authorization')) {
      headers.set('Authorization', `Bearer ${token}`);
    }

    const res = await fetch(url, {
      ...fetchOptions,
      headers,
      credentials: 'include', // Ensures httpOnly rt cookie is sent
    });

    if (res.status === 401 && retryOn401 && !path.includes('/auth/login') && !path.includes('/auth/refresh')) {
      if (!this.isRefreshing) {
        this.isRefreshing = true;
        try {
          const refreshRes = await this.refresh();
          useAuthStore.getState().setAccessToken(refreshRes.accessToken);
          this.onTokenRefreshed(refreshRes.accessToken);
          this.isRefreshing = false;
        } catch {
          this.isRefreshing = false;
          this.onTokenRefreshed(null);
          useAuthStore.getState().clearAuth();
          throw new ApiError(401, 'Session expired. Please log in again', 'UNAUTHENTICATED');
        }
      } else {
        // Wait for active refresh
        const newToken = await new Promise<string | null>((resolve) => {
          this.addRefreshSubscriber(resolve);
        });
        if (!newToken) {
          throw new ApiError(401, 'Session expired. Please log in again', 'UNAUTHENTICATED');
        }
      }

      // Retry original request once
      return this.request<T>(path, { ...options, retryOn401: false });
    }

    if (!res.ok) {
      let errorData: { error?: { message?: string; code?: string; details?: unknown } } = {};
      try {
        errorData = (await res.json()) as typeof errorData;
      } catch {
        // Non-JSON response
      }
      throw new ApiError(
        res.status,
        errorData.error?.message || `Request failed with status ${res.status}`,
        errorData.error?.code || 'HTTP_ERROR',
        errorData.error?.details,
      );
    }

    return (await res.json()) as T;
  }

  public get<T>(path: string, options?: RequestOptions): Promise<T> {
    return this.request<T>(path, { ...options, method: 'GET' });
  }

  public post<T>(path: string, body?: unknown, options?: RequestOptions): Promise<T> {
    return this.request<T>(path, {
      ...options,
      method: 'POST',
      body: body ? JSON.stringify(body) : undefined,
    });
  }

  public patch<T>(path: string, body?: unknown, options?: RequestOptions): Promise<T> {
    return this.request<T>(path, {
      ...options,
      method: 'PATCH',
      body: body ? JSON.stringify(body) : undefined,
    });
  }

  public delete<T>(path: string, options?: RequestOptions): Promise<T> {
    return this.request<T>(path, { ...options, method: 'DELETE' });
  }

  // Auth Endpoints
  public async register(data: { name: string; email: string; password: string; role?: 'buyer' | 'seller' }) {
    return this.post<{ user: User }>('/auth/register', data);
  }

  public async login(data: { email: string; password: string }) {
    return this.post<{ accessToken: string; user: User }>('/auth/login', data);
  }

  public async verifyEmail(token: string) {
    return this.post<{ message: string }>('/auth/verify-email', { token });
  }

  public async refresh() {
    return this.post<{ accessToken: string }>('/auth/refresh', undefined, { retryOn401: false });
  }

  public async logout() {
    return this.post<{ message: string }>('/auth/logout');
  }

  public async forgotPassword(email: string) {
    return this.post<{ message: string }>('/auth/forgot-password', { email });
  }

  public async resetPassword(data: { token: string; password: string }) {
    return this.post<{ message: string }>('/auth/reset-password', data);
  }

  // Users Endpoints
  public async getMe() {
    return this.get<{ user: User }>('/users/me');
  }

  public async updateMe(data: { name?: string }) {
    return this.patch<{ user: User }>('/users/me', data);
  }

  public async becomeSeller() {
    return this.post<{ user: User }>('/users/me/become-seller');
  }

  // Auctions Endpoints
  public async getAuctions(params?: Record<string, string | number | undefined>) {
    const searchParams = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([k, v]) => {
        if (v !== undefined && v !== '') {
          searchParams.set(k, String(v));
        }
      });
    }
    const query = searchParams.toString() ? `?${searchParams.toString()}` : '';
    return this.get<{
      items: AuctionItem[];
      total: number;
      page: number;
      limit: number;
      serverTime: string;
    }>(`/auctions${query}`);
  }

  public async getAuction(id: string) {
    return this.get<{ auction: AuctionItem; serverTime: string }>(`/auctions/${id}`);
  }

  public async createAuction(data: unknown) {
    return this.post<{ auction: AuctionItem }>('/auctions', data);
  }

  public async updateAuction(id: string, data: unknown) {
    return this.patch<{ auction: AuctionItem }>(`/auctions/${id}`, data);
  }

  public async cancelAuction(id: string) {
    return this.post<{ auction: AuctionItem }>(`/auctions/${id}/cancel`);
  }

  // Bidding Endpoints (Phase 3)
  public async placeBid(auctionId: string, amount: number, idempotencyKey: string) {
    return this.post<{
      replayed: boolean;
      bid: { id: string; amount: number; at: string };
      auction: AuctionItem;
      serverTime: string;
    }>(`/auctions/${auctionId}/bid`, { amount, idempotencyKey });
  }

  public async getAuctionBids(auctionId: string, page = 1, limit = 20) {
    return this.get<{
      items: Array<{
        id: string;
        amount: number;
        bidderMasked: string;
        createdAt: string;
        extended: boolean;
      }>;
      total: number;
      page: number;
      limit: number;
    }>(`/auctions/${auctionId}/bids?page=${page}&limit=${limit}`);
  }

  public async getMyBids() {
    return this.get<{
      bids: Array<{
        auction: AuctionItem;
        myHighestBid: number;
        leading: boolean;
      }>;
    }>('/users/my-bids');
  }

  public async getMyWins() {
    return this.get<{
      wins: Array<{
        auction: AuctionItem;
        finalPrice: number;
      }>;
    }>('/users/my-wins');
  }

  public async uploadImages(files: File[]) {
    const formData = new FormData();
    files.forEach((file) => formData.append('images', file));
    return this.request<{ images: Array<{ url: string; publicId: string }> }>('/uploads/images', {
      method: 'POST',
      body: formData,
    });
  }

  public async getHealth(): Promise<HealthResponse> {
    return this.get<HealthResponse>('/health');
  }
}

export interface AuctionItem {
  id: string;
  sellerId: string;
  title: string;
  description: string;
  category: 'electronics' | 'collectibles' | 'art' | 'fashion' | 'vehicles' | 'other';
  condition: 'new' | 'like_new' | 'used_good' | 'used_fair';
  images: Array<{ url: string; publicId?: string }>;
  currency: 'INR';
  startingPrice: number;
  minIncrement: number;
  currentPrice: number;
  minNextBid: number;
  highestBidderId?: string | null;
  highestBidderMasked?: string;
  winnerId?: string | null;
  finalPrice?: number | null;
  bidCount: number;
  startsAt: string;
  endsAt: string;
  status:
    | 'scheduled'
    | 'active'
    | 'payment_pending'
    | 'completed'
    | 'payment_failed'
    | 'unsold'
    | 'cancelled';
  reserveMet: boolean;
  seller?: {
    id: string;
    name: string;
    ratingAvg: number;
    ratingCount: number;
  };
  createdAt: string;
}

export const apiClient = new ApiClient();
