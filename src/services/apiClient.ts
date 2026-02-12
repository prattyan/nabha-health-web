import { StorageService } from './storageService';

type HttpMethod = 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE';

const ACCESS_TOKEN_KEY = 'nabhacare_access_token';
const REFRESH_TOKEN_KEY = 'nabhacare_refresh_token';

export class ApiClient {
  private static instance: ApiClient;
  private storage = StorageService.getInstance();

  static getInstance(): ApiClient {
    if (!ApiClient.instance) ApiClient.instance = new ApiClient();
    return ApiClient.instance;
  }

  getAccessToken(): string | null {
    return this.storage.getItem(ACCESS_TOKEN_KEY);
  }

  getRefreshToken(): string | null {
    return this.storage.getItem(REFRESH_TOKEN_KEY);
  }

  setTokens(accessToken: string, refreshToken: string) {
    this.storage.setItem(ACCESS_TOKEN_KEY, accessToken);
    this.storage.setItem(REFRESH_TOKEN_KEY, refreshToken);
  }

  clearTokens() {
    this.storage.removeItem(ACCESS_TOKEN_KEY);
    this.storage.removeItem(REFRESH_TOKEN_KEY);
  }

  private getBaseUrl(): string {
    const envBase = (import.meta as any).env?.VITE_API_BASE_URL as string | undefined;
    // Default: use Vite proxy (/api -> localhost:3001)
    return envBase ?? '/api';
  }

  private async rawRequest<T>(method: HttpMethod, path: string, body?: unknown, accessToken?: string | null): Promise<T> {
    const url = `${this.getBaseUrl()}${path.startsWith('/') ? path : `/${path}`}`;
    const headers: Record<string, string> = {
      'Content-Type': 'application/json'
    };
    if (accessToken) headers.Authorization = `Bearer ${accessToken}`;

    const res = await fetch(url, {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body)
    });

    if (res.status === 204) return undefined as T;
    const text = await res.text();
    const json = text ? JSON.parse(text) : undefined;

    if (!res.ok) {
      const message = (json && (json.message || json.error)) || `HTTP ${res.status}`;
      const err = new Error(message);
      (err as any).status = res.status;
      (err as any).payload = json;
      throw err;
    }
    return json as T;
  }

  private async refreshTokens(): Promise<void> {
    const refreshToken = this.getRefreshToken();
    if (!refreshToken) throw new Error('Missing refresh token');
    const res = await this.rawRequest<{ accessToken: string; refreshToken: string }>('POST', '/auth/refresh', { refreshToken }, null);
    this.setTokens(res.accessToken, res.refreshToken);
  }

  async request<T>(method: HttpMethod, path: string, body?: unknown): Promise<T> {
    const accessToken = this.getAccessToken();
    try {
      return await this.rawRequest<T>(method, path, body, accessToken);
    } catch (e) {
      const status = (e as any)?.status;
      if (status === 401) {
        await this.refreshTokens();
        return this.rawRequest<T>(method, path, body, this.getAccessToken());
      }
      throw e;
    }
  }

  get<T>(path: string): Promise<T> {
    return this.request<T>('GET', path);
  }
  post<T>(path: string, body?: unknown): Promise<T> {
    return this.request<T>('POST', path, body);
  }
  patch<T>(path: string, body?: unknown): Promise<T> {
    return this.request<T>('PATCH', path, body);
  }
}
