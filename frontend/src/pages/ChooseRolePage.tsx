import { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import Header from "../components/Header";
import api, { type UserRole } from "../lib/api";
import { useNotification } from "../lib/notifications";

export default function ChooseRole() {
  const navigate = useNavigate();
  const { notifyError, notifySuccess } = useNotification();


  const [searchParams] = useSearchParams();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<Exclude<UserRole, null> | null>(null);
  const [meRole, setMeRole] = useState<UserRole>(null);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const me = await api.me();
        if (cancelled) return;
        setMeRole((me?.role ?? null) as UserRole);
      } catch (e: any) {
        if (!cancelled) notifyError(e?.message || "Αποτυχία φόρτωσης προφίλ.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [notifyError]);

  const roleLabel = useMemo(() => {
    if (meRole === "tenant") return "Ενοικιαστής";
    if (meRole === "owner") return "Ιδιοκτήτης";
    return "—";
  }, [meRole]);

  const pick = async (role: Exclude<UserRole, null>) => {
    if (saving) return;
    setSaving(role);
    try {
      await api.setRole(role);
      notifySuccess(role === "tenant" ? "Ρόλος: Ενοικιαστής" : "Ρόλος: Ιδιοκτήτης");
      const next = searchParams.get("next");
            const safeNext = next && next.startsWith("/") && !next.startsWith("//") ? next : null;
            navigate(safeNext || (role === "tenant" ? "/tenant" : "/properties"), { replace: true });
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
          <div className="flex items-start justify-between gap-3">
            <div>
              <h1 className="text-lg sm:text-xl font-semibold text-gray-900">Ρόλος λογαριασμού</h1>
              <p className="mt-1 text-sm text-gray-600">
                Διάλεξε ρόλο για να είναι καθαρό το app. (Και να μη ψάχνουμε μετά ποιος είναι ο ιδιοκτήτης… εσύ ή το ακίνητο.)
              </p>
              <div className="mt-2 text-xs text-gray-500">
                Τρέχων ρόλος: <span className="font-semibold text-gray-800">{roleLabel}</span>
              </div>
            </div>
          </div>

          {loading ? (
            <div className="mt-4 h-24 rounded-xl bg-gray-100 animate-pulse" />
          ) : (
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <button
                type="button"
                onClick={() => pick("tenant")}
                disabled={!!saving}
                className={
                  "text-left rounded-xl border bg-white p-4 hover:shadow-sm disabled:opacity-60 " +
                  (meRole === "tenant" ? "border-gray-900 ring-1 ring-gray-900" : "border-gray-200 hover:border-gray-300")
                }
              >
                <div className="text-sm font-semibold text-gray-900">Ενοικιαστής</div>
                <div className="mt-1 text-xs text-gray-600">
                  Διαβατήριο Ενοικιαστή, compatibility tests, προτιμήσεις/απαντήσεις.
                </div>
                <div className="mt-3 text-xs font-medium text-gray-800">
                  {saving === "tenant" ? "Αποθήκευση..." : meRole === "tenant" ? "Επιλεγμένο ✓" : "Επιλογή →"}
                </div>
              </button>

              <button
                type="button"
                onClick={() => pick("owner")}
                disabled={!!saving}
                className={
                  "text-left rounded-xl border bg-white p-4 hover:shadow-sm disabled:opacity-60 " +
                  (meRole === "owner" ? "border-gray-900 ring-1 ring-gray-900" : "border-gray-200 hover:border-gray-300")
                }
              >
                <div className="text-sm font-semibold text-gray-900">Ιδιοκτήτης</div>
                <div className="mt-1 text-xs text-gray-600">
                  Καταχώρηση ακινήτων, owner prefs, share links, timeline.
                </div>
                <div className="mt-3 text-xs font-medium text-gray-800">
                  {saving === "owner" ? "Αποθήκευση..." : meRole === "owner" ? "Επιλεγμένο ✓" : "Επιλογή →"}
                </div>
              </button>
            </div>
          )}

          <div className="mt-4 text-[11px] text-gray-500">
            * Μπορείς να αλλάξεις ρόλο όποτε θες από εδώ.
          </div>
        </div>
      </main>
    </div>
  );
}
