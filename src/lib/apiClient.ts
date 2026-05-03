import { getAccessToken } from "./auth";

export type ApiEnvelope<T, TMeta = unknown> = {
  success: boolean;
  data: T;
  message?: string;
  meta?: TMeta;
};

export class ApiError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:4000/api";
const API_FALLBACK_URL = "http://localhost:4010/api";

function getCandidates() {
  return API_BASE_URL === API_FALLBACK_URL
    ? [API_BASE_URL]
    : [API_BASE_URL, API_FALLBACK_URL];
}

async function parseJsonSafe<T>(response: Response): Promise<T | null> {
  const raw = await response.text();
  if (!raw) {
    return null;
  }

  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

export async function apiRequest<TResponse, TMeta = unknown>(
  path: string,
  init?: RequestInit,
  requireAuth = false,
): Promise<ApiEnvelope<TResponse, TMeta>> {
  const headers = new Headers(init?.headers ?? {});

  if (!headers.has("Content-Type") && init?.body) {
    headers.set("Content-Type", "application/json");
  }

  if (requireAuth) {
    const token = getAccessToken();
    if (token) {
      headers.set("Authorization", `Bearer ${token}`);
    }
  }

  let lastError: unknown;

  for (const baseUrl of getCandidates()) {
    try {
      const response = await fetch(`${baseUrl}${path}`, {
        ...init,
        headers,
      });

      const payload = await parseJsonSafe<ApiEnvelope<TResponse, TMeta>>(response);

      if (!response.ok || !payload?.success) {
        throw new ApiError(payload?.message ?? "Request failed", response.status);
      }

      return payload;
    } catch (error) {
      lastError = error;
      if (error instanceof ApiError) {
        throw error;
      }
    }
  }

  if (lastError instanceof Error) {
    throw lastError;
  }

  throw new ApiError("Unable to complete request", 500);
}
