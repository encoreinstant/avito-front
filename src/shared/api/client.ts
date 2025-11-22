const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:3001/api/v1';

type RequestOptions = {
  method?: 'GET' | 'POST';
  signal?: AbortSignal;
  body?: unknown;
};

async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { method = 'GET', signal, body } = options;

  const response = await fetch(`${API_BASE}${path}`, {
    method,
    signal,
    headers: {
      'Content-Type': 'application/json',
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  if (!response.ok) {
    const message = `API error ${response.status}: ${response.statusText}`;
    throw new Error(message);
  }

  return (await response.json()) as T;
}

export const httpClient = {
  get: <T>(path: string, options: Omit<RequestOptions, 'method' | 'body'> = {}) =>
    request<T>(path, { ...options, method: 'GET' }),
  post: <T>(path: string, body?: unknown, options: Omit<RequestOptions, 'method' | 'body'> = {}) =>
    request<T>(path, { ...options, method: 'POST', body }),
};

export { API_BASE };
