const BASE =
  (import.meta as any).env?.VITE_API_BASE ||
  "http://localhost:5001/api";

const TOKEN_KEY = "rentiva_token";

export const storage = {
  getToken: (): string | null => {
    if (typeof window === "undefined") return null;
    return localStorage.getItem(TOKEN_KEY);
  },
  setToken: (t: string) => {
    if (typeof window === "undefined") return;
    localStorage.setItem(TOKEN_KEY, t);
  },
  clearToken: () => {
    if (typeof window === "undefined") return;
    localStorage.removeItem(TOKEN_KEY);
  },
};

async function request<T = any>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as any),
  };

  const token = storage.getToken();
  if (token) headers["Authorization"] = `Bearer ${token}`;

  const res = await fetch(`${BASE}${path}`, { cache: "no-store", ...options, headers });

  // 401 => ληγμένο / άκυρο token
  if (res.status === 401) {
    storage.clearToken();
    if (
      typeof window !== "undefined" &&
      window.location.pathname !== "/login"
    ) {
      window.location.href = "/login";
    }
    throw new Error("invalid or expired token");
  }

  if (!res.ok) {
    let msg = `HTTP ${res.status}`;
    try {
      const j = await res.json();
      msg = (j && (j.error || j.message)) || msg;
    } catch {
      // ignore JSON parse error
    }
    throw new Error(msg);
  }

  // Κάποια endpoints ίσως επιστρέφουν empty body
  try {
    return await res.json();
  } catch {
    return undefined as any;
  }
}

// ---- Types ----

export type HeatingType =
  | "none"
  | "central_oil"
  | "central_gas"
  | "autonomous_gas"
  | "autonomous_oil"
  | "heat_pump"
  | "electric"
  | "other";

export type EnergyClass =
  | "unknown"
  | "A+"
  | "A"
  | "B+"
  | "B"
  | "C"
  | "D"
  | "E"
  | "Z"
  | "H";

export type ParkingType =
  | "none"
  | "street"
  | "open"
  | "closed"
  | "garage";

export type FurnishedType = "none" | "partial" | "full";

export interface Property {
  _id: string;
  title: string;
  address: string;
  rent: number;

  size?: number;
  floor?: number;
  bedrooms?: number;
  bathrooms?: number;

  yearBuilt?: number;
  yearRenovated?: number;
  heatingType?: HeatingType;
  energyClass?: EnergyClass;
  parking?: ParkingType;
  elevator?: boolean;

  furnished?: FurnishedType;
  petsAllowed?: boolean;

  description?: string;

  commonCharges?: number;
  otherFixedCosts?: number;
  billsIncluded?: boolean;
  depositMonths?: number;
  minimumContractMonths?: number;

  deletedAt?: string | null;
  landlordId?: string;
  createdAt?: string;
  updatedAt?: string;
}

export type PropertyEventKind = "created" | "updated" | "deleted" | "restored" | "note";

export type PropertyEvent = {
  _id: string;
  propertyId: string;
  kind: string;
  title: string;
  message?: string;
  meta?: Record<string, any>;
  actorId?: string;
  createdAt: string;
  updatedAt: string;
};

export type CreatePayload = {
  title: string;
  address: string;
  rent: number;

  size?: number;
  floor?: number;
  bedrooms?: number;
  bathrooms?: number;

  yearBuilt?: number;
  yearRenovated?: number;
  heatingType?: HeatingType;
  energyClass?: EnergyClass;
  parking?: ParkingType;
  elevator?: boolean;

  furnished?: FurnishedType;
  petsAllowed?: boolean;

  description?: string;

  commonCharges?: number;
  otherFixedCosts?: number;
  billsIncluded?: boolean;
  depositMonths?: number;
  minimumContractMonths?: number;
};

export interface PaginatedPropertiesResponse {
  items: Property[];
  totalItems: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

// ---- Auth ----
async function login(email: string, password: string) {
  const j = await request<{ token: string }>("/auth/login", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });
  if (j?.token) storage.setToken(j.token);
  return j;
}

// ---- Properties ----
async function listProperties(opts: {
  includeDeleted?: boolean;
  page?: number;
  pageSize?: number;
  q?: string;
} = {}): Promise<PaginatedPropertiesResponse> {
  const qs = new URLSearchParams();

  if (opts.includeDeleted) qs.set("includeDeleted", "true");
  if (opts.page && opts.page > 0) qs.set("page", String(opts.page));
  if (opts.pageSize && opts.pageSize > 0)
    qs.set("pageSize", String(opts.pageSize));
  if (opts.q && opts.q.trim() !== "") qs.set("q", opts.q.trim());

  const suffix = qs.toString() ? `?${qs}` : "";
  return request<PaginatedPropertiesResponse>(`/properties${suffix}`);
}

async function getProperty(id: string): Promise<Property> {
  return request<Property>(`/properties/${id}`);
}

async function createProperty(payload: CreatePayload) {
  return request("/properties/create-simple", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

async function delProperty(id: string) {
  return request(`/properties/${id}`, { method: "DELETE" });
}

async function restoreProperty(id: string) {
  try {
    return await request(`/properties/${id}/restore`, { method: "PATCH" });
  } catch {
    // fallback (σε περίπτωση που στον server παίζει POST)
    return await request(`/properties/${id}/restore`, { method: "POST" });
  }
}

async function updateProperty(id: string, payload: Partial<CreatePayload>) {
  return request(`/properties/${id}`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}

const api = {
  BASE,
  storage,
  login,
  listProperties,
  getProperty,
  createProperty,
  delProperty,
  restoreProperty,
  updateProperty,

  listPropertyEvents: async (id: string, opts?: { limit?: number }) => {
    const limit = opts?.limit ?? 20;
    const qs = new URLSearchParams();
    qs.set("limit", String(limit));
    const res = await request<{ items: PropertyEvent[] }>(
      `/properties/${id}/events?${qs.toString()}`
    );
    return res.items;
  },

  addPropertyEventNote: async (
    id: string,
    payload: { title: string; message?: string; meta?: Record<string, any> }
  ) => {
    return request<PropertyEvent>(`/properties/${id}/events`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
  },
};

export default api;
