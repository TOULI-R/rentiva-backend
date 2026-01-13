import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import Header from "../components/Header";
import api, {
  type Property,
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

  useEffect(() => {
    if (!id) {
      notifyError("Δεν βρέθηκε ID ακινήτου.");
      navigate("/properties");
      return;
    }

    let cancelled = false;

    (async () => {
      try {
        const p = await (api as any).getProperty(id);
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

    type TimelineKind = "created" | "updated" | "deleted";
    const timeline: Array<{ kind: TimelineKind; title: string; at?: string | null }> = [
      { kind: "created", title: "Δημιουργήθηκε", at: p.createdAt ?? null },
      ...(p.updatedAt && p.updatedAt !== p.createdAt
        ? [{ kind: "updated", title: "Ενημερώθηκε", at: p.updatedAt }]
        : []),
      ...(p.deletedAt
        ? [{ kind: "deleted", title: "Έγινε soft delete", at: p.deletedAt }]
        : []),
    ];

    const dotClass = (kind: TimelineKind) =>
      kind === "deleted"
        ? "bg-red-500"
        : kind === "updated"
        ? "bg-amber-500"
        : "bg-emerald-500";

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

          
            {/* Timeline (preview) */}
            <div className="pt-3 border-t">
              <div className="flex items-center justify-between">
                <div className="font-semibold text-gray-900 text-sm">
                  Timeline (προσεχώς)
                </div>
                <div className="text-xs text-gray-500">Radical Transparency</div>
              </div>

              <div className="mt-3 space-y-3">
                <div className="space-y-3">
                  {timeline.map((ev, idx) => (
                    <div key={ev.kind + "-" + idx} className="relative pl-6">
                      <div
                        className={
                          "absolute left-0 top-1.5 h-2.5 w-2.5 rounded-full " +
                          dotClass(ev.kind)
                        }
                      />
                      {idx !== timeline.length - 1 && (
                        <div className="absolute left-[4px] top-4 h-full w-px bg-gray-200" />
                      )}
                      <div className="text-sm text-gray-800">
                        <div className="font-medium">{ev.title}</div>
                        <div className="text-xs text-gray-500">
                          {formatDateTime(ev.at ?? null)}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="text-xs text-gray-500">
                  Σύντομα θα βλέπεις εδώ γεγονότα (π.χ. αλλαγές τιμής, επισκέψεις,
                  επισκευές) για το ακίνητο.
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
