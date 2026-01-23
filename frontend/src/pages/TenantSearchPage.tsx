import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";

type PublicProperty = {
  _id: string;
  title: string;
  address?: string;
  rent?: number;
  size?: number;
  floor?: number;
  bedrooms?: number;
  bathrooms?: number;
  balcony?: boolean;
  elevator?: boolean;
  furnished?: string;
  petsAllowed?: boolean;
  description?: string;
  commonCharges?: number;
  otherFixedCosts?: number;
  billsIncluded?: boolean;
  depositMonths?: number;
  minimumContractMonths?: number;
};

type PublicListResponse = {
  items: PublicProperty[];
  totalItems: number;
  page: number;
  pageSize: number;
  totalPages: number;
};

const API_BASE =
  (import.meta as any).env?.VITE_API_BASE?.toString() || "http://localhost:5001/api";

function toNumberOrUndef(v: string): number | undefined {
  const n = Number(v);
  return Number.isFinite(n) && v.trim() !== "" ? n : undefined;
}

export default function TenantSearchPage() {
  const [q, setQ] = useState("");
  const [minRent, setMinRent] = useState<string>("");
  const [maxRent, setMaxRent] = useState<string>("");
  const [minSize, setMinSize] = useState<string>("");
  const [maxSize, setMaxSize] = useState<string>("");
  const [bedrooms, setBedrooms] = useState<string>("");

  const [petsAllowed, setPetsAllowed] = useState(false);
  const [balcony, setBalcony] = useState(false);
  const [elevator, setElevator] = useState(false);
  const [furnished, setFurnished] = useState<"any" | "none" | "partial" | "full">("any");

  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const [data, setData] = useState<PublicListResponse>({
    items: [],
    totalItems: 0,
    page: 1,
    pageSize: 10,
    totalPages: 1,
  });
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  // Όταν αλλάζουν φίλτρα, γύρνα στην 1η σελίδα.
  useEffect(() => {
    setPage(1);
  }, [q, minRent, maxRent, minSize, maxSize, bedrooms, petsAllowed, balcony, elevator, furnished, pageSize]);

  const url = useMemo(() => {
    const params = new URLSearchParams();
    params.set("page", String(page));
    params.set("pageSize", String(pageSize));

    const qq = q.trim();
    if (qq) params.set("q", qq);

    const mnR = toNumberOrUndef(minRent);
    const mxR = toNumberOrUndef(maxRent);
    const mnS = toNumberOrUndef(minSize);
    const mxS = toNumberOrUndef(maxSize);
    const bd = toNumberOrUndef(bedrooms);

    if (mnR !== undefined) params.set("minRent", String(mnR));
    if (mxR !== undefined) params.set("maxRent", String(mxR));
    if (mnS !== undefined) params.set("minSize", String(mnS));
    if (mxS !== undefined) params.set("maxSize", String(mxS));
    if (bd !== undefined) params.set("bedrooms", String(bd));

    if (petsAllowed) params.set("petsAllowed", "true");
    if (balcony) params.set("balcony", "true");
    if (elevator) params.set("elevator", "true");
    if (furnished !== "any") params.set("furnished", furnished);

    return `${API_BASE}/public/properties?${params.toString()}`;
  }, [q, minRent, maxRent, minSize, maxSize, bedrooms, petsAllowed, balcony, elevator, furnished, page, pageSize]);

  useEffect(() => {
    let cancelled = false;

    async function run() {
      setLoading(true);
      setErr(null);

      try {
        const res = await fetch(url);
        const json = (await res.json()) as PublicListResponse;

        if (!res.ok) {
          const msg = (json as any)?.error || `HTTP ${res.status}`;
          throw new Error(msg);
        }

        if (!cancelled) setData(json);
      } catch (e: any) {
        if (!cancelled) setErr(e?.message || "Κάτι πήγε στραβά.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    run();
    return () => {
      cancelled = true;
    };
  }, [url]);

  const totalPages = data.totalPages || 1;

  return (
    <div className="max-w-5xl mx-auto px-4 py-6">
      <div className="flex items-center justify-between gap-3 mb-4">
        <div>
          <h1 className="text-xl font-semibold">Αναζήτηση Ακινήτων</h1>
          <div className="text-sm text-gray-600">
            Public listings (μόνο δημοσιευμένα) · Σύνολο: {data.totalItems}
          </div>
        </div>
        <Link to="/" className="text-sm px-3 py-1.5 rounded-xl border hover:bg-gray-50">
          ← Αρχική
        </Link>
      </div>

      <div className="bg-white rounded-2xl border p-4 mb-5">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <input
            className="border rounded-xl px-3 py-2"
            placeholder="Αναζήτηση (τίτλος/διεύθυνση)..."
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />

          <div className="grid grid-cols-2 gap-2">
            <input
              className="border rounded-xl px-3 py-2"
              placeholder="Ελάχ. ενοίκιο"
              value={minRent}
              onChange={(e) => setMinRent(e.target.value)}
              inputMode="numeric"
            />
            <input
              className="border rounded-xl px-3 py-2"
              placeholder="Μέγ. ενοίκιο"
              value={maxRent}
              onChange={(e) => setMaxRent(e.target.value)}
              inputMode="numeric"
            />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <input
              className="border rounded-xl px-3 py-2"
              placeholder="Ελάχ. τ.μ."
              value={minSize}
              onChange={(e) => setMinSize(e.target.value)}
              inputMode="numeric"
            />
            <input
              className="border rounded-xl px-3 py-2"
              placeholder="Μέγ. τ.μ."
              value={maxSize}
              onChange={(e) => setMaxSize(e.target.value)}
              inputMode="numeric"
            />
          </div>

          <input
            className="border rounded-xl px-3 py-2"
            placeholder="Υπνοδωμάτια (>=)"
            value={bedrooms}
            onChange={(e) => setBedrooms(e.target.value)}
            inputMode="numeric"
          />

          <select
            className="border rounded-xl px-3 py-2"
            value={furnished}
            onChange={(e) => setFurnished(e.target.value as any)}
          >
            <option value="any">Επίπλωση: Όλα</option>
            <option value="none">Χωρίς</option>
            <option value="partial">Μερική</option>
            <option value="full">Πλήρης</option>
          </select>

          <div className="flex items-center gap-3">
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={petsAllowed} onChange={(e) => setPetsAllowed(e.target.checked)} />
              Κατοικίδια
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={balcony} onChange={(e) => setBalcony(e.target.checked)} />
              Μπαλκόνι
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={elevator} onChange={(e) => setElevator(e.target.checked)} />
              Ασανσέρ
            </label>
          </div>
        </div>

        <div className="flex items-center justify-between mt-4 gap-3">
          <div className="text-sm text-gray-600">
            {loading ? "Φορτώνει..." : err ? `Σφάλμα: ${err}` : "OK"}
          </div>

          <div className="flex items-center gap-2">
            <select
              className="border rounded-xl px-2 py-1 text-sm"
              value={pageSize}
              onChange={(e) => setPageSize(Number(e.target.value))}
            >
              <option value={5}>5</option>
              <option value={10}>10</option>
              <option value={20}>20</option>
            </select>

            <button
              className="border rounded-xl px-3 py-1.5 disabled:opacity-50"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1 || loading}
            >
              Προηγούμενη
            </button>
            <div className="text-sm text-gray-700">
              Σελίδα {page} / {totalPages}
            </div>
            <button
              className="border rounded-xl px-3 py-1.5 disabled:opacity-50"
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages || loading}
            >
              Επόμενη
            </button>
          </div>
        </div>
      </div>

      <div className="space-y-3">
        {data.items.map((p) => {
          const approxTotal =
            (p.rent || 0) + (p.commonCharges || 0) + (p.otherFixedCosts || 0);

          return (
            <div key={p._id} className="bg-white rounded-2xl border p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="text-lg font-semibold">{p.title || "Χωρίς τίτλο"}</div>
                  <div className="text-sm text-gray-600">{p.address || "—"}</div>
                </div>

                <div className="text-right">
                  <div className="text-sm text-gray-600">Ενοίκιο</div>
                  <div className="text-lg font-semibold">{p.rent ?? "—"}€</div>
                </div>
              </div>

              <div className="mt-2 flex flex-wrap gap-2 text-sm text-gray-700">
                <span className="px-2 py-1 rounded-xl border">m²: {p.size ?? "—"}</span>
                <span className="px-2 py-1 rounded-xl border">Όροφος: {p.floor ?? "—"}</span>
                <span className="px-2 py-1 rounded-xl border">Υ/Δ: {p.bedrooms ?? "—"}</span>
                <span className="px-2 py-1 rounded-xl border">Μπάνια: {p.bathrooms ?? "—"}</span>
                {p.balcony ? <span className="px-2 py-1 rounded-xl border">Μπαλκόνι</span> : null}
                {p.elevator ? <span className="px-2 py-1 rounded-xl border">Ασανσέρ</span> : null}
                {p.petsAllowed ? <span className="px-2 py-1 rounded-xl border">Κατοικίδια</span> : null}
                {p.furnished ? <span className="px-2 py-1 rounded-xl border">Επίπλωση: {p.furnished}</span> : null}
                {p.billsIncluded ? <span className="px-2 py-1 rounded-xl border">Λογαριασμοί μέσα</span> : null}
              </div>

              <div className="mt-3 grid grid-cols-1 md:grid-cols-3 gap-2 text-sm text-gray-700">
                <div className="border rounded-xl p-3">
                  <div className="text-gray-600">Κοινόχρηστα</div>
                  <div className="font-semibold">{p.commonCharges ?? 0}€</div>
                </div>
                <div className="border rounded-xl p-3">
                  <div className="text-gray-600">Άλλα πάγια</div>
                  <div className="font-semibold">{p.otherFixedCosts ?? 0}€</div>
                </div>
                <div className="border rounded-xl p-3">
                  <div className="text-gray-600">Περίπου σύνολο</div>
                  <div className="font-semibold">{approxTotal}€</div>
                </div>
              </div>

              {p.description ? (
                <div className="mt-3 text-sm text-gray-700 whitespace-pre-wrap">
                  {p.description}
                </div>
              ) : null}
            </div>
          );
        })}

        {!loading && !err && data.items.length === 0 ? (
          <div className="text-sm text-gray-600">Δεν βρέθηκαν δημοσιευμένα ακίνητα με αυτά τα φίλτρα.</div>
        ) : null}
      </div>
    </div>
  );
}
