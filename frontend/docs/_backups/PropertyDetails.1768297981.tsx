import { useEffect, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import Header from "../components/Header";
import api, {
  type Property,
  type HeatingType,
  type EnergyClass,
  type ParkingType,
  type FurnishedType,
} from "../lib/api";

type LocationState = {
  property?: Property;
};

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

function formatNumber(n: number | undefined | null): string {
  if (n == null || Number.isNaN(n)) return "—";
  return String(n);
}

function PropertyDetails() {
  const navigate = useNavigate();
  const location = useLocation();
  const params = useParams<{ id: string }>();

  const state = location.state as LocationState | null;
  const initialProperty = state?.property ?? null;

  const [property, setProperty] = useState<Property | null>(initialProperty);
  const [loading, setLoading] = useState(!initialProperty && !!params.id);
  const [err, setErr] = useState<string | null>(null);

  // Αν δεν έχουμε state.property αλλά έχουμε id, κάνουμε fetch από API
  useEffect(() => {
    const id = params.id;
    if (!id || initialProperty) return;

    let cancelled = false;
    setLoading(true);
    setErr(null);

    api
      .getProperty(id)
      .then((p) => {
        if (!cancelled) setProperty(p);
      })
      .catch((e: any) => {
        if (!cancelled)
          setErr(e?.message || "Αποτυχία φόρτωσης ακινήτου.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [params.id, initialProperty]);

  if (!property && !loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header />
        <main className="mx-auto max-w-3xl px-4 py-6 space-y-4">
          <button
            type="button"
            onClick={() => navigate("/properties")}
            className="text-sm px-3 py-1.5 rounded-xl border bg-white hover:bg-gray-50"
          >
            ← Πίσω στη λίστα
          </button>
          <div className="bg-white border rounded-xl p-4 text-sm text-gray-700">
            {err || "Δεν βρέθηκαν στοιχεία για το ακίνητο."}
          </div>
        </main>
      </div>
    );
  }

  if (!property || loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header />
        <main className="mx-auto max-w-3xl px-4 py-6 space-y-4">
          <button
            type="button"
            onClick={() => navigate("/properties")}
            className="text-sm px-3 py-1.5 rounded-xl border bg-white hover:bg-gray-50"
          >
            ← Πίσω στη λίστα
          </button>
          <div className="bg-white rounded-xl shadow p-4 text-sm text-gray-600">
            Φόρτωση στοιχείων ακινήτου...
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
    typeof p.otherFixedCosts === "number" &&
    !Number.isNaN(p.otherFixedCosts)
      ? p.otherFixedCosts
      : null;
  const approxTotal =
    baseRent !== null
      ? baseRent + (commonCharges || 0) + (otherFixed || 0)
      : null;

  const heatingLabel = p.heatingType
    ? heatingLabels[p.heatingType]
    : heatingLabels.none;

  const parkingLabel =
    p.parking && p.parking !== "none" ? parkingLabels[p.parking] : null;

  const furnishedLabel = p.furnished
    ? furnishedLabels[p.furnished]
    : furnishedLabels.none;

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <main className="mx-auto max-w-3xl px-4 py-6 space-y-4">
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="text-sm px-3 py-1.5 rounded-xl border bg-white hover:bg-gray-50"
        >
          ← Πίσω
        </button>

        <div className="bg-white rounded-xl shadow p-4 space-y-4">
          {/* Τίτλος + διεύθυνση + status */}
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="text-lg font-semibold text-gray-900">
                {p.title || "-"}
              </div>
              <div className="text-sm text-gray-600">
                {p.address || "—"}
              </div>
            </div>
            <span
              className={`inline-block text-xs px-2 py-1 rounded-full ${
                isDeleted
                  ? "bg-red-100 text-red-700"
                  : "bg-green-100 text-green-700"
              }`}
            >
              {isDeleted ? "Deleted" : "Active"}
            </span>
          </div>

          {/* Οικονομικά */}
          <div className="bg-gray-50 rounded-lg px-3 py-2 space-y-1">
            <div className="text-sm text-gray-900">
              <span className="font-medium">Ενοίκιο:</span>{" "}
              {baseRent !== null ? `${baseRent} € / μήνα` : "—"}
            </div>
            {(commonCharges !== null ||
              otherFixed !== null ||
              p.depositMonths != null) && (
              <div className="text-xs text-gray-600">
                {commonCharges !== null && `Κοιν: ${commonCharges}€`}
                {commonCharges !== null && otherFixed !== null && " · "}
                {otherFixed !== null && `Άλλα: ${otherFixed}€`}
                {(commonCharges !== null || otherFixed !== null) &&
                  p.depositMonths != null &&
                  " · "}
                {p.depositMonths != null &&
                  `Εγγύηση: ${p.depositMonths}μ.`}
              </div>
            )}
            {approxTotal !== null &&
              (commonCharges !== null || otherFixed !== null) && (
                <div className="text-xs text-gray-800 font-medium">
                  ≈ {approxTotal} €/μήνα συνολικά
                </div>
              )}
            {p.billsIncluded && (
              <div className="text-[11px] text-emerald-600">
                Περιλαμβάνονται λογαριασμοί (ρεύμα/νερό/θέρμανση)
              </div>
            )}
          </div>

          {/* Βασικά & Κτίριο */}
          <div className="grid gap-3 md:grid-cols-2 text-sm text-gray-800">
            <div className="space-y-1">
              <div className="font-semibold text-gray-900">
                Βασικά στοιχεία
              </div>
              <div>
                <span className="font-medium">Εμβαδό:</span>{" "}
                {formatNumber(p.size)} τ.μ.
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

            <div className="space-y-1">
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
                  ? p.energyClass
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
        </div>
      </main>
    </div>
  );
}

export default PropertyDetails;
