import { Link } from "react-router-dom";
import { storage } from "../lib/api";

export default function WelcomePage() {
  const token = storage.getToken();

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="mx-auto max-w-3xl px-4 py-10 space-y-8">
        <div className="bg-white rounded-2xl shadow p-6 space-y-3">
          <h1 className="text-2xl font-semibold">Rentiva</h1>
          <p className="text-gray-700">
            Καλώς ήρθες. Διάλεξε ρόλο και στήσε προφίλ — ή μπες αν έχεις ήδη
            λογαριασμό.
          </p>

          <div className="flex flex-col sm:flex-row gap-3 pt-2">
            <Link
              to={token ? "/choose-role" : "/login?next=%2Fchoose-role"}
              className="inline-flex items-center justify-center rounded-xl px-4 py-2 font-semibold border border-gray-900 bg-gray-900 text-white"
            >
              Δημιουργία / Επιλογή προφίλ
            </Link>

            <Link
              to={token ? "/choose-role" : "/login"}
              className="inline-flex items-center justify-center rounded-xl px-4 py-2 font-semibold border border-gray-300 bg-white text-gray-900"
            >
              Σύνδεση
            </Link>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="bg-white rounded-2xl shadow p-6 space-y-2">
            <div className="text-lg font-semibold">Για ενοικιαστές</div>
            <ul className="text-gray-700 list-disc pl-5 space-y-1">
              <li>Αναζήτηση ακινήτων με φίλτρα</li>
              <li>Matching με προτιμήσεις ιδιοκτήτη</li>
              <li>Tenant Passport</li>
            </ul>
          </div>

          <div className="bg-white rounded-2xl shadow p-6 space-y-2">
            <div className="text-lg font-semibold">Για ιδιοκτήτες</div>
            <ul className="text-gray-700 list-disc pl-5 space-y-1">
              <li>Καταχώρηση & διαχείριση ακινήτων</li>
              <li>Βιβλιάριο Υγείας ακινήτου</li>
              <li>Share link για “Ταιριάζουμε;”</li>
            </ul>
          </div>
        </div>

        <div className="text-sm text-gray-500">
          Σημείωση: Η αναζήτηση ενοικιαστή χρειάζεται public listing endpoint (το
          στήνουμε στο επόμενο βήμα).
        </div>
      </div>
    </div>
  );
}
