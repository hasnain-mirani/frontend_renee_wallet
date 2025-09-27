// src/lib/apiClient.ts
export type ApiOptions = {
  method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  body?: unknown;
  token?: string | null;
  headers?: Record<string, string>;
  signal?: AbortSignal;
  responseType?: "auto" | "json" | "text" | "blob";
};

// Prefer VITE_API_BASE; fallback to VITE_API_BASE_URL; default to "/api".
const raw =
  (import.meta.env.VITE_API_BASE as string | undefined) ??
  (import.meta.env.VITE_API_BASE_URL as string | undefined) ??
  "/api";

let BASE_URL = raw.trim().replace(/\/+$/, "");

// If it's an absolute URL and doesn't end with /api, append /api
if (/^https?:\/\//i.test(BASE_URL) && !/\/api$/i.test(BASE_URL)) {
  BASE_URL += "/api";
}
// If it's relative and not starting with /api, force /api
if (!/^https?:\/\//i.test(BASE_URL) && !BASE_URL.startsWith("/api")) {
  BASE_URL = "/api";
}

if (typeof window !== "undefined") {
  (window as any).__API_BASE__ = BASE_URL;
}

function buildUrl(path: string) {
  if (!path.startsWith("/")) path = "/" + path;
  return `${BASE_URL}${path}`;
}

async function parseResponse<T>(res: Response, responseType: ApiOptions["responseType"]) {
  if (res.status === 204 || res.headers.get("content-length") === "0") return null as T;
  const ct = res.headers.get("content-type") || "";
  const auto = !responseType || responseType === "auto";
  if (responseType === "blob" || (auto && (ct.includes("text/csv") || ct.includes("octet-stream")))) {
    return (await res.blob()) as unknown as T;
  }
  if (responseType === "text" || (auto && ct.startsWith("text/"))) {
    return (await res.text()) as unknown as T;
  }
  try { return (await res.json()) as T; } catch { return (await res.text()) as unknown as T; }
}

export async function apiFetch<T>(path: string, opts: ApiOptions = {}): Promise<T> {
  const url = buildUrl(path);
  const method = opts.method ?? "GET";
  const token = opts.token ?? (typeof window !== "undefined" ? localStorage.getItem("token") : null);
  const isGet = method === "GET" && opts.body == null;

  const headers: Record<string, string> = {
    Accept: "application/json, text/plain, */*",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(opts.headers ?? {}),
  };
  if (!isGet) headers["Content-Type"] = "application/json";

  const res = await fetch(url, {
    method,
    headers,
    body: !isGet && opts.body != null ? JSON.stringify(opts.body) : undefined,
    credentials: "include",
    signal: opts.signal,
  });

  const data = await parseResponse<T>(res, opts.responseType);
  if (!res.ok) {
    let message = res.statusText || "Request failed";
    try {
      const asAny = data as any;
      if (asAny && typeof asAny === "object" && asAny.message) message = asAny.message;
    } catch {}
    throw new Error(`${res.status} ${message}`);
  }
  return data as T;
}
