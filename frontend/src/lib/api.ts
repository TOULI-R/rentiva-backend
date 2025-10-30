const BASE = import.meta.env.VITE_API_BASE || 'http://localhost:5001/api';

async function api(path: string, options: RequestInit = {}) {
  const token = localStorage.getItem('token');
  const headers = new Headers(options.headers || {});
  if (!headers.has('Content-Type')) headers.set('Content-Type', 'application/json');
  if (token) headers.set('Authorization', `Bearer ${token}`);

  const res = await fetch(`${BASE}${path}`, { ...options, headers });
  const text = await res.text();
  let data: any;
  try { data = text ? JSON.parse(text) : null; } catch { data = text; }

  if (!res.ok) throw new Error(data?.error || res.statusText);
  return data;
}

export const login = (email: string, password: string) =>
  api('/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) });

export const me = () => api('/auth/me');
export const listProperties = () => api('/properties');
export const delProperty = (id: string) => api(`/properties/${id}`, { method: 'DELETE' });
export const restoreProperty = (id: string) => api(`/properties/${id}/restore`, { method: 'PATCH' });
