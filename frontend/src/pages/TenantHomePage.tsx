import { useEffect, useMemo, useState } from "react";
import Header from "../components/Header";
import api, { type TenantAnswersV1 } from "../lib/api";
import { useNotification } from "../lib/notifications";

type AnsYN = "yes" | "no" | undefined;

const usageOptions: Array<{ key: string; label: string }> = [
  { key: "family", label: "Οικογένεια" },
  { key: "remote_work", label: "Τηλεργασία" },
  { key: "students", label: "Φοιτητές" },
  { key: "single", label: "Μόνος/η" },
  { key: "couple", label: "Ζευγάρι" },
  { key: "shared", label: "Συγκατοίκηση" },
];

function clampInt(v: string, min: number, max: number): number | undefined {
  const s = String(v ?? "").trim();
  if (!s) return undefined;
  const n = parseInt(s, 10);
  if (!Number.isFinite(n)) return undefined;
  const nn = Math.trunc(n);
  if (nn < min || nn > max) return undefined;
  return nn;
}

function formatTime(ts: number) {
  try {
    return new Date(ts).toLocaleTimeString("el-GR", { hour: "2-digit", minute: "2-digit" });
  } catch {
    return "";
  }
}

function TenantHome() {
  const { notifyError, notifySuccess } = useNotification();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [lastSavedAt, setLastSavedAt] = useState<number | null>(null);

  const [phone, setPhone] = useState("");
  const [city, setCity] = useState("");
  const [about, setAbout] = useState("");

  const [smoking, setSmoking] = useState<AnsYN>(undefined);
  const [pets, setPets] = useState<AnsYN>(undefined);
  const [usage, setUsage] = useState<string[]>([]);
  const [quietHoursAfter, setQuietHoursAfter] = useState<number | undefined>(undefined);
  const [occupants, setOccupants] = useState<number | undefined>(undefined);

  const usageSet = useMemo(() => new Set(usage), [usage]);

  const isBusy = loading || saving;

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const p = await api.tenantMe();
        if (cancelled) return;

        setPhone(p.phone || "");
        setCity(p.city || "");
        setAbout(p.about || "");

        const ta = (p.tenantAnswers || {}) as TenantAnswersV1;

        setSmoking((ta.smoking as AnsYN) ?? undefined);
        setPets((ta.pets as AnsYN) ?? undefined);

        const u = Array.isArray(ta.usage) ? ta.usage : [];
        const allowed = new Set(usageOptions.map((x) => x.key));
        setUsage(u.filter((k) => allowed.has(String(k))));

        setQuietHoursAfter(
          typeof ta.quietHoursAfter === "number" && !Number.isNaN(ta.quietHoursAfter)
            ? ta.quietHoursAfter
            : undefined
        );
        setOccupants(
          typeof ta.occupants === "number" && !Number.isNaN(ta.occupants)
            ? ta.occupants
            : undefined
        );
      } catch (e: any) {
        notifyError(e?.message || "Αποτυχία φόρτωσης Διαβατηρίου Ενοικιαστή.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [notifyError]);

  const toggleUsage = (k: string) => {
    setUsage((prev) => (prev.includes(k) ? prev.filter((x) => x !== k) : [...prev, k]));
  };

  const buildTenantAnswersPayload = (): TenantAnswersV1 => {
    const ta: TenantAnswersV1 = { usage: usage }; // πάντα usage, για “καθάρισμα”
    if (smoking) ta.smoking = smoking;
    if (pets) ta.pets = pets;
    if (typeof quietHoursAfter === "number") ta.quietHoursAfter = quietHoursAfter;
    if (typeof occupants === "number") ta.occupants = occupants;
    return ta;
  };

  const onSave = async () => {
    if (saving) return;
    setSaving(true);

    try {
      await api.updateTenantMe({
        phone: phone.trim() ? phone.trim() : undefined,
        city: city.trim() ? city.trim() : undefined,
        about: about.trim() ? about.trim() : undefined,
        tenantAnswers: buildTenantAnswersPayload(),
      });

      setLastSavedAt(Date.now());
      notifySuccess("Αποθηκεύτηκε το Διαβατήριο Ενοικιαστή.");
    } catch (e: any) {
      notifyError(e?.message || "Αποτυχία αποθήκευσης Διαβατηρίου Ενοικιαστή.");
    } finally {
      setSaving(false);
    }
  };

  const inputBase =
    "mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm " +
    "focus:outline-none focus:ring-2 focus:ring-gray-200 " +
    "disabled:bg-gray-50 disabled:text-gray-500 disabled:cursor-not-allowed";

  const pillBase =
    "rounded-full px-3 py-1.5 text-sm border disabled:opacity-60 disabled:cursor-not-allowed";

  const choiceBase =
    "rounded-lg px-3 py-2 text-sm border disabled:opacity-60 disabled:cursor-not-allowed";

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />

      <main className="mx-auto max-w-4xl px-4 py-6 space-y-4">
        <div className="bg-white rounded-xl shadow p-4 sm:p-6">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h1 className="text-lg sm:text-xl font-semibold text-gray-900">
                Διαβατήριο Ενοικιαστή
              </h1>
              <p className="mt-1 text-sm text-gray-600">
                Συμπλήρωσε βασικά στοιχεία και “απαντήσεις” ώστε να γίνονται γρήγορα compatibility tests.
              </p>

              {lastSavedAt && (
                <div className="mt-2 text-[11px] text-gray-500">
                  Αποθηκεύτηκε ✓ {formatTime(lastSavedAt)}
                </div>
              )}
            </div>

            <button
              type="button"
              onClick={onSave}
              disabled={isBusy}
              className={
                "rounded-lg px-3 py-2 text-sm font-medium " +
                (isBusy
                  ? "bg-gray-200 text-gray-600 cursor-not-allowed"
                  : "bg-gray-900 text-white hover:bg-gray-800")
              }
            >
              {saving ? "Αποθήκευση…" : "Αποθήκευση"}
            </button>
          </div>

          {loading ? (
            <div className="mt-4 space-y-2">
              <div className="h-10 bg-gray-100 rounded-lg animate-pulse" />
              <div className="h-10 bg-gray-100 rounded-lg animate-pulse" />
              <div className="h-24 bg-gray-100 rounded-lg animate-pulse" />
            </div>
          ) : (
            <div className="mt-4 grid gap-4">
              {/* Basic info */}
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="block">
                  <div className="text-sm font-medium text-gray-900">Τηλέφωνο</div>
                  <input
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="π.χ. 69xxxxxxxx"
                    disabled={isBusy}
                    className={inputBase}
                  />
                </label>

                <label className="block">
                  <div className="text-sm font-medium text-gray-900">Πόλη</div>
                  <input
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    placeholder="π.χ. Αθήνα"
                    disabled={isBusy}
                    className={inputBase}
                  />
                </label>
              </div>

              <label className="block">
                <div className="text-sm font-medium text-gray-900">Λίγα λόγια</div>
                <textarea
                  value={about}
                  onChange={(e) => setAbout(e.target.value)}
                  placeholder="Σύντομη περιγραφή (προαιρετικό)"
                  rows={4}
                  disabled={isBusy}
                  className={inputBase}
                />
              </label>

              {/* Tenant answers */}
              <div className="pt-4 border-t">
                <div className="text-sm font-semibold text-gray-900">Απαντήσεις για Compatibility</div>
                <div className="mt-1 text-xs text-gray-500">
                  Προαιρετικό: μπορείς να αφήσεις “Χωρίς απάντηση”.
                </div>

                <div className="mt-4 grid gap-4 sm:grid-cols-2">
                  {/* Smoking */}
                  <div className="rounded-lg border border-gray-200 p-3">
                    <div className="text-sm font-medium text-gray-900">Καπνίζεις;</div>
                    <div className="mt-2 flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => setSmoking("yes")}
                        disabled={isBusy}
                        className={
                          choiceBase +
                          " " +
                          (smoking === "yes"
                            ? "bg-gray-900 text-white border-gray-900"
                            : "bg-white text-gray-800 border-gray-200 hover:shadow-sm")
                        }
                      >
                        Ναι
                      </button>
                      <button
                        type="button"
                        onClick={() => setSmoking("no")}
                        disabled={isBusy}
                        className={
                          choiceBase +
                          " " +
                          (smoking === "no"
                            ? "bg-gray-900 text-white border-gray-900"
                            : "bg-white text-gray-800 border-gray-200 hover:shadow-sm")
                        }
                      >
                        Όχι
                      </button>
                      <button
                        type="button"
                        onClick={() => setSmoking(undefined)}
                        disabled={isBusy}
                        className={choiceBase + " border-gray-200 bg-white text-gray-700 hover:shadow-sm"}
                      >
                        Χωρίς απάντηση
                      </button>
                    </div>
                  </div>

                  {/* Pets */}
                  <div className="rounded-lg border border-gray-200 p-3">
                    <div className="text-sm font-medium text-gray-900">Έχεις κατοικίδιο;</div>
                    <div className="mt-2 flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => setPets("yes")}
                        disabled={isBusy}
                        className={
                          choiceBase +
                          " " +
                          (pets === "yes"
                            ? "bg-gray-900 text-white border-gray-900"
                            : "bg-white text-gray-800 border-gray-200 hover:shadow-sm")
                        }
                      >
                        Ναι
                      </button>
                      <button
                        type="button"
                        onClick={() => setPets("no")}
                        disabled={isBusy}
                        className={
                          choiceBase +
                          " " +
                          (pets === "no"
                            ? "bg-gray-900 text-white border-gray-900"
                            : "bg-white text-gray-800 border-gray-200 hover:shadow-sm")
                        }
                      >
                        Όχι
                      </button>
                      <button
                        type="button"
                        onClick={() => setPets(undefined)}
                        disabled={isBusy}
                        className={choiceBase + " border-gray-200 bg-white text-gray-700 hover:shadow-sm"}
                      >
                        Χωρίς απάντηση
                      </button>
                    </div>
                  </div>

                  {/* Usage */}
                  <div className="rounded-lg border border-gray-200 p-3 sm:col-span-2">
                    <div className="text-sm font-medium text-gray-900">Χρήση / Προφίλ</div>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {usageOptions.map((opt) => (
                        <button
                          key={opt.key}
                          type="button"
                          onClick={() => toggleUsage(opt.key)}
                          disabled={isBusy}
                          className={
                            pillBase +
                            " " +
                            (usageSet.has(opt.key)
                              ? "bg-gray-900 text-white border-gray-900"
                              : "bg-white text-gray-800 border-gray-200 hover:shadow-sm")
                          }
                        >
                          {opt.label}
                        </button>
                      ))}
                      <button
                        type="button"
                        onClick={() => setUsage([])}
                        disabled={isBusy}
                        className={pillBase + " border-gray-200 bg-white text-gray-700 hover:shadow-sm"}
                      >
                        Καμία επιλογή
                      </button>
                    </div>
                    <div className="mt-2 text-xs text-gray-500">
                      Διάλεξε ό,τι σε περιγράφει. Μπορείς να αφήσεις κενό.
                    </div>
                  </div>

                  {/* Quiet hours */}
                  <div className="rounded-lg border border-gray-200 p-3">
                    <div className="text-sm font-medium text-gray-900">Ώρα ησυχίας μετά τις</div>
                    <div className="mt-2 flex items-center gap-2">
                      <input
                        value={quietHoursAfter ?? ""}
                        onChange={(e) => setQuietHoursAfter(clampInt(e.target.value, 0, 23))}
                        inputMode="numeric"
                        placeholder="π.χ. 23"
                        disabled={isBusy}
                        className={
                          "w-28 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm " +
                          "focus:outline-none focus:ring-2 focus:ring-gray-200 " +
                          "disabled:bg-gray-50 disabled:text-gray-500 disabled:cursor-not-allowed"
                        }
                      />
                      <button
                        type="button"
                        onClick={() => setQuietHoursAfter(undefined)}
                        disabled={isBusy}
                        className={choiceBase + " border-gray-200 bg-white text-gray-700 hover:shadow-sm"}
                      >
                        Χωρίς απάντηση
                      </button>
                    </div>
                    <div className="mt-2 text-[11px] text-gray-500">0–23</div>
                  </div>

                  {/* Occupants */}
                  <div className="rounded-lg border border-gray-200 p-3">
                    <div className="text-sm font-medium text-gray-900">Πόσα άτομα;</div>
                    <div className="mt-2 flex items-center gap-2">
                      <input
                        value={occupants ?? ""}
                        onChange={(e) => setOccupants(clampInt(e.target.value, 1, 20))}
                        inputMode="numeric"
                        placeholder="π.χ. 2"
                        disabled={isBusy}
                        className={
                          "w-28 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm " +
                          "focus:outline-none focus:ring-2 focus:ring-gray-200 " +
                          "disabled:bg-gray-50 disabled:text-gray-500 disabled:cursor-not-allowed"
                        }
                      />
                      <button
                        type="button"
                        onClick={() => setOccupants(undefined)}
                        disabled={isBusy}
                        className={choiceBase + " border-gray-200 bg-white text-gray-700 hover:shadow-sm"}
                      >
                        Χωρίς απάντηση
                      </button>
                    </div>
                    <div className="mt-2 text-[11px] text-gray-500">1–20</div>
                  </div>
                </div>

                <div className="mt-4 text-xs text-gray-500">
                  Σύντομα: “1-click αίτηση” με το Διαβατήριό σου.
                </div>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

export default TenantHome;
