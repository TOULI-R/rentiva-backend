import { useMemo, useState } from "react";
import { useParams, Link } from "react-router-dom";
import api, { storage, type TenantAnswersV1, type UserRole } from "../lib/api";

type TenantAnswers = {
  smoking: "yes" | "no";
  pets: "yes" | "no";
  usage: string[];
  quietHoursAfter: number;
  occupants: number;
};

type Conflict = {
  key?: string;
  penalty?: number;
  severity?: string;
  message?: string;
};

type CompatibilityResult = {
  score: number;
  conflicts: Conflict[];
  breakdown?: Record<
    string,
    {
      penalty?: number;
      severity?: string;
      message?: string;
      ownerValue?: any;
      tenantValue?: any;
    }
  >;
};

const API_BASE = (import.meta as any).env?.VITE_API_BASE || "http://localhost:5001/api";

const USAGE_OPTIONS: Array<{ key: string; label: string }> = [
  { key: "family", label: "Οικογένεια" },
  { key: "remote_work", label: "Τηλεργασία" },
  { key: "students", label: "Φοιτητές" },
  { key: "single", label: "Μόνος/η" },
  { key: "couple", label: "Ζευγάρι" },
  { key: "shared", label: "Συγκατοίκηση" },
];

function clampInt(n: number, min: number, max: number) {
  const x = Math.trunc(n);
  if (!Number.isFinite(x)) return min;
  return Math.max(min, Math.min(max, x));
}

function toYN(v: any): "yes" | "no" | null {
  if (v === "yes" || v === true) return "yes";
  if (v === "no" || v === false) return "no";
  return null;
}

export default function PublicCompatibility() {
  const { shareKey } = useParams();

  const [answers, setAnswers] = useState<TenantAnswers>({
    smoking: "no",
    pets: "no",
    usage: ["family"],
    quietHoursAfter: 22,
    occupants: 2,
  });

  const [loading, setLoading] = useState(false);
  const [passportLoading, setPassportLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [result, setResult] = useState<CompatibilityResult | null>(null);

  const shareKeySafe = useMemo(() => (shareKey || "").trim(), [shareKey]);
  const shareKeyLooksOk = /^[a-f0-9]{32}$/i.test(shareKeySafe);

  const token = storage.getToken();
  const [roleHint, setRoleHint] = useState<UserRole>(null); // lazy (we'll fetch only when needed)

  const onToggleUsage = (key: string) => {
    setAnswers((prev) => {
      const set = new Set(prev.usage);
      if (set.has(key)) set.delete(key);
      else set.add(key);
      const usage = Array.from(set).slice(0, 10);
      return { ...prev, usage };
    });
  };

  const submit = async (override?: TenantAnswers) => {
    setErr(null);
    setResult(null);

    if (!shareKeyLooksOk) {
      setErr("Το link δεν φαίνεται σωστό (shareKey). Ζήτα νέο link από τον ιδιοκτήτη.");
      return;
    }

    const base = override ?? answers;

    const payload: TenantAnswers = {
      ...base,
      quietHoursAfter: clampInt(base.quietHoursAfter, 0, 23),
      occupants: clampInt(base.occupants, 1, 20),
    };

    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/public/compatibility/${shareKeySafe}`, {
        method: "POST",
        headers: { "Content-Type": "application/json; charset=utf-8" },
        body: JSON.stringify(payload),
      });

      const text = await res.text();
      let data: any = null;
      try {
        data = text ? JSON.parse(text) : null;
      } catch {
        /* ignore */
      }

      if (!res.ok) {
        const msg = data?.error || `Σφάλμα (${res.status})`;
        throw new Error(msg);
      }

      setResult(data as CompatibilityResult);
    } catch (e: any) {
      setErr(e?.message || "Κάτι πήγε στραβά.");
    } finally {
      setLoading(false);
    }
  };

  const runWithPassport = async () => {
    setErr(null);
    setResult(null);

    if (!token) {
      setErr("Για “Με το Διαβατήριό μου” πρέπει να είσαι συνδεδεμένος ως ενοικιαστής.");
      return;
    }

    setPassportLoading(true);
    try {
      // check role (cheap guard). If it fails, we still show a useful message.
      try {
        const me = await api.me();
        const r = (me?.role ?? null) as UserRole;
        setRoleHint(r);
        if (r !== "tenant") {
          setErr("Το “Με το Διαβατήριό μου” είναι διαθέσιμο μόνο για ρόλο Ενοικιαστής.");
          return;
        }
      } catch {
        // ignore, continue (we'll try tenantMe anyway)
      }

      const p = await api.tenantMe();
      const ta = (p?.tenantAnswers || {}) as TenantAnswersV1;

      const smoking = toYN((ta as any).smoking) ?? answers.smoking;
      const pets = toYN((ta as any).pets) ?? answers.pets;

      const allowed = new Set(USAGE_OPTIONS.map((x) => x.key));
      const usageRaw = Array.isArray((ta as any).usage) ? (ta as any).usage : [];
      const usage = usageRaw.map(String).filter((k: string) => allowed.has(k));
      const usageFinal = usage.length ? usage.slice(0, 10) : answers.usage;

      const qha =
        typeof (ta as any).quietHoursAfter === "number" && !Number.isNaN((ta as any).quietHoursAfter)
          ? clampInt((ta as any).quietHoursAfter, 0, 23)
          : answers.quietHoursAfter;

      const occ =
        typeof (ta as any).occupants === "number" && !Number.isNaN((ta as any).occupants)
          ? clampInt((ta as any).occupants, 1, 20)
          : answers.occupants;

      const next: TenantAnswers = { smoking, pets, usage: usageFinal, quietHoursAfter: qha, occupants: occ };

      // show in UI
      setAnswers(next);

      // run immediately
      await submit(next);
    } catch (e: any) {
      setErr(e?.message || "Αποτυχία φόρτωσης Διαβατηρίου Ενοικιαστή.");
    } finally {
      setPassportLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-2xl mx-auto p-4">
        <div className="flex items-center justify-between gap-3">
          <h1 className="text-xl font-semibold">Ταιριάζουμε;</h1>

          <div className="flex items-center gap-3">
            {token ? (
              <Link className="text-sm text-slate-600 hover:underline" to="/tenant">
                Πίσω στο Διαβατήριο
              </Link>
            ) : (
              <Link className="text-sm text-slate-600 hover:underline" to="/login">
                Login
              </Link>
            )}
          </div>
        </div>

        <p className="mt-2 text-sm text-slate-700">
          Συμπλήρωσε 30” και πάρε <b>match score</b> πριν πάτε σε ραντεβού. Τα στοιχεία εδώ είναι ανώνυμα — δεν ζητάμε όνομα,
          τηλέφωνο, ΑΦΜ, ούτε “το όνομα της γάτας”.
        </p>

        {!shareKeyLooksOk && (
          <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
            Προσοχή: το link φαίνεται άκυρο. (<span className="font-mono">{shareKeySafe || "—"}</span>)
          </div>
        )}

        <div className="mt-4 rounded-xl bg-white shadow p-4">
          <h2 className="font-medium">Συνήθειες ενοικιαστή</h2>

          {/* 1-click passport */}
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={runWithPassport}
              disabled={passportLoading || loading}
              className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium hover:bg-slate-50 disabled:opacity-60"
              title="Θα τραβήξει τις απαντήσεις από το Tenant Passport και θα τρέξει το test"
            >
              {passportLoading ? "Φορτώνω διαβατήριο…" : "Με το Διαβατήριό μου"}
            </button>

            {token && roleHint && (
              <span className="text-xs text-slate-500">
                Συνδεδεμένος ως: <b>{roleHint === "tenant" ? "Ενοικιαστής" : roleHint === "owner" ? "Ιδιοκτήτης" : "—"}</b>
              </span>
            )}
          </div>

          <div className="mt-3 grid gap-4">
            <div>
              <div className="text-sm font-medium text-slate-700">Κάπνισμα</div>
              <div className="mt-2 flex gap-3">
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="radio"
                    name="smoking"
                    checked={answers.smoking === "no"}
                    onChange={() => setAnswers((p) => ({ ...p, smoking: "no" }))}
                  />
                  Όχι
                </label>
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="radio"
                    name="smoking"
                    checked={answers.smoking === "yes"}
                    onChange={() => setAnswers((p) => ({ ...p, smoking: "yes" }))}
                  />
                  Ναι
                </label>
              </div>
            </div>

            <div>
              <div className="text-sm font-medium text-slate-700">Κατοικίδια</div>
              <div className="mt-2 flex gap-3">
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="radio"
                    name="pets"
                    checked={answers.pets === "no"}
                    onChange={() => setAnswers((p) => ({ ...p, pets: "no" }))}
                  />
                  Όχι
                </label>
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="radio"
                    name="pets"
                    checked={answers.pets === "yes"}
                    onChange={() => setAnswers((p) => ({ ...p, pets: "yes" }))}
                  />
                  Ναι
                </label>
              </div>
            </div>

            <div>
              <div className="text-sm font-medium text-slate-700">Τύπος χρήσης</div>
              <div className="mt-2 flex flex-wrap gap-2">
                {USAGE_OPTIONS.map((u) => {
                  const active = answers.usage.includes(u.key);
                  return (
                    <button
                      key={u.key}
                      type="button"
                      onClick={() => onToggleUsage(u.key)}
                      className={
                        "px-3 py-1.5 rounded-full text-sm border " +
                        (active
                          ? "bg-slate-900 text-white border-slate-900"
                          : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50")
                      }
                    >
                      {u.label}
                    </button>
                  );
                })}
              </div>
              <div className="mt-1 text-xs text-slate-500">Διάλεξε ό,τι σε περιγράφει (1–3 είναι συνήθως αρκετά).</div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <div className="text-sm font-medium text-slate-700">Ώρα ησυχίας μετά τις</div>
                <select
                  className="mt-2 w-full rounded-lg border border-slate-200 bg-white p-2 text-sm"
                  value={answers.quietHoursAfter}
                  onChange={(e) =>
                    setAnswers((p) => ({ ...p, quietHoursAfter: clampInt(Number(e.target.value), 0, 23) }))
                  }
                >
                  {Array.from({ length: 24 }).map((_, h) => (
                    <option key={h} value={h}>
                      {String(h).padStart(2, "0")}:00
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <div className="text-sm font-medium text-slate-700">Άτομα</div>
                <input
                  className="mt-2 w-full rounded-lg border border-slate-200 bg-white p-2 text-sm"
                  type="number"
                  min={1}
                  max={20}
                  value={answers.occupants}
                  onChange={(e) => setAnswers((p) => ({ ...p, occupants: clampInt(Number(e.target.value), 1, 20) }))}
                />
              </div>
            </div>

            <button
              type="button"
              disabled={loading || passportLoading}
              onClick={() => submit()}
              className="mt-2 rounded-xl bg-slate-900 text-white py-2.5 text-sm font-medium disabled:opacity-60"
            >
              {loading ? "Υπολογίζω…" : "Υπολόγισε συμβατότητα"}
            </button>

            {err && (
              <div className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-900">{err}</div>
            )}

            {result && (
              <div className="rounded-xl border border-slate-200 p-4">
                <div className="flex items-center justify-between">
                  <div className="text-sm text-slate-600">Match score</div>
                  <div className="text-2xl font-semibold">{result.score}%</div>
                </div>

                <div className="mt-3">
                  <div className="text-sm font-medium">Πιθανές συγκρούσεις</div>
                  {(result.conflicts || []).length === 0 ? (
                    <div className="mt-1 text-sm text-emerald-700">Καμία σύγκρουση. (Σπάνιο. Μην το ματιάσεις.)</div>
                  ) : (
                    <ul className="mt-2 list-disc pl-5 text-sm text-slate-800">
                      {(result.conflicts || []).slice(0, 10).map((c, i) => (
                        <li key={i}>
                          <span className="font-medium">{c.key || "issue"}:</span> {c.message || "—"}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>

                {result.breakdown && (
                  <div className="mt-4">
                    <div className="text-sm font-medium">Ανάλυση</div>
                    <div className="mt-2 grid gap-2">
                      {Object.entries(result.breakdown).map(([k, v]) => (
                        <div key={k} className="rounded-lg bg-slate-50 p-3 text-sm">
                          <div className="flex items-center justify-between">
                            <div className="font-medium">{k}</div>
                            <div className="text-slate-600">
                              {v.severity || "—"}
                              {typeof v.penalty === "number" ? ` (-${v.penalty})` : ""}
                            </div>
                          </div>
                          <div className="mt-1 text-slate-700">{v.message || "—"}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        <div className="mt-4 text-xs text-slate-500">Σημείωση: Το αποτέλεσμα είναι “compatibility check”, όχι γάμος. (Ακόμα.)</div>
      </div>
    </div>
  );
}
