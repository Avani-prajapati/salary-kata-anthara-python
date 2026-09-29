const DEFAULT_API_BASE_URL = "http://localhost:8000";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? DEFAULT_API_BASE_URL;

export class ApiError extends Error {
  readonly status: number;
  readonly code: string;

  constructor(status: number, code: string, message: string) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
  }
}

function buildUrl(path: string, params?: Record<string, string | number>): string {
  const url = new URL(path, API_BASE_URL);
  for (const [key, value] of Object.entries(params ?? {})) {
    url.searchParams.set(key, String(value));
  }
  return url.toString();
}

async function readErrorBody(response: Response): Promise<{ code: string; message: string }> {
  try {
    const body = await response.json();
    return { code: body.code ?? "unknown_error", message: body.message ?? response.statusText };
  } catch {
    return { code: "unknown_error", message: response.statusText };
  }
}

async function request<T>(
  method: "GET" | "POST" | "PATCH",
  path: string,
  options?: { params?: Record<string, string | number>; body?: unknown },
): Promise<T> {
  const response = await fetch(buildUrl(path, options?.params), {
    method,
    ...(options?.body !== undefined && {
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(options.body),
    }),
  });

  if (!response.ok) {
    const { code, message } = await readErrorBody(response);
    throw new ApiError(response.status, code, message);
  }

  return response.json() as Promise<T>;
}

export function apiGet<T>(path: string, params?: Record<string, string | number>): Promise<T> {
  return request<T>("GET", path, { params });
}

export function apiPost<T>(path: string, body: unknown): Promise<T> {
  return request<T>("POST", path, { body });
}

export function apiPatch<T>(path: string, body: unknown): Promise<T> {
  return request<T>("PATCH", path, { body });
}
