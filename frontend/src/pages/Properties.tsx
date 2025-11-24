import { useEffect, useState } from "react";
import Header from "../components/Header";
import api from "../lib/api";

interface Property {
  _id: string;
  title?: string;
  address?: string;
  rent?: number;
  deletedAt?: string | null;
}

export default function Properties() {
  // data
  const [items, setItems] = useState<Property[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [err, setErr] = useState<string | null>(null);

  // filters – controls
  const [q, setQ] = useState("");
  const [includeDeleted, setIncludeDeleted] = useState(false);

  // pagination (server-side)
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);

  // add form
  const [newTitle, setNewTitle] = useState("");
  const [newAddress, setNewAddress] = useState("");
  const [newRent, setNewRent] = useState("");

  // inline edit state
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editAddress, setEditAddress] = useState("");
  const [editRent, setEditRent] = useState("");

  async function fetchList() {
    setLoading(true);
    setErr(null);
    try {
      const res: any = await api.listProperties({
        includeDeleted,
        page,
        pageSize,
        q,
      });

      setItems((res && Array.isArray(res.items) ? res.items : []) as Property[]);
      setTotalItems(res?.totalItems ?? 0);
      setTotalPages(res?.totalPages ?? 1);
    } catch (e: any) {
      setErr(e?.message || "Αποτυχία φόρτωσης.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchList();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [includeDeleted, page, pageSize, q]);

  // actions
  const onDelete = async (id: string) => {
    if (!confirm("Να γίνει soft delete;")) return;
    try {
      await api.delProperty(id);
      await fetchList();
    } catch (e: any) {
      alert(e?.message || "Αποτυχία διαγραφής.");
    }
  };

  const onRestore = async (id: string) => {
    try {
      await api.restoreProperty(id);
      await fetchList();
    } catch (e: any) {
      alert(e?.message || "Αποτυχία restore.");
    }
  };

  const onAdd = async () => {
    if (!newTitle.trim()) {
      alert("Ο τίτλος είναι υποχρεωτικός.");
      return;
    }
    if (!newAddress.trim()) {
      alert("Η διεύθυνση είναι υποχρεωτική.");
      return;
    }
    const rentNumber =
      newRent.trim() === "" ? undefined : Number(newRent.trim());
    if (rentNumber === undefined || Number.isNaN(rentNumber)) {
      alert("Το ενοίκιο είναι υποχρεωτικό και πρέπει να είναι αριθμός.");
      return;
    }
    try {
      await api.createProperty({
        title: newTitle.trim(),
        address: newAddress.trim(),
        rent: rentNumber,
      });
      setNewTitle("");
      setNewAddress("");
      setNewRent("");
      setPage(1); // μετά τη δημιουργία, γύρνα στην 1η σελίδα
      await fetchList();
    } catch (e: any) {
      alert(e?.message || "Αποτυχία δημιουργίας.");
    }
  };

  // inline edit helpers
  const startEdit = (p: Property) => {
    setEditingId(p._id);
    setEditTitle(p.title || "");
    setEditAddress(p.address || "");
    setEditRent(
      p.rent != null && !Number.isNaN(p.rent) ? String(p.rent) : ""
    );
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditTitle("");
    setEditAddress("");
    setEditRent("");
  };

  const saveEdit = async () => {
    if (!editingId) return;

    if (!editTitle.trim()) {
      alert("Ο τίτλος είναι υποχρεωτικός.");
      return;
    }
    if (!editAddress.trim()) {
      alert("Η διεύθυνση είναι υποχρεωτική.");
      return;
    }
    if (!editRent.trim()) {
      alert("Το ενοίκιο είναι υποχρεωτικό.");
      return;
    }
    const rentNumber = Number(editRent.trim());
    if (Number.isNaN(rentNumber)) {
      alert("Το ενοίκιο πρέπει να είναι αριθμός.");
      return;
    }

    const payload = {
      title: editTitle.trim(),
      address: editAddress.trim(),
      rent: rentNumber,
    };

    try {
      await api.updateProperty(editingId, payload);
      cancelEdit();
      await fetchList();
    } catch (e: any) {
      alert(e?.message || "Αποτυχία ενημέρωσης.");
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <main className="mx-auto max-w-5xl px-4 py-6 space-y-6">
        <div className="flex flex-col gap-3">
          <h2 className="text-xl font-semibold">Properties</h2>

          {/* Add property */}
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
                Διεύθυνση *
                <input
                  className="mt-1 w-full border rounded-xl px-3 py-2"
                  value={newAddress}
                  onChange={(e) => setNewAddress(e.target.value)}
                  placeholder="π.χ. Πανεπιστημίου 10"
                />
              </label>
            </div>
            <div className="w-32">
              <label className="block text-sm text-gray-700">
                Ενοίκιο (€) *
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

          {/* Search + filters */}
          <div className="flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between">
            <div />
            <div className="flex items-center gap-3">
              <input
                placeholder="Αναζήτηση τίτλου/διεύθυνσης..."
                className="border rounded-xl px-3 py-2 w-64"
                value={q}
                onChange={(e) => {
                  setQ(e.target.value);
                  setPage(1);
                }}
              />
              <button
                className="border rounded-xl px-3 py-2"
                onClick={() => setPage(1)}
              >
                Αναζήτηση
              </button>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={includeDeleted}
                  onChange={(e) => {
                    setIncludeDeleted(e.target.checked);
                    setPage(1);
                  }}
                />
                Εμφάνιση διαγεγραμμένων
              </label>
            </div>
          </div>
        </div>

        {err && (
          <div className="mb-4 text-sm text-red-600 border border-red-200 bg-red-50 px-3 py-2 rounded-lg">
            {err}
          </div>
        )}

        {loading ? (
          <div className="grid gap-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="h-14 bg-white rounded-xl shadow animate-pulse" />
            ))}
          </div>
        ) : (
          <div className="bg-white rounded-xl shadow overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-100 text-gray-600">
                <tr>
                  <th className="text-left px-4 py-2">Τίτλος</th>
                  <th className="text-left px-4 py-2">Διεύθυνση</th>
                  <th className="text-left px-4 py-2">Ενοίκιο</th>
                  <th className="text-left px-4 py-2">Κατάσταση</th>
                  <th className="text-left px-4 py-2">Ενέργειες</th>
                </tr>
              </thead>
              <tbody>
                {items.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-6 text-gray-500">
                      Δεν βρέθηκαν properties.
                    </td>
                  </tr>
                ) : (
                  items.map((p) => {
                    const isDeleted = !!p.deletedAt;
                    const isEditing = editingId === p._id;

                    return (
                      <tr key={p._id} className="border-t">
                        <td className="px-4 py-2">
                          {isEditing ? (
                            <input
                              className="w-full border rounded-xl px-2 py-1 text-sm"
                              value={editTitle}
                              onChange={(e) => setEditTitle(e.target.value)}
                            />
                          ) : (
                            p.title || "-"
                          )}
                        </td>
                        <td className="px-4 py-2">
                          {isEditing ? (
                            <input
                              className="w-full border rounded-xl px-2 py-1 text-sm"
                              value={editAddress}
                              onChange={(e) => setEditAddress(e.target.value)}
                            />
                          ) : (
                            p.address || "-"
                          )}
                        </td>
                        <td className="px-4 py-2">
                          {isEditing ? (
                            <input
                              className="w-24 border rounded-xl px-2 py-1 text-sm"
                              value={editRent}
                              onChange={(e) => setEditRent(e.target.value)}
                            />
                          ) : p.rent != null ? (
                            `${p.rent}€`
                          ) : (
                            "-"
                          )}
                        </td>
                        <td className="px-4 py-2">
                          <span
                            className={`inline-block text-xs px-2 py-1 rounded-full ${
                              isDeleted
                                ? "bg-red-100 text-red-700"
                                : "bg-green-100 text-green-700"
                            }`}
                          >
                            {isDeleted ? "Deleted" : "Active"}
                          </span>
                        </td>
                        <td className="px-4 py-2">
                          {isEditing ? (
                            <div className="flex flex-wrap gap-2">
                              <button
                                className="text-sm px-3 py-1.5 rounded-xl border bg-black text-white"
                                onClick={saveEdit}
                              >
                                Αποθήκευση
                              </button>
                              <button
                                className="text-sm px-3 py-1.5 rounded-xl border hover:bg-gray-50"
                                onClick={cancelEdit}
                              >
                                Ακύρωση
                              </button>
                            </div>
                          ) : (
                            <div className="flex flex-wrap gap-2">
                              {isDeleted ? (
                                <button
                                  className="text-sm px-3 py-1.5 rounded-xl border hover:bg-gray-50"
                                  onClick={() => onRestore(p._id)}
                                >
                                  Restore
                                </button>
                              ) : (
                                <>
                                  <button
                                    className="text-sm px-3 py-1.5 rounded-xl border hover:bg-gray-50"
                                    onClick={() => startEdit(p)}
                                  >
                                    Edit
                                  </button>
                                  <button
                                    className="text-sm px-3 py-1.5 rounded-xl border hover:bg-gray-50"
                                    onClick={() => onDelete(p._id)}
                                  >
                                    Soft delete
                                  </button>
                                </>
                              )}
                            </div>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>

            {/* footer / pagination */}
            <div className="flex items-center justify-between px-4 py-3">
              <div className="text-sm text-gray-600">
                Σελίδα {page} από {totalPages} · {totalItems} εγγραφές
              </div>
              <div className="flex items-center gap-3">
                <button
                  className="border rounded-xl px-3 py-1.5 disabled:opacity-50"
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page <= 1}
                >
                  Προηγούμενη
                </button>
                <button
                  className="border rounded-xl px-3 py-1.5 disabled:opacity-50"
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page >= totalPages}
                >
                  Επόμενη
                </button>
                <select
                  className="border rounded-xl px-2 py-1"
                  value={pageSize}
                  onChange={(e) => {
                    setPageSize(Number(e.target.value));
                    setPage(1);
                  }}
                >
                  <option value={5}>5/σελίδα</option>
                  <option value={10}>10/σελίδα</option>
                  <option value={20}>20/σελίδα</option>
                </select>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
