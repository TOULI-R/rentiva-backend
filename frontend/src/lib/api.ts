const BASE =
  (import.meta as any).env?.VITE_API_BASE ||
  'http://localhost:5001/api';

export const storage = {
  getToken: (): string | null => localStorage.getItem('token'),
  setToken: (t: string) => localStorage.setItem('token', t),
  clearToken: () => localStorage.removeItem('token'),
};

async function request<T = any>(path: string, options: RequestInit = {}): Promise<T> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as any),
  };
  const token = storage.getToken();
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(`${BASE}${path}`, { ...options, headers });

  // 401 => συνήθως ληγμένο token
  if (res.status === 401) {
    throw new Error('invalid or expired token');
  }
  if (!res.ok) {
    let msg = `HTTP ${res.status}`;
    try {
      const j = await res.json();
      msg = (j && (j.error || j.message)) || msg;
    } catch { /* ignore */ }
    throw new Error(msg);
  }

  // Κάποια endpoints ίσως επιστρέφουν empty body
  try { return await res.json(); } catch { return undefined as any; }
}

// ---- Auth ----
async function login(email: string, password: string) {
  const j = await request<{ token: string }>('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });
  if (j?.token) storage.setToken(j.token);
  return j;
}

// ---- Properties ----
type CreatePayload = { title: string; address?: string; rent?: number };

async function listProperties(opts: { includeDeleted?: boolean } = {}) {
  const qs = new URLSearchParams();
  if (opts.includeDeleted) qs.set('includeDeleted', 'true');
  const suffix = qs.toString() ? `?${qs}` : '';
  return request(`/properties${suffix}`);
}

async function createProperty(payload: CreatePayload) {
  return request('/properties/create-simple', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

async function delProperty(id: string) {
  return request(`/properties/${id}`, { method: 'DELETE' });
}

async function restoreProperty(id: string) {
  try {
    return await request(`/properties/${id}/restore`, { method: 'PATCH' });
  } catch {
    // fallback (σε περίπτωση που στον server παίζει POST)
    return await request(`/properties/${id}/restore`, { method: 'POST' });
  }
}

// Προαιρετικά, αν το χρειαστούμε αργότερα
async function updateProperty(id: string, payload: Partial<CreatePayload>) {
  return request(`/properties/${id}`, { method: 'PATCH', body: JSON.stringify(payload) });
}

const api = {
  BASE,
  storage,
  login,
  listProperties,
  createProperty,
  delProperty,
  restoreProperty,
  updateProperty,
};

export default api;
