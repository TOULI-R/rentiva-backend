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
            Καλώς ήρθες. Διάλεξε τι θέλεις να κάνεις — και αν χρειάζεται, θα σε πάει για σύνδεση.
          </p>

          <div className="flex flex-col sm:flex-row gap-3 pt-2">
            <Link
              to={token ? "/choose-role" : "/login?next=%2Fchoose-role"}
              className="inline-flex items-center justify-center rounded-xl px-4 py-2 font-semibold border border-gray-900 bg-gray-900 text-white"
            >
              Δημιουργία / Επιλογή προφίλ
            </Link>

            <Link
              to={token ? "/go" : "/login"}
              className="inline-flex items-center justify-center rounded-xl px-4 py-2 font-semibold border border-gray-300 bg-white text-gray-900"
            >
              Σύνδεση
            </Link>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="bg-white rounded-2xl shadow p-6 space-y-3">
            <div className="text-lg font-semibold">Για ενοικιαστές</div>
            <ul className="text-gray-700 list-disc pl-5 space-y-1">
              <li>Αναζήτηση δημοσιευμένων ακινήτων με φίλτρα</li>
              <li>Προβολή λεπτομερειών & βασικών παροχών</li>
              <li>Public εμπειρία (χωρίς login)</li>
            </ul>

            <Link
              to="/search"
              className="inline-flex items-center justify-center rounded-xl px-4 py-2 font-semibold border border-gray-900 bg-gray-900 text-white w-full"
            >
              Αναζήτηση ακινήτων
            </Link>
          </div>

          <div className="bg-white rounded-2xl shadow p-6 space-y-3">
            <div className="text-lg font-semibold">Για ιδιοκτήτες</div>
            <ul className="text-gray-700 list-disc pl-5 space-y-1">
              <li>Καταχώρηση & διαχείριση ακινήτων</li>
              <li>Βιβλιάριο Υγείας ακινήτου</li>
              <li>Δημοσίευση/Απόσυρση αγγελίας</li>
            </ul>

            <Link
              to={token ? "/properties" : "/login?next=%2Fproperties"}
              className="inline-flex items-center justify-center rounded-xl px-4 py-2 font-semibold border border-gray-300 bg-white text-gray-900 w-full"
            >
              Πίνακας ιδιοκτήτη
            </Link>
          </div>
        </div>

        <div className="text-sm text-gray-500">
          Tip: Η αναζήτηση ενοικιαστή/αγγελιών πατάει στο endpoint <code>/api/public/properties</code>.
        </div>
      </div>
    </div>
  );
}
