const API_BASE =
  import.meta.env.VITE_API_BASE || "http://localhost:3001/api/v1";
// Тип опций запроса, поддерживаются GET и POST, сигнал для отмены запроса и тело запроса
type RequestOptions = {
  method?: "GET" | "POST";
  signal?: AbortSignal;
  body?: unknown;
};
// Основная функция для выполнения HTTP-запросов к API
async function request<T>(
  path: string,
  options: RequestOptions = {}
): Promise<T> {
  const { method = "GET", signal, body } = options;
  // Выполняем fetch-запрос с нужным методом, заголовками и телом запроса
  const response = await fetch(`${API_BASE}${path}`, {
    method,
    signal,
    headers: {
      "Content-Type": "application/json",
    },
    body: body ? JSON.stringify(body) : undefined, // сериализация тела запроса
  });
  // Если сервер вернул ошибку, бросаем исключение с кодом и текстом
  if (!response.ok) {
    const message = `API error ${response.status}: ${response.statusText}`;
    throw new Error(message);
  }
  // Возвращаем распарсенный JSON как тип T
  return (await response.json()) as T;
}
// Объект для удобного вызова GET и POST запросов с типизацией
export const httpClient = {
  // GET-запрос без тела
  get: <T>(
    path: string,
    options: Omit<RequestOptions, "method" | "body"> = {}
  ) => request<T>(path, { ...options, method: "GET" }),
  // POST-запрос с возможным телом
  post: <T>(
    path: string,
    body?: unknown,
    options: Omit<RequestOptions, "method" | "body"> = {}
  ) => request<T>(path, { ...options, method: "POST", body }),
};

export { API_BASE };
