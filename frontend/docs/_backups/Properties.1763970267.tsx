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

function normalize(res: any): Property[] {
  if (!res) return [];
  if (Array.isArray(res)) return res as Property[];
  if (Array.isArray(res.items)) return res.items as Property[];
  if (Array.isArray(res.data)) return res.data as Property[];
  return [];
}

export default function Properties() {
  // data
  const [items, setItems] = useState<Property[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  // filters / search
  const [q, setQ] = useState("");
  const [includeDeleted, setIncludeDeleted] = useState(false);

  // add form
  const [newTitle, setNewTitle] = useState("");
  const [newAddress, setNewAddress] = useState("");
  const [newRent, setNewRent] = useState<string>("");

  // client-side pagination
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(5);

  const fetchList = async () => {
    setLoading(true);
    setErr(null);
    try {
      const res = await api.listProperties({ includeDeleted });
      setItems(normalize(res));
    } catch (e: any) {
      setErr(e?.message || "Αποτυχία φόρτωσης.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchList();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [includeDeleted]);

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

  const onAdd = async () => {
    if (!newTitle.trim()) {
      alert("Ο τίτλος είναι υποχρεωτικός.");
      return;
    }
    const rentNumber =
      newRent.trim() === "" ? undefined : Number(newRent.trim());
    if (rentNumber !== undefined && Number.isNaN(rentNumber)) {
      alert("Το ενοίκιο πρέπει να είναι αριθμός.");
      return;
    }

    try {
      await api.createProperty({
        title: newTitle.trim(),
        address: newAddress.trim() || undefined,
        rent: rentNumber, // ΠΡΟΣΟΧΗ: χρησιμοποιούμε rent (όχι price)
      });
      setNewTitle("");
      setNewAddress("");
      setNewRent("");
      fetchList();
    } catch (e: any) {
      alert(e?.message || "Αποτυχία δημιουργίας.");
    }
  };

  const filtered = useMemo(() => {
    if (!q.trim()) return items;
    const needle = q.trim().toLowerCase();
    return items.filter(
      (p) =>
        p.title?.toLowerCase().includes(needle) ||
        p.address?.toLowerCase().includes(needle)
    );
  }, [items, q]);

  // reset σελίδα όταν αλλάζουν δεδομένα/αναζήτηση
  useEffect(() => {
    setPage(1);
  }, [q, items]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const start = (currentPage - 1) * pageSize;
  const pageItems = filtered.slice(start, start + pageSize);

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <main className="mx-auto max-w-5xl px-4 py-6 space-y-6">
        {/* Add form */}
        <div className="bg-white p-4 rounded-xl shadow space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
            <label className="text-sm">
              Τίτλος *
              <input
                className="mt-1 w-full border rounded-xl px-3 py-2"
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                placeholder="π.χ. Διαμέρισμα Κέντρο"
              />
            </label>
            <label className="text-sm">
              Διεύθυνση
              <input
                className="mt-1 w-full border rounded-xl px-3 py-2"
                value={newAddress}
                onChange={(e) => setNewAddress(e.target.value)}
                placeholder="π.χ. Πανεπιστημίου 10"
              />
            </label>
            <label className="text-sm">
              Ενοίκιο (€)
              <input
                className="mt-1 w-full border rounded-xl px-3 py-2"
                value={newRent}
                onChange={(e) => setNewRent(e.target.value)}
                placeholder="700"
              />
            </label>
            <div className="flex items-end">
              <button
                type="button"
                onClick={onAdd}
                className="w-full border rounded-xl px-4 py-2 bg-black text-white"
              >
                Προσθήκη
              </button>
            </div>
          </div>
        </div>

        {/* Search + deleted toggle */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <h2 className="text-xl font-semibold">Properties</h2>
          <div className="flex items-center gap-3">
            <input
              placeholder="Αναζήτηση τίτλου/διεύθυνσης..."
              className="border rounded-xl px-3 py-2 w-64"
              value={q}
              onChange={(e) => setQ(e.target.value)}
            />
            <button className="border rounded-xl px-3 py-2" onClick={fetchList}>
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
          <div className="text-sm text-red-600 border border-red-200 bg-red-50 px-3 py-2 rounded-lg">
            {err}
          </div>
        )}

        {/* Table */}
        <div className="bg-white rounded-xl shadow overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="text-left text-sm text-gray-500">
                <th className="px-4 py-3">Τίτλος</th>
                <th className="px-4 py-3">Διεύθυνση</th>
                <th className="px-4 py-3">Ενοίκιο</th>
                <th className="px-4 py-3">Κατάσταση</th>
                <th className="px-4 py-3">Ενέργειες</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i}>
                    <td className="px-4 py-3" colSpan={5}>
                      <div className="h-6 bg-gray-100 rounded animate-pulse" />
                    </td>
                  </tr>
                ))
              ) : pageItems.length === 0 ? (
                <tr>
                  <td className="px-4 py-6 text-sm text-gray-500" colSpan={5}>
                    Δεν βρέθηκαν properties.
                  </td>
                </tr>
              ) : (
                pageItems.map((p) => (
                  <tr key={p._id} className="border-t">
                    <td className="px-4 py-3">{p.title || "-"}</td>
                    <td className="px-4 py-3">{p.address || "-"}</td>
                    <td className="px-4 py-3">
                      {p.rent !== undefined && p.rent !== null
                        ? `${p.rent.toLocaleString("el-GR")}€`
                        : "-"}
                    </td>
                    <td className="px-4 py-3">
                      {p.deletedAt ? (
                        <span className="text-xs px-2 py-1 rounded-full bg-red-100 text-red-700">
                          Deleted
                        </span>
                      ) : (
                        <span className="text-xs px-2 py-1 rounded-full bg-green-100 text-green-700">
                          Active
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 space-x-2">
                      {p.deletedAt ? (
                        <button
                          className="text-sm px-3 py-1 rounded-xl border"
                          onClick={() => onRestore(p._id)}
                        >
                          Restore
                        </button>
                      ) : (
                        <button
                          className="text-sm px-3 py-1 rounded-xl border"
                          onClick={() => onDelete(p._id)}
                        >
                          Soft delete
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination controls */}
        <div className="flex items-center justify-between">
          <div className="text-sm text-gray-600">
            Σελίδα {currentPage} από {totalPages} •{" "}
            {filtered.length} εγγραφές
          </div>
          <div className="flex items-center gap-2">
            <button
              className="px-3 py-1.5 border rounded-xl disabled:opacity-50"
              disabled={currentPage <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
            >
              ‹ Προηγούμενη
            </button>
            <button
              className="px-3 py-1.5 border rounded-xl disabled:opacity-50"
              disabled={currentPage >= totalPages}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            >
              Επόμενη ›
            </button>
            <select
              className="ml-2 border rounded-xl px-2 py-1"
              value={pageSize}
              onChange={(e) => {
                const n = Number(e.target.value) || 5;
                setPageSize(n);
                setPage(1);
              }}
            >
              {[5, 10, 20, 50].map((n) => (
                <option key={n} value={n}>
                  {n}/σελίδα
                </option>
              ))}
            </select>
          </div>
        </div>
      </main>
    </div>
  );
}
