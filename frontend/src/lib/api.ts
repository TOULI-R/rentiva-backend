const BASE = import.meta.env.VITE_API_BASE as string;
const TOKEN_KEY = "rentiva_token";

export const storage = {
  getToken: () => localStorage.getItem(TOKEN_KEY),
  setToken: (t: string) => localStorage.setItem(TOKEN_KEY, t),
  clearToken: () => localStorage.removeItem(TOKEN_KEY),
};

async function request<T = any>(path: string, options: RequestInit = {}): Promise<T> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string> | undefined),
  };

  const token = storage.getToken();
  if (token) headers.Authorization = `Bearer ${token}`;

  const res = await fetch(`${BASE}${path}`, { ...options, headers });

  if (res.status === 401) {
    storage.clearToken();
    if (typeof window !== "undefined" && window.location.pathname !== "/login") {
      window.location.href = "/login";
    }
    throw new Error("UNAUTHORIZED");
  }

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(text || `HTTP ${res.status}`);
  }

  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
}

// ------- API methods -------

async function login(email: string, password: string) {
  const payload = await request<{ token: string; user: any }>("/auth/login", {
    method: "POST",
    body: JSON.stringify({
      email: email.trim().toLowerCase(),
      password,
    }),
  });
  if (payload?.token) storage.setToken(payload.token);
  return payload;
}

const me = () => request<any>("/auth/me");

const listProperties = (opts?: { includeDeleted?: boolean }) => {
  const qs = new URLSearchParams();
  if (opts?.includeDeleted) qs.set("includeDeleted", "true");
  const suffix = qs.toString() ? `?${qs.toString()}` : "";
  return request(`/properties${suffix}`);
};

const createProperty = (data: {
  title: string;
  address?: string;
  price?: number;
  rent?: number;
}) =>
  request("/properties/create-simple", {
    method: "POST",
    body: JSON.stringify(data),
  });

const updateProperty = (
  id: string,
  data: { title?: string; address?: string; price?: number; rent?: number }
) =>
  request(`/properties/${id}`, {
    method: "PUT",
    body: JSON.stringify(data),
  });

const delProperty = (id: string) =>
  request(`/properties/${id}`, { method: "DELETE" });

const restoreProperty = (id: string) =>
  request(`/properties/${id}/restore`, { method: "POST" });

const logout = () => {
  storage.clearToken();
};

const api = {
  login,
  me,
  listProperties,
  createProperty,
  updateProperty,
  delProperty,
  restoreProperty,
  logout,
  storage,
};

export default api;
