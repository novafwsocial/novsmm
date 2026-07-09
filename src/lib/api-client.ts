/**
 * Lightweight fetch wrapper for the NOVSMM API.
 * Throws on non-2xx with the server error message.
 */
export async function apiFetch<T = any>(
  path: string,
  options?: RequestInit
): Promise<T> {
  const res = await fetch(path, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(options?.headers ?? {}),
    },
  });

  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    throw new Error((data as any)?.error ?? `Request failed (${res.status})`);
  }

  return data as T;
}

export const api = {
  get: <T = any>(path: string) => apiFetch<T>(path),
  post: <T = any>(path: string, body?: any) =>
    apiFetch<T>(path, { method: "POST", body: body ? JSON.stringify(body) : undefined }),
  patch: <T = any>(path: string, body?: any) =>
    apiFetch<T>(path, { method: "PATCH", body: body ? JSON.stringify(body) : undefined }),
  delete: <T = any>(path: string, body?: any) =>
    apiFetch<T>(path, { method: "DELETE", body: body ? JSON.stringify(body) : undefined }),
};
