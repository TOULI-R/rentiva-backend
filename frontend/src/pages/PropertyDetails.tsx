import { useEffect, useState, type FormEvent } from "react";
import { useNavigate, useParams } from "react-router-dom";
import Header from "../components/Header";
import api, {
  type Property,
  type PropertyEvent,
  type PropertyEventKind,
  type HeatingType,
  type EnergyClass,
  type ParkingType,
  type FurnishedType,
} from "../lib/api";
import { useNotification } from "../lib/notifications";

function formatNumber(n: number | undefined | null): string {
  if (n == null || Number.isNaN(n)) return "—";
  return String(n);
}

function formatDateTime(iso?: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString("el-GR", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

const heatingLabels: Record<HeatingType, string> = {
  none: "Χωρίς θέρμανση",
  central_oil: "Κεντρική πετρέλαιο",
  central_gas: "Κεντρική φυσικό αέριο",
  autonomous_gas: "Ατομική φυσικό αέριο",
  autonomous_oil: "Ατομική πετρέλαιο",
  heat_pump: "Αντλία θερμότητας",
  electric: "Ηλεκτρική / A/C",
  other: "Άλλη θέρμανση",
};

const parkingLabels: Record<ParkingType, string> = {
  none: "Χωρίς parking",
  street: "Στάθμευση στο δρόμο",
  open: "Θέση parking (ανοιχτή)",
  closed: "Κλειστή θέση parking",
  garage: "Ιδιωτικό γκαράζ",
};

const furnishedLabels: Record<FurnishedType, string> = {
  none: "Μη επιπλωμένο",
  partial: "Μερικώς επιπλωμένο",
  full: "Πλήρως επιπλωμένο",
};

function getHeatingLabel(type?: HeatingType): string {
  if (!type) return "—";
  return heatingLabels[type] ?? "—";
}

function getParkingLabel(type?: ParkingType): string {
  if (!type) return "—";
  return parkingLabels[type] ?? "—";
}

function getFurnishedLabel(type?: FurnishedType): string {
  if (!type || type === "none") return "Μη επιπλωμένο";
  return furnishedLabels[type] ?? "Μη επιπλωμένο";
}

export default function PropertyDetails() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { notifyError } = useNotification();

  const [property, setProperty] = useState<Property | null>(null);
  const [loading, setLoading] = useState(true);

  const [events, setEvents] = useState<PropertyEvent[]>([]);
  const [eventsLoading, setEventsLoading] = useState(false);
  const [eventsError, setEventsError] = useState<string | null>(null);

  const [noteTitle, setNoteTitle] = useState("");
  const [noteMessage, setNoteMessage] = useState("");
  const [noteSaving, setNoteSaving] = useState(false);
  const [noteSaved, setNoteSaved] = useState(false);

  useEffect(() => {
    if (!id) {
      notifyError("Δεν βρέθηκε ID ακινήτου.");
      navigate("/properties");
      return;
    }

    let cancelled = false;

    (async () => {
      try {
        const p = await api.getProperty(id);
        if (!cancelled) {
          setProperty(p);
        }
      } catch (e: any) {
        if (!cancelled) {
          notifyError(e?.message || "Αποτυχία φόρτωσης ακινήτου.");
          navigate("/properties");
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [id, navigate, notifyError]);

  
  useEffect(() => {
    if (!id) return;

    let cancelled = false;

    setEventsLoading(true);
    setEventsError(null);

    (async () => {
      try {
        const items = await api.listPropertyEvents(id, { limit: 30 });
        if (!cancelled) setEvents(items);
      } catch (e: any) {
        if (!cancelled) setEventsError((e as any)?.message || "Αποτυχία φόρτωσης timeline.");
      } finally {
        if (!cancelled) setEventsLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [id]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header />
        <main className="mx-auto max-w-4xl px-4 py-6">
          <div className="animate-pulse bg-white rounded-xl shadow h-48" />
        </main>
      </div>
    );
  }

  if (!property) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header />
        <main className="mx-auto max-w-4xl px-4 py-6 space-y-4">
          <button
            type="button"
            onClick={() => navigate("/properties")}
            className="text-sm text-gray-600 hover:underline"
          >
            ← Επιστροφή στη λίστα
          </button>
          <div className="bg-white rounded-xl shadow p-4 text-sm text-gray-700">
            Δεν βρέθηκε το ακίνητο.
          </div>
        </main>
      </div>
    );
  }

  const p = property;
  const isDeleted = !!p.deletedAt;

  const baseRent =
    typeof p.rent === "number" && !Number.isNaN(p.rent) ? p.rent : null;
  const commonCharges =
    typeof p.commonCharges === "number" && !Number.isNaN(p.commonCharges)
      ? p.commonCharges
      : null;
  const otherFixed =
    typeof p.otherFixedCosts === "number" && !Number.isNaN(p.otherFixedCosts)
      ? p.otherFixedCosts
      : null;

  let approxTotal: number | null = null;
  if (baseRent !== null) {
    approxTotal =
      baseRent + (commonCharges ?? 0) + (otherFixed ?? 0);
  }

  const heatingLabel = getHeatingLabel(p.heatingType);
  const parkingLabel = getParkingLabel(p.parking);
  const furnishedLabel = getFurnishedLabel(p.furnished);
  const kindLabel = (kind: PropertyEventKind): string => {
    switch (kind) {
      case "created":
        return "Δημιουργήθηκε";
      case "updated":
        return "Ενημερώθηκε";
      case "deleted":
        return "Έγινε soft delete";
      case "restored":
        return "Έγινε επαναφορά";
      case "note":
        return "Σημείωση";
      default:
        return "Γεγονός";
    }
  };

  const dotClass = (kind: PropertyEventKind) =>
    kind === "deleted"
      ? "bg-red-500"
      : kind === "updated"
      ? "bg-amber-500"
      : kind === "restored"
      ? "bg-sky-500"
      : kind === "note"
      ? "bg-gray-500"
      : "bg-emerald-500";

  const formatChangedFields = (meta: any): string | null => {
    const fields = meta?.changedFields;
    if (!Array.isArray(fields) || fields.length === 0) return null;

    const labels: Record<string, string> = {
      title: "Τίτλος",
      address: "Διεύθυνση",
      rent: "Ενοίκιο",
      commonCharges: "Κοινόχρηστα",
      otherFixedCosts: "Άλλα πάγια",
      billsIncluded: "Λογαριασμοί",
      depositMonths: "Εγγύηση (μήνες)",
      minimumContractMonths: "Ελάχιστη διάρκεια",
      size: "Τ.μ.",
      floor: "Όροφος",
      bedrooms: "Υπνοδωμάτια",
      bathrooms: "Μπάνια",
      yearBuilt: "Έτος κατασκευής",
      yearRenovated: "Έτος ανακαίνισης",
      heatingType: "Θέρμανση",
      energyClass: "Ενεργειακή κλάση",
      parking: "Parking",
      elevator: "Ασανσέρ",
      furnished: "Επίπλωση",
      petsAllowed: "Κατοικίδια",
      description: "Περιγραφή",
      status: "Κατάσταση",
    };

    const nice = fields.map((f) => labels[String(f)] ?? String(f));
    return "Αλλαγές: " + nice.join(", ");
  };

  const onSubmitNote = async (e: FormEvent) => {
    e.preventDefault();
    if (!id) return;

    const title = noteTitle.trim();
    const message = noteMessage.trim();
    if (!title) return;

    setNoteSaving(true);
    try {
      const created = await api.addPropertyEventNote(id, {
        title,
        message: message ? message : undefined,
      });

      setEvents((prev) => [created, ...prev]);
      setNoteTitle("");
      setNoteMessage("");
      setNoteSaved(true);
      setTimeout(() => setNoteSaved(false), 1800);
    } catch (err: any) {
      notifyError((err as any)?.message || "Αποτυχία αποθήκευσης σημείωσης.");
    } finally {
      setNoteSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <main className="mx-auto max-w-4xl px-4 py-6 space-y-4">
        <button
          type="button"
          onClick={() => navigate("/properties")}
          className="text-sm text-gray-600 hover:underline"
        >
          ← Επιστροφή στη λίστα
        </button>

        <div className="bg-white rounded-xl shadow p-4 sm:p-6 space-y-4">
          {/* Τίτλος / διεύθυνση / status */}
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
            <div>
              <h1 className="text-lg sm:text-xl font-semibold text-gray-900">
                {p.title || "Χωρίς τίτλο"}
              </h1>
              <div className="text-sm text-gray-600">
                {p.address || "Χωρίς διεύθυνση"}
              </div>
              <div className="mt-1 text-xs text-gray-500">
                ID: {p._id}
              </div>
            </div>
            <div className="flex flex-col items-start sm:items-end gap-2">
              <span
                className={`inline-block text-xs px-2 py-1 rounded-full ${
                  isDeleted
                    ? "bg-red-100 text-red-700"
                    : "bg-green-100 text-green-700"
                }`}
              >
                {isDeleted ? "Deleted" : "Active"}
              </span>
              {baseRent !== null && (
                <div className="text-right">
                  <div className="text-sm text-gray-600">Ενοίκιο</div>
                  <div className="text-lg font-semibold text-gray-900">
                    {baseRent} € / μήνα
                  </div>
                  {(commonCharges !== null || otherFixed !== null) && (
                    <div className="mt-1 text-xs text-gray-500">
                      {commonCharges !== null &&
                        `Κοιν: ${commonCharges}€`}
                      {commonCharges !== null &&
                        otherFixed !== null &&
                        " · "}
                      {otherFixed !== null &&
                        `Άλλα: ${otherFixed}€`}
                    </div>
                  )}
                  {approxTotal !== null &&
                    (commonCharges !== null || otherFixed !== null) && (
                      <div className="text-xs text-gray-800 font-medium">
                        ≈ {approxTotal} €/μήνα συνολικά
                      </div>
                    )}
                  {p.billsIncluded && (
                    <div className="text-[11px] text-emerald-600 mt-1">
                      Περιλαμβάνονται λογαριασμοί
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Βασικά στοιχεία + κτίριο */}
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1 text-sm text-gray-800">
              <div className="font-semibold text-gray-900">Βασικά</div>
              <div>
                <span className="font-medium">Τ.μ.:</span>{" "}
                {formatNumber(p.size)}
              </div>
              <div>
                <span className="font-medium">Όροφος:</span>{" "}
                {p.floor != null && !Number.isNaN(p.floor)
                  ? `Όροφος ${p.floor}`
                  : "—"}
              </div>
              <div>
                <span className="font-medium">Υπνοδωμάτια:</span>{" "}
                {p.bedrooms != null && !Number.isNaN(p.bedrooms)
                  ? p.bedrooms
                  : "—"}
              </div>
              <div>
                <span className="font-medium">Μπάνια:</span>{" "}
                {p.bathrooms != null && !Number.isNaN(p.bathrooms)
                  ? p.bathrooms
                  : "—"}
              </div>
            </div>

            <div className="space-y-1 text-sm text-gray-800">
              <div className="font-semibold text-gray-900">Κτίριο</div>
              <div>
                <span className="font-medium">Έτος κατασκευής:</span>{" "}
                {p.yearBuilt && !Number.isNaN(p.yearBuilt)
                  ? p.yearBuilt
                  : "—"}
              </div>
              <div>
                <span className="font-medium">Έτος ανακαίνισης:</span>{" "}
                {p.yearRenovated && !Number.isNaN(p.yearRenovated)
                  ? p.yearRenovated
                  : "—"}
              </div>
              <div>
                <span className="font-medium">Θέρμανση:</span>{" "}
                {heatingLabel}
              </div>
              <div>
                <span className="font-medium">Ενεργειακή κλάση:</span>{" "}
                {p.energyClass && p.energyClass !== "unknown"
                  ? (p.energyClass as EnergyClass)
                  : "—"}
              </div>
              <div>
                <span className="font-medium">Parking:</span>{" "}
                {parkingLabel || "—"}
              </div>
              <div>
                <span className="font-medium">Ασανσέρ:</span>{" "}
                {p.elevator ? "Ναι" : "Όχι"}
              </div>
            </div>
          </div>

          {/* Επίπλωση / λοιπά */}
          <div className="space-y-1 text-sm text-gray-800">
            <div className="font-semibold text-gray-900">
              Επίπλωση & λοιπά
            </div>
            <div>
              <span className="font-medium">Επίπλωση:</span>{" "}
              {furnishedLabel}
            </div>
            <div>
              <span className="font-medium">Κατοικίδια:</span>{" "}
              {p.petsAllowed ? "Επιτρέπονται" : "Δεν επιτρέπονται"}
            </div>
          </div>

          {/* Περιγραφή */}
          {p.description && (
            <div className="pt-3 border-t text-sm text-gray-800">
              <div className="font-semibold mb-1">Περιγραφή</div>
              <p>{p.description}</p>
            </div>
          )}

          {/* Timeline */}
          <div className="pt-3 border-t">
            <div className="flex items-center justify-between">
              <div className="font-semibold text-gray-900 text-sm">Timeline</div>
              <div className="text-xs text-gray-500">Radical Transparency</div>
            </div>

            <div className="mt-3 space-y-3">
              {eventsLoading ? (
                <div className="space-y-2">
                  <div className="h-10 bg-gray-100 rounded-lg animate-pulse" />
                  <div className="h-10 bg-gray-100 rounded-lg animate-pulse" />
                  <div className="h-10 bg-gray-100 rounded-lg animate-pulse" />
                </div>
              ) : eventsError ? (
                <div className="text-xs text-red-600">{eventsError}</div>
              ) : events.length === 0 ? (
                <div className="text-xs text-gray-500">
                  Δεν υπάρχουν ακόμα γεγονότα για αυτό το ακίνητο.
                </div>
              ) : (
                <div className="space-y-3">
                  {events.map((ev, idx) => {
                    const changed =
                      ev.kind === "updated" ? formatChangedFields(ev.meta) : null;

                    return (
                      <div key={ev._id || ev.kind + "-" + idx} className="relative pl-6">
                        <div
                          className={
                            "absolute left-0 top-1.5 h-2.5 w-2.5 rounded-full " +
                            dotClass(ev.kind as PropertyEventKind)
                          }
                        />
                        {idx !== events.length - 1 && (
                          <div className="absolute left-[4px] top-4 h-full w-px bg-gray-200" />
                        )}

                        <div className="text-sm text-gray-800">
                          <div className="flex items-start justify-between gap-2">
                            <div className="font-medium">
                              {ev.title || kindLabel(ev.kind as PropertyEventKind)}
                            </div>
                            <span className="shrink-0 text-[11px] px-2 py-0.5 rounded-full bg-gray-100 text-gray-700">
                              {kindLabel(ev.kind as PropertyEventKind)}
                            </span>
                          </div>

                          <div className="text-xs text-gray-500">
                            {formatDateTime(ev.createdAt)}
                          </div>

                          {changed && (
                            <div className="mt-1 text-xs text-gray-700">
                              {changed}
                            </div>
                          )}

                          {ev.message && (
                            <div className="mt-1 text-xs text-gray-700 whitespace-pre-wrap">
                              {ev.message}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Add note */}
              <div className="pt-3 border-t">
                <div className="flex items-center justify-between">
                  <div className="text-sm font-semibold text-gray-900">
                    Προσθήκη σημείωσης
                  </div>
                  {noteSaved && (
                    <div className="text-xs text-emerald-600 font-medium">
                      Αποθηκεύτηκε ✓
                    </div>
                  )}
                </div>

                <form onSubmit={onSubmitNote} className="mt-2 space-y-2">
                  <input
                    value={noteTitle}
                    onChange={(e) => setNoteTitle(e.target.value)}
                    placeholder="Τίτλος"
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-200"
                  />
                  <textarea
                    value={noteMessage}
                    onChange={(e) => setNoteMessage(e.target.value)}
                    placeholder="Μήνυμα (προαιρετικό)"
                    rows={3}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-200"
                  />
                  <button
                    type="submit"
                    disabled={noteSaving || !noteTitle.trim()}
                    className="w-full sm:w-auto inline-flex items-center justify-center rounded-lg bg-gray-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
                  >
                    {noteSaving ? "Αποθήκευση..." : "Αποθήκευση σημείωσης"}
                  </button>
                </form>
              </div>
            </div>
          </div>

{/* Ημερομηνίες */}

          <div className="pt-3 border-t text-xs text-gray-500 space-y-1">
            <div>Δημιουργήθηκε: {formatDateTime(p.createdAt)}</div>
            {p.updatedAt && p.updatedAt !== p.createdAt && (
              <div>
                Τελευταία ενημέρωση: {formatDateTime(p.updatedAt)}
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
