import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import Header from "../components/Header";
import api, { type Property } from "../lib/api";
import { useNotification } from "../lib/notifications";

export default function PropertyDetails() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { notifyError } = useNotification();

  const [property, setProperty] = useState<Property | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) {
      notifyError("Δεν βρέθηκε ID ακινήτου.");
      setLoading(false);
      return;
    }

    (async () => {
      try {
        const p = await api.getPropertyById(id);
        setProperty(p);
      } catch (e: any) {
        notifyError(e?.message || "Αποτυχία φόρτωσης ακινήτου.");
      } finally {
        setLoading(false);
      }
    })();
  }, [id, notifyError]);

  if (!id) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header />
        <main className="mx-auto max-w-4xl px-4 py-6">
          <p className="text-sm text-red-600">
            Δεν βρέθηκε ID ακινήτου.{" "}
            <button
              type="button"
              onClick={() => navigate("/properties")}
              className="underline"
            >
              Επιστροφή στη λίστα
            </button>
          </p>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <main className="mx-auto max-w-4xl px-4 py-6 space-y-4">
        <button
          type="button"
          onClick={() => navigate("/properties")}
          className="text-sm text-gray-600 underline"
        >
          ← Επιστροφή στη λίστα
        </button>

        {loading ? (
          <div className="bg-white rounded-xl shadow px-4 py-6 text-sm text-gray-500">
            Φόρτωση ακινήτου...
          </div>
        ) : !property ? (
          <div className="bg-white rounded-xl shadow px-4 py-6 text-sm text-red-600">
            Το ακίνητο δεν βρέθηκε.
          </div>
        ) : (
          <div className="bg-white rounded-xl shadow px-4 py-6 space-y-2">
            <h2 className="text-xl font-semibold">
              {property.title || "Χωρίς τίτλο"}
            </h2>
            <div className="text-sm text-gray-600">
              {property.address || "Χωρίς διεύθυνση"}
            </div>
            <div className="text-sm text-gray-900">
              <span className="font-medium">Ενοίκιο:</span>{" "}
              {property.rent != null && !Number.isNaN(property.rent)
                ? `${property.rent} € / μήνα`
                : "—"}
            </div>
            <div className="text-xs text-gray-500">
              Αναλυτική σελίδα ακινήτου · TODO:
              περισσότερα στοιχεία, timeline, condition report κ.λπ.
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
