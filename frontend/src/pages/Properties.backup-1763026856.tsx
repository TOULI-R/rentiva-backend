import { useEffect, useMemo, useState } from "react";
import Header from "../components/Header";
import api from "../lib/api";

interface Property {
  _id: string;
  title?: string;
  address?: string;
  rent?: number;
  price?: number;
  deletedAt?: string | null;
}

function normalizeProperties(res: any): Property[] {
  if (!res) return [];
  if (Array.isArray(res)) return res as Property[];
  if (Array.isArray(res.items)) return res.items as Property[];
  if (Array.isArray(res.data)) return res.data as Property[];
  return [];
}

function rentOf(p: Property): number | undefined {
  if (typeof p.rent === "number") return p.rent;
  if (typeof p.price === "number") return p.price;
  return undefined;
}

export default function Properties() {
  const [items, setItems] = useState<Property[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [q, setQ] = useState("");
  const [includeDeleted, setIncludeDeleted] = useState(false);

  // add form
  const [newTitle, setNewTitle] = useState("");
  const [newAddress, setNewAddress] = useState("");
  const [newPrice, setNewPrice] = useState("");

  // edit form
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editAddress, setEditAddress] = useState("");
  const [editPrice, setEditPrice] = useState("");

  // sorting
  const [sortKey, setSortKey] = useState<"title" | "rent">("title");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");

  // pagination
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const fetchList = async () => {
    setLoading(true);
    setErr(null);
    try {
      const res = await api.listProperties({ includeDeleted });
      setItems(normalizeProperties(res));
    } catch (e: any) {
      setErr(e?.message || "Αποτυχία φόρτωσης.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchList(); /* eslint-disable-next-line */ }, [includeDeleted]);
  useEffect(() => { setPage(1); }, [q, includeDeleted]);

  const onDelete = async (id: string) => {
    if (!confirm("Να γίνει soft delete;")) return;
    try { await api.delProperty(id); fetchList(); }
    catch (e: any) { alert(e?.message || "Αποτυχία διαγραφής."); }
  };

  const onRestore = async (id: string) => {
    try { await api.restoreProperty(id); fetchList(); }
    catch (e: any) { alert(e?.message || "Αποτυχία restore."); }
  };

  const onAdd = async () => {
    if (!newTitle.trim()) { setErr("Ο τίτλος είναι υποχρεωτικός."); return; }
    const n = newPrice.trim()==="" ? undefined : Number(newPrice.trim());
    if (n!==undefined && Number.isNaN(n)) { setErr("Η τιμή πρέπει να είναι αριθμός."); return; }
    try {
      await api.createProperty({ title:newTitle.trim(), address:newAddress.trim()||undefined, rent:n, price:n });
      setNewTitle(""); setNewAddress(""); setNewPrice(""); fetchList();
    } catch (e: any) { setErr(e?.message || "Αποτυχία δημιουργίας."); }
  };

  const startEdit = (p: Property) => {
    setEditingId(p._id);
    setEditTitle(p.title || "");
    setEditAddress(p.address || "");
    const r = rentOf(p);
    setEditPrice(r!==undefined && !Number.isNaN(r) ? String(r) : "");
  };
  const cancelEdit = () => { setEditingId(null); setEditTitle(""); setEditAddress(""); setEditPrice(""); };
  const saveEdit = async () => {
    if (!editingId) return;
    if (!editTitle.trim()) { setErr("Ο τίτλος είναι υποχρεωτικός."); return; }
    const n = editPrice.trim()==="" ? undefined : Number(editPrice.trim());
    if (n!==undefined && Number.isNaN(n)) { setErr("Η τιμή πρέπει να είναι αριθμός."); return; }
    try {
      await api.updateProperty(editingId, { title:editTitle.trim(), address:editAddress.trim()||undefined, rent:n, price:n });
      cancelEdit(); fetchList();
    } catch (e:any) { setErr(e?.message || "Αποτυχία ενημέρωσης."); }
  };

  // filter
  const filtered = useMemo(() => {
    if (!q.trim()) return items;
    const needle = q.trim().toLowerCase();
    return items.filter(p =>
      p.title?.toLowerCase().includes(needle) ||
      p.address?.toLowerCase().includes(needle)
    );
  }, [items, q]);

  // sort
  const sorted = useMemo(() => {
    const arr = filtered.slice();
    arr.sort((a,b) => {
      const dir = sortDir==="asc" ? 1 : -1;
      if (sortKey==="title") {
        return (a.title||"").toLowerCase().localeCompare((b.title||"").toLowerCase()) * dir;
      }
      const ar = rentOf(a); const br = rentOf(b);
      const av = ar===undefined ? (sortDir==="asc"?Infinity:-Infinity) : ar;
      const bv = br===undefined ? (sortDir==="asc"?Infinity:-Infinity) : br;
      return (av-bv) * dir;
    });
    return arr;
  }, [filtered, sortKey, sortDir]);

  // pagination calculations
  const total = sorted.length;
  const pageCount = Math.max(1, Math.ceil(total / pageSize));
  const currentPage = Math.min(page, pageCount);
  const start = (currentPage - 1) * pageSize;
  const pageItems = sorted.slice(start, start + pageSize);

  const toggleSort = (key:"title"|"rent") => {
    if (sortKey===key) setSortDir(d=>d==="asc"?"desc":"asc");
    else { setSortKey(key); setSortDir("asc"); }
  };
  const sortArrow = (key:"title"|"rent") =>
    sortKey===key ? (sortDir==="asc"?"↑":"↓") : "↕";

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <main className="mx-auto max-w-5xl px-4 py-6 space-y-6">
        {/* Add form */}
        <section className="bg-white p-4 rounded-xl shadow flex flex-col sm:flex-row gap-3 sm:items-end">
          <div className="flex-1">
            <label className="block text-sm text-gray-700">Τίτλος *
              <input className="mt-1 w-full border rounded-xl px-3 py-2"
                     value={newTitle} onChange={e=>setNewTitle(e.target.value)}
                     placeholder="π.χ. Διαμέρισμα Κέντρο"/>
            </label>
          </div>
          <div className="flex-1">
            <label className="block text-sm text-gray-700">Διεύθυνση
              <input className="mt-1 w-full border rounded-xl px-3 py-2"
                     value={newAddress} onChange={e=>setNewAddress(e.target.value)}
                     placeholder="π.χ. Πανεπιστημίου 10"/>
            </label>
          </div>
          <div className="w-32">
            <label className="block text-sm text-gray-700">Ενοίκιο (€)
              <input className="mt-1 w-full border rounded-xl px-3 py-2"
                     value={newPrice} onChange={e=>setNewPrice(e.target.value)}
                     placeholder="700"/>
            </label>
          </div>
          <button type="button" onClick={onAdd}
                  className="whitespace-nowrap border rounded-xl px-4 py-2 bg-black text-white">Προσθήκη</button>
        </section>

        {/* Search + filters */}
        <section className="flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between">
          <h2 className="text-xl font-semibold">Properties</h2>
          <div className="flex items-center gap-3">
            <input className="border rounded-xl px-3 py-2 w-64"
                   placeholder="Αναζήτηση τίτλου/διεύθυνσης..."
                   value={q} onChange={e=>setQ(e.target.value)} />
            <button className="border rounded-xl px-3 py-2" onClick={fetchList}>Αναζήτηση</button>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={includeDeleted}
                     onChange={e=>setIncludeDeleted(e.target.checked)} />
              Εμφάνιση διαγεγραμμένων
            </label>
          </div>
        </section>

        {/* Counter + pagination controls */}
        <section className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <p className="text-sm text-gray-600">
            Εγγραφές: {total}{total>0?` — Σελίδα ${currentPage} από ${pageCount}`:''}
          </p>
          <div className="flex items-center gap-2">
            <label className="text-sm">Ανά σελίδα</label>
            <select value={pageSize} onChange={e=>{setPageSize(Number(e.target.value)); setPage(1);}}
                    className="border rounded-xl px-2 py-1">
              <option value={5}>5</option><option value={10}>10</option>
              <option value={20}>20</option><option value={50}>50</option>
            </select>
            <button className="border rounded-xl px-3 py-1 text-sm disabled:opacity-50"
                    onClick={()=>setPage(1)} disabled={currentPage===1||total===0}>« Πρώτη</button>
            <button className="border rounded-xl px-3 py-1 text-sm disabled:opacity-50"
                    onClick={()=>setPage(p=>Math.max(1,p-1))} disabled={currentPage===1||total===0}>‹ Προηγ.</button>
            <span className="px-2 text-sm">Σελίδα {currentPage}/{pageCount}</span>
            <button className="border rounded-xl px-3 py-1 text-sm disabled:opacity-50"
                    onClick={()=>setPage(p=>Math.min(pageCount,p+1))} disabled={currentPage===pageCount||total===0}>Επόμ. ›</button>
            <button className="border rounded-xl px-3 py-1 text-sm disabled:opacity-50"
                    onClick={()=>setPage(pageCount)} disabled={currentPage===pageCount||total===0}>Τελευταία »</button>
          </div>
        </section>

        {err && <div className="mb-2 text-sm text-red-700 border border-red-200 bg-red-50 px-3 py-2 rounded-lg">{err}</div>}

        {loading ? (
          <div className="grid gap-3">{Array.from({length:5}).map((_,i)=>
            <div key={i} className="h-14 bg-white rounded-xl shadow animate-pulse" />)}</div>
        ) : total===0 ? (
          <div className="px-4 py-8 text-center text-gray-500 bg-white rounded-xl shadow">Δεν βρέθηκαν properties.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full bg-white rounded-xl shadow">
              <thead>
                <tr className="text-left text-sm text-gray-600">
                  <th className="px-4 py-3">
                    <button className="hover:underline" onClick={()=>toggleSort("title")}>
                      Τίτλος {sortArrow("title")}
                    </button>
                  </th>
                  <th className="px-4 py-3">Διεύθυνση</th>
                  <th className="px-4 py-3">
                    <button className="hover:underline" onClick={()=>toggleSort("rent")}>
                      Ενοίκιο {sortArrow("rent")}
                    </button>
                  </th>
                  <th className="px-4 py-3">Κατάσταση</th>
                  <th className="px-4 py-3 text-right">Ενέργειες</th>
                </tr>
              </thead>
              <tbody>
                {pageItems.map(p=>{
                  const isDeleted = !!p.deletedAt;
                  const isEditing = editingId===p._id && !isDeleted;
                  const r = rentOf(p);
                  return (
                    <tr key={p._id} className="border-t">
                      <td className="px-4 py-3">
                        {isEditing ? (
                          <input className="w-full border rounded-xl px-2 py-1 text-sm"
                                 value={editTitle} onChange={e=>setEditTitle(e.target.value)} />
                        ) : (p.title || "-")}
                      </td>
                      <td className="px-4 py-3">
                        {isEditing ? (
                          <input className="w-full border rounded-xl px-2 py-1 text-sm"
                                 value={editAddress} onChange={e=>setEditAddress(e.target.value)} />
                        ) : (p.address || "-")}
                      </td>
                      <td className="px-4 py-3">
                        {isEditing ? (
                          <input className="w-24 border rounded-xl px-2 py-1 text-sm"
                                 value={editPrice} onChange={e=>setEditPrice(e.target.value)} />
                        ) : r!==undefined ? `${r}€` : "-"}
                      </td>
                      <td className="px-4 py-3">
                        {isDeleted ? (
                          <span className="text-xs px-2 py-1 rounded-full border border-red-300 bg-red-50">Deleted</span>
                        ) : (
                          <span className="text-xs px-2 py-1 rounded-full border border-emerald-300 bg-emerald-50">Active</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right space-x-2">
                        {isDeleted ? (
                          <button className="text-sm px-3 py-1.5 rounded-xl border hover:bg-gray-50"
                                  onClick={()=>onRestore(p._id)}>Restore</button>
                        ) : isEditing ? (
                          <>
                            <button className="text-sm px-3 py-1.5 rounded-xl border hover:bg-gray-50" onClick={saveEdit}>Save</button>
                            <button className="text-sm px-3 py-1.5 rounded-xl border hover:bg-gray-50" onClick={cancelEdit}>Cancel</button>
                          </>
                        ) : (
                          <>
                            <button className="text-sm px-3 py-1.5 rounded-xl border hover:bg-gray-50" onClick={()=>startEdit(p)}>Edit</button>
                            <button className="text-sm px-3 py-1.5 rounded-xl border hover:bg-gray-50" onClick={()=>onDelete(p._id)}>Soft delete</button>
                          </>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </main>
    </div>
  );
}
