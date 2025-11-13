import { FormEvent, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../lib/api";

export default function Login() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("eleni@email.com");
  const [password, setPassword] = useState("1234_password");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setErr(null);
    setLoading(true);
    try {
      await api.login(email, password);
      navigate("/properties", { replace: true });
    } catch (e: any) {
      const msg =
        e?.message === "UNAUTHORIZED"
          ? "Λανθασμένα στοιχεία σύνδεσης."
          : e?.message || "Αποτυχία σύνδεσης.";
      setErr(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="w-full max-w-md bg-white rounded-2xl shadow p-6 space-y-4">
        <h1 className="text-2xl font-semibold">Rentiva – Σύνδεση</h1>

        {err && (
          <div className="text-sm text-red-700 bg-red-50 border border-red-200 px-3 py-2 rounded-lg">
            {err}
          </div>
        )}

        <form onSubmit={onSubmit} className="space-y-4">
          <div>
            <label className="block text-sm text-gray-700">
              E-mail
              <input
                type="email"
                className="mt-1 w-full border rounded-xl px-3 py-2"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
              />
            </label>
          </div>
          <div>
            <label className="block text-sm text-gray-700">
              Συνθηματικό
              <input
                type="password"
                className="mt-1 w-full border rounded-xl px-3 py-2"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
              />
            </label>
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full border rounded-xl px-4 py-2 bg-black text-white disabled:opacity-60"
          >
            {loading ? "Σύνδεση..." : "Σύνδεση"}
          </button>
        </form>
      </div>
    </div>
  );
}
