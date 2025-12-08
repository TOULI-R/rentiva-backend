const BASE = import.meta.env.VITE_API_BASE || "http://localhost:5001/api";
const TOKEN_KEY = "auth_token";

export const storage = {
  getToken: () => localStorage.getItem(TOKEN_KEY) || "",
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
  const json = text ? JSON.parse(text) : {};
  if (!res.ok) {
    const err: any = json || { error: res.statusText };
    err.status = res.status;
    throw err;
  }
  return json;
}

async function login(email: string, password: string) {
  const data = await request<{ token: string }>("/auth/login", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });
  if (data?.token) storage.setToken(data.token);
  return data;
}

function me() {
  return request("/auth/me");
}

type ListParams = { q?: string; includeDeleted?: boolean; page?: number; pageSize?: number };
function qs(params: Record<string, any>) {
  const u = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => {
    if (v !== undefined && v !== null && v !== "") u.set(k, String(v));
  });
  const s = u.toString();
  return s ? `?${s}` : "";
}

function listProperties({ q, includeDeleted, page, pageSize }: ListParams = {}) {
  return request(`/properties${qs({ q, includeDeleted, page, pageSize })}`);
}

function createProperty(payload: { title: string; address?: string; rent?: number }) {
  return request(`/properties/create-simple`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

function delProperty(id: string) {
  return request(`/properties/${id}`, { method: "DELETE" });
}

async function restoreProperty(id: string) {
  try {
    return await request(`/properties/${id}/restore`, { method: "PATCH" });
  } catch (e: any) {
    if (e?.status === 404) {
      // Fallback για παλιότερο route
      return request(`/properties/${id}/restore`, { method: "POST" });
    }
    throw e;
  }
}

const api = {
  storage,
  request,
  login,
  me,
  listProperties,
  createProperty,
  delProperty,
  restoreProperty,
};

export default api;
