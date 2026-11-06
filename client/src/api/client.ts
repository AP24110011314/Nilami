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

class ApiClient {
  private readonly baseUrl: string;

  constructor() {
    this.baseUrl = (import.meta.env.VITE_API_URL as string | undefined) ?? 'http://localhost:4000/api';
  }

  public async get<T>(path: string): Promise<T> {
    const url = `${this.baseUrl.replace(/\/$/, '')}/${path.replace(/^\//, '')}`;
    const res = await fetch(url, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
      },
      credentials: 'omit',
    });

    if (!res.ok) {
      let errorData: { error?: { message?: string; code?: string; details?: unknown } } = {};
      try {
        errorData = (await res.json()) as typeof errorData;
      } catch {
        // Fallback for non-JSON errors
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

  public async getHealth(): Promise<HealthResponse> {
    return this.get<HealthResponse>('/health');
  }
}

export const apiClient = new ApiClient();
