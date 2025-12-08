const BASE = import.meta.env.VITE_API_BASE || "http://localhost:5001/api";
const TOKEN_KEY = "rentiva_token";

export const storage = {
  getToken: () => localStorage.getItem(TOKEN_KEY),
  setToken: (t: string) => localStorage.setItem(TOKEN_KEY, t),
  clearToken: () => localStorage.removeItem(TOKEN_KEY),
};

async function request<T = any>(path: string, options: RequestInit = {}): Promise<T> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string> || {}),
  };
  const token = storage.getToken();
  if (token) headers["Authorization"] = `Bearer ${token}`;

  const res = await fetch(`${BASE}${path}`, { ...options, headers });
  const text = await res.text();
  let data: any = null;
  try { data = text ? JSON.parse(text) : null; } catch { /* noop */ }

  if (!res.ok) {
    const msg = (data && (data.error || data.message)) || res.statusText || "Request failed";
    throw new Error(msg);
  }
  return data as T;
}

export type Property = {
  _id: string;
  title: string;
  address?: string;
  rent?: number;
  deletedAt?: string | null;
  createdAt?: string;
  updatedAt?: string;
};

export type PropertiesPage = {
  items: Property[];
  total: number;
  page: number;
  pageSize: number;
};

export const login = (email: string, password: string) =>
  request<{ token: string }>("/auth/login", { method: "POST", body: JSON.stringify({ email, password }) });

export const me = () => request<{ id: string; email: string; name?: string }>("/auth/me");

export const listProperties = (params: {
  page?: number; pageSize?: number; includeDeleted?: boolean; q?: string;
} = {}) => {
  const usp = new URLSearchParams();
  if (params.page) usp.set("page", String(params.page));
  if (params.pageSize) usp.set("pageSize", String(params.pageSize));
  if (params.includeDeleted) usp.set("includeDeleted", "true");
  if (params.q && params.q.trim()) usp.set("q", params.q.trim());
  const qs = usp.toString();
  return request<PropertiesPage | Property[]>(`/properties${qs ? `?${qs}` : ""}`);
};

export const createProperty = (payload: { title: string; address?: string; rent?: number }) =>
  request<Property>("/properties", { method: "POST", body: JSON.stringify(payload) });

export const updateRent = (id: string, rent: number) =>
  request<Property>(`/properties/${id}`, { method: "PATCH", body: JSON.stringify({ rent }) });

export const delProperty = (id: string) =>
  request<{ ok: true }>(`/properties/${id}`, { method: "DELETE" });

export const restoreProperty = (id: string) =>
  request<Property>(`/properties/${id}/restore`, { method: "PATCH" });

export default {
  storage,
  login, me,
  listProperties, createProperty, updateRent,
  delProperty, restoreProperty,
};
