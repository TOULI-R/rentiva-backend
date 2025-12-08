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
  const json = text ? JSON.parse(text) : {};
  if (!res.ok) throw (json || new Error(res.statusText));
  return json;
}

async function login(email: string, password: string) {
  const out = await request<{ token: string }>("/auth/login", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });
  if (out?.token) storage.setToken(out.token);
  return out;
}

async function me() { return request("/auth/me"); }

// (οι property κλήσεις — κρατάμε μόνο ό,τι χρειάζεσαι τώρα)
async function listProperties(params?: { page?: number; limit?: number; includeDeleted?: boolean; q?: string }) {
  const q = new URLSearchParams();
  if (params?.page) q.set("page", String(params.page));
  if (params?.limit) q.set("limit", String(params.limit));
  if (params?.includeDeleted) q.set("includeDeleted", "true");
  if (params?.q) q.set("q", params.q);
  const qs = q.toString() ? `?${q.toString()}` : "";
  return request(`/properties${qs}`);
}

async function createProperty(payload: { title: string; address?: string; rent?: number }) {
  return request("/properties/create-simple", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

async function delProperty(id: string) {
  return request(`/properties/${id}`, { method: "DELETE" });
}

async function restoreProperty(id: string) {
  return request(`/properties/${id}/restore`, { method: "PATCH" });
}

async function logout() { storage.clearToken(); }

const api = {
  login,
  me,
  listProperties,
  createProperty,
  delProperty,
  restoreProperty,
  logout,
  storage,
};

export default api;
