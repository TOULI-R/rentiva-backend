import { useEffect, useMemo, useState } from "react";
import Header from "../components/Header";
import api from "../lib/api";

interface Property {
  _id: string;
  title?: string;
  address?: string;
  rent?: number;
  deletedAt?: string | null;
}

type ListResponse = {
  items: Property[];
  total: number;
  page: number;
  pageSize: number;
};

function normalizeList(res: any): ListResponse {
  let items: Property[] = [];
  if (Array.isArray(res)) items = res as Property[];
  else if (Array.isArray(res?.items)) items = res.items as Property[];
  else if (Array.isArray(res?.data)) items = res.data as Property[];
  const total = typeof res?.total === "number" ? res.total : items.length;
  const page = typeof res?.page === "number" ? res.page : 1;
  const pageSize = typeof res?.pageSize === "number" ? res.pageSize : 10;
  return { items, total, page, pageSize };
}

export default function Properties() {
  // filters
  const [q, setQ] = useState("");
  const [includeDeleted, setIncludeDeleted] = useState(false);

  // pagination
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(5);
  const [total, setTotal] = useState(0);

  // data
  const [items, setItems] = useState<Property[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  async function fetchList(opts?: { resetPage?: boolean }) {
    if (opts?.resetPage) setPage(1);
    setLoading(true);
    setErr(null);
    try {
      const res = await api.listProperties({ q, includeDeleted, page, pageSize });
      const data = normalizeList(res);
      setItems(data.items);
      setTotal(data.total);
      setPage(data.page || page);
      setPageSize(data.pageSize || pageSize);
    } catch (e: any) {
      setErr(e?.error || e?.message || "Αποτυχία φόρτωσης.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchList();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [includeDeleted, page, pageSize]);

  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const filtered = useMemo(() => items, [items]); // το server-side φίλτρο κάνει τη δουλειά

  const onDelete = async (id: string) => {
    if (!confirm("Να γίνει soft delete;")) return;
    try {
      await api.delProperty(id);
      fetchList();
    } catch (e: any) {
      alert(e?.message || "Αποτυχία διαγραφής.");
    }
  };

  const onRestore = async (id: string) => {
    try {
      await api.restoreProperty(id);
      fetchList();
    } catch (e: any) {
      alert(e?.message || "Αποτυχία restore.");
    }
  };

  // create (απλό)
  const [newTitle, setNewTitle] = useState("");
  const [newAddress, setNewAddress] = useState("");
  const [newRent, setNewRent] = useState<string>("");

  const onAdd = async () => {
    if (!newTitle.trim()) {
      alert("Ο τίτλος είναι υποχρεωτικός.");
      return;
    }
    const rentNumber = newRent.trim() === "" ? undefined : Number(newRent.trim());
    if (rentNumber !== undefined && Number.isNaN(rentNumber)) {
      alert("Το ενοίκιο πρέπει να είναι αριθμός.");
      return;
    }
    try {
      await api.createProperty({
        title: newTitle.trim(),
        address: newAddress.trim() || undefined,
        rent: rentNumber,
      });
      setNewTitle(""); setNewAddress(""); setNewRent("");
      fetchList({ resetPage: true });
    } catch (e: any) {
      alert(e?.message || "Αποτυχία δημιουργίας.");
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <main className="mx-auto max-w-5xl px-4 py-6 space-y-6">
        <h2 className="text-xl font-semibold">Properties</h2>

        {/* Add form */}
        <div className="bg-white p-4 rounded-xl shadow flex flex-col sm:flex-row gap-3 sm:items-end">
          <div className="flex-1">
            <label className="block text-sm text-gray-700">
              Τίτλος *
              <input
                className="mt-1 w-full border rounded-xl px-3 py-2"
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                placeholder="π.χ. Διαμέρισμα Κέντρο"
              />
            </label>
          </div>
          <div className="flex-1">
            <label className="block text-sm text-gray-700">
              Διεύθυνση
              <input
                className="mt-1 w-full border rounded-xl px-3 py-2"
                value={newAddress}
                onChange={(e) => setNewAddress(e.target.value)}
                placeholder="π.χ. Πανεπιστημίου 10"
              />
            </label>
          </div>
          <div className="w-40">
            <label className="block text-sm text-gray-700">
              Ενοίκιο (€)
              <input
                className="mt-1 w-full border rounded-xl px-3 py-2"
                value={newRent}
                onChange={(e) => setNewRent(e.target.value)}
                placeholder="700"
              />
            </label>
          </div>
          <button
            type="button"
            onClick={onAdd}
            className="whitespace-nowrap border rounded-xl px-4 py-2 bg-black text-white"
          >
            Προσθήκη
          </button>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between">
          <div />
          <div className="flex items-center gap-3">
            <input
              placeholder="Αναζήτηση τίτλου/διεύθυνσης..."
              className="border rounded-xl px-3 py-2 w-64"
              value={q}
              onChange={(e) => setQ(e.target.value)}
            />
            <button className="border rounded-xl px-3 py-2" onClick={() => fetchList({ resetPage: true })}>
              Αναζήτηση
            </button>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={includeDeleted}
                onChange={(e) => setIncludeDeleted(e.target.checked)}
              />
              Εμφάνιση διαγεγραμμένων
            </label>
          </div>
        </div>

        {err && (
          <div className="mb-2 text-sm text-red-600 border border-red-200 bg-red-50 px-3 py-2 rounded-lg">
            {err}
          </div>
        )}

        {/* Table */}
        <div className="bg-white rounded-xl shadow overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-100 text-gray-700">
              <tr>
                <th className="text-left px-4 py-2">Τίτλος</th>
                <th className="text-left px-4 py-2">Διεύθυνση</th>
                <th className="text-left px-4 py-2">Ενοίκιο</th>
                <th className="text-left px-4 py-2">Κατάσταση</th>
                <th className="text-left px-4 py-2">Ενέργειες</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({ length: pageSize }).map((_, i) => (
                  <tr key={i}><td className="px-4 py-3" colSpan={5}>
                    <div className="h-4 bg-gray-100 animate-pulse rounded" />
                  </td></tr>
                ))
              ) : filtered.length === 0 ? (
                <tr><td className="px-4 py-6 text-gray-500" colSpan={5}>Δεν βρέθηκαν properties.</td></tr>
              ) : (
                filtered.map((p) => (
                  <tr key={p._id} className="border-t">
                    <td className="px-4 py-3">{p.title || "-"}</td>
                    <td className="px-4 py-3">{p.address || "-"}</td>
                    <td className="px-4 py-3">{typeof p.rent === 'number' ? `${p.rent}€` : "-"}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-1 rounded text-xs ${p.deletedAt ? "bg-red-100 text-red-700" : "bg-green-100 text-green-700"}`}>
                        {p.deletedAt ? "Deleted" : "Active"}
                      </span>
                    </td>
                    <td className="px-4 py-3 flex gap-2">
                      {p.deletedAt ? (
                        <button onClick={() => onRestore(p._id)} className="text-sm border rounded-xl px-3 py-1">Restore</button>
                      ) : (
                        <button onClick={() => onDelete(p._id)} className="text-sm border rounded-xl px-3 py-1">Soft delete</button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination footer */}
        <div className="flex items-center justify-between text-sm">
          <div>
            Σελίδα {page} από {totalPages} • {total} εγγραφές
          </div>
          <div className="flex items-center gap-3">
            <button
              className="border rounded-xl px-3 py-1 disabled:opacity-50"
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
            >
              Προηγούμενη
            </button>
            <button
              className="border rounded-xl px-3 py-1 disabled:opacity-50"
              disabled={page >= totalPages}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            >
              Επόμενη
            </button>
            <select
              className="border rounded-xl px-2 py-1"
              value={pageSize}
              onChange={(e) => { setPageSize(Number(e.target.value)); setPage(1); }}
            >
              <option value={5}>5/σελίδα</option>
              <option value={10}>10/σελίδα</option>
              <option value={20}>20/σελίδα</option>
            </select>
          </div>
        </div>
      </main>
    </div>
  );
}
