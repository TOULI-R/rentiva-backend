import { useEffect, useState } from 'react';
import { listProperties, delProperty, restoreProperty, me } from '../lib/api';

type Property = {
  _id: string;
  title: string;
  address: string;
  rent: number;
  status: 'available' | 'rented' | 'maintenance';
  deletedAt?: string | null;
};

export default function Properties() {
  const [items, setItems] = useState<Property[]>([]);
  const [err, setErr] = useState<string | null>(null);

  const load = async () => {
    setErr(null);
    try {
      await me(); // validate token
      const data = await listProperties();
      setItems(data);
    } catch (e: any) {
      setErr(e.message || 'Failed to load');
    }
  };

  useEffect(() => { load(); }, []);

  const doDel = async (id: string) => { await delProperty(id); await load(); };
  const doRestore = async (id: string) => { await restoreProperty(id); await load(); };

  return (
    <div className="app-container py-6">
      <h1 className="text-2xl font-bold mb-4">Properties</h1>
      {err && <div className="text-red-600">{err}</div>}

      <div className="space-y-2">
        {items.map(p => (
          <div key={p._id} className="border rounded p-3 flex items-center justify-between">
            <div>
              <div className="font-semibold">{p.title} – {p.address}</div>
              <div className="text-sm text-gray-600">€{p.rent} / status: {p.status}</div>
              {p.deletedAt && (
                <div className="text-xs text-orange-600">
                  deleted: {new Date(p.deletedAt).toLocaleString()}
                </div>
              )}
            </div>
            <div className="flex gap-2">
              {!p.deletedAt
                ? <button onClick={()=>doDel(p._id)} className="px-3 py-1 rounded border">Soft-delete</button>
                : <button onClick={()=>doRestore(p._id)} className="px-3 py-1 rounded border">Restore</button>}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
