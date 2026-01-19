import { useMemo, useState } from "react";
import { useParams, Link } from "react-router-dom";

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
  { key: "remote_work", label: "Remote work" },
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
  const [err, setErr] = useState<string | null>(null);
  const [result, setResult] = useState<CompatibilityResult | null>(null);

  const shareKeySafe = useMemo(() => (shareKey || "").trim(), [shareKey]);
  const shareKeyLooksOk = /^[a-f0-9]{32}$/i.test(shareKeySafe);

  const onToggleUsage = (key: string) => {
    setAnswers((prev) => {
      const set = new Set(prev.usage);
      if (set.has(key)) set.delete(key);
      else set.add(key);
      const usage = Array.from(set).slice(0, 10);
      return { ...prev, usage };
    });
  };

  const submit = async () => {
    setErr(null);
    setResult(null);

    if (!shareKeyLooksOk) {
      setErr("Το link δεν φαίνεται σωστό (shareKey). Ζήτα νέο link από τον ιδιοκτήτη.");
      return;
    }

    const payload: TenantAnswers = {
      ...answers,
      quietHoursAfter: clampInt(answers.quietHoursAfter, 0, 23),
      occupants: clampInt(answers.occupants, 1, 20),
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
      try { data = text ? JSON.parse(text) : null; } catch { /* ignore */ }

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

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-2xl mx-auto p-4">
        <div className="flex items-center justify-between gap-3">
          <h1 className="text-xl font-semibold">Ταιριάζουμε;</h1>
          <Link className="text-sm text-slate-600 hover:underline" to="/login">
            Login (ιδιοκτήτης)
          </Link>
        </div>

        <p className="mt-2 text-sm text-slate-700">
          Συμπλήρωσε 30” και πάρε <b>match score</b> πριν πάτε σε ραντεβού. Τα στοιχεία εδώ είναι
          ανώνυμα — δεν ζητάμε όνομα, τηλέφωνο, ΑΦΜ, ούτε “το όνομα της γάτας”.
        </p>

        {!shareKeyLooksOk && (
          <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
            Προσοχή: το link φαίνεται άκυρο. (<span className="font-mono">{shareKeySafe || "—"}</span>)
          </div>
        )}

        <div className="mt-4 rounded-xl bg-white shadow p-4">
          <h2 className="font-medium">Συνήθειες ενοικιαστή</h2>

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
              <div className="mt-1 text-xs text-slate-500">
                Διάλεξε ό,τι σε περιγράφει (1–3 είναι συνήθως αρκετά).
              </div>
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
                  onChange={(e) =>
                    setAnswers((p) => ({ ...p, occupants: clampInt(Number(e.target.value), 1, 20) }))
                  }
                />
              </div>
            </div>

            <button
              type="button"
              disabled={loading}
              onClick={submit}
              className="mt-2 rounded-xl bg-slate-900 text-white py-2.5 text-sm font-medium disabled:opacity-60"
            >
              {loading ? "Υπολογίζω…" : "Υπολόγισε συμβατότητα"}
            </button>

            {err && (
              <div className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-900">
                {err}
              </div>
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
                              {v.severity || "—"}{typeof v.penalty === "number" ? ` (-${v.penalty})` : ""}
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

        <div className="mt-4 text-xs text-slate-500">
          Σημείωση: Το αποτέλεσμα είναι “compatibility check”, όχι γάμος. (Ακόμα.)
        </div>
      </div>
    </div>
  );
}
