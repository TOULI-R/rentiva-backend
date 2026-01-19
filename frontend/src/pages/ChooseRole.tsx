import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Header from "../components/Header";
import api, { type UserRole } from "../lib/api";
import { useNotification } from "../lib/notifications";

export default function ChooseRole() {
  const navigate = useNavigate();
  const { notifyError, notifySuccess } = useNotification();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<Exclude<UserRole, null> | null>(null);
  const [meRole, setMeRole] = useState<UserRole>(null);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const me = await api.me();
        if (cancelled) return;

        const r = (me?.role ?? null) as UserRole;
        setMeRole(r);

        // Αν έχει ήδη role, δεν έχει λόγο να είναι εδώ
        if (r === "tenant") navigate("/tenant", { replace: true });
        if (r === "owner") navigate("/properties", { replace: true });
      } catch (e: any) {
        if (!cancelled) notifyError(e?.message || "Αποτυχία φόρτωσης προφίλ.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [navigate, notifyError]);

  const pick = async (role: Exclude<UserRole, null>) => {
    if (saving) return;
    setSaving(role);
    try {
      await api.setRole(role);
      notifySuccess(role === "tenant" ? "Ρόλος: Ενοικιαστής" : "Ρόλος: Ιδιοκτήτης");

      // Redirect σε καθαρό dashboard
      if (role === "tenant") navigate("/tenant", { replace: true });
      else navigate("/properties", { replace: true });
    } catch (e: any) {
      notifyError(e?.message || "Αποτυχία αποθήκευσης ρόλου.");
    } finally {
      setSaving(null);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <main className="mx-auto max-w-3xl px-4 py-6">
        <div className="bg-white rounded-xl shadow p-4 sm:p-6">
          <h1 className="text-lg sm:text-xl font-semibold text-gray-900">
            Διάλεξε ρόλο
          </h1>
          <p className="mt-1 text-sm text-gray-600">
            Για να είναι καθαρό το app (και να μην τα κάνει όλα… σαλάτα), διάλεξε τι είσαι.
          </p>

          {loading ? (
            <div className="mt-4 h-24 rounded-xl bg-gray-100 animate-pulse" />
          ) : (
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <button
                type="button"
                onClick={() => pick("tenant")}
                disabled={!!saving}
                className="text-left rounded-xl border border-gray-200 bg-white p-4 hover:shadow-sm hover:border-gray-300 disabled:opacity-60"
              >
                <div className="text-sm font-semibold text-gray-900">Ενοικιαστής</div>
                <div className="mt-1 text-xs text-gray-600">
                  Φτιάχνεις “Διαβατήριο Ενοικιαστή”, κάνεις compatibility tests, κρατάς αιτήσεις/προτιμήσεις.
                </div>
                <div className="mt-3 text-xs font-medium text-gray-800">
                  {saving === "tenant" ? "Αποθήκευση..." : "Συνέχεια →"}
                </div>
              </button>

              <button
                type="button"
                onClick={() => pick("owner")}
                disabled={!!saving}
                className="text-left rounded-xl border border-gray-200 bg-white p-4 hover:shadow-sm hover:border-gray-300 disabled:opacity-60"
              >
                <div className="text-sm font-semibold text-gray-900">Ιδιοκτήτης</div>
                <div className="mt-1 text-xs text-gray-600">
                  Καταχωρείς ακίνητα, ορίζεις owner prefs, βγάζεις share links, βλέπεις timeline.
                </div>
                <div className="mt-3 text-xs font-medium text-gray-800">
                  {saving === "owner" ? "Αποθήκευση..." : "Συνέχεια →"}
                </div>
              </button>
            </div>
          )}

          {meRole === null && !loading && (
            <div className="mt-4 text-[11px] text-gray-500">
              * Μπορείς να το αλλάξεις αργότερα (θα προσθέσουμε “Αλλαγή ρόλου” στις ρυθμίσεις).
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
