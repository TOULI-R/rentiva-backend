import { FormEvent, useState } from "react";
import api from "../lib/api";
import { useNavigate } from "react-router-dom";

export default function Login() {
  const [email, setEmail] = useState("eleni@email.com");
  const [password, setPassword] = useState("1234_password");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const navigate = useNavigate();

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setErr(null);
    setLoading(true);
    try {
      await api.login(email, password);
      navigate("/properties", { replace: true });
    } catch (error: any) {
      const msg =
        error?.message === "UNAUTHORIZED"
          ? "Λάθος στοιχεία ή έληξε το token. Ξαναπροσπάθησε."
          : (error?.message || "Κάτι πήγε στραβά.");
      setErr(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen grid place-items-center bg-gray-50">
      <form
        onSubmit={onSubmit}
        className="w-full max-w-sm bg-white p-6 rounded-2xl shadow"
      >
        <h1 className="text-2xl font-semibold mb-6 text-center">Rentiva – Σύνδεση</h1>
        <label className="block mb-3">
          <span className="text-sm text-gray-700">E-mail</span>
          <input
            type="email"
            className="mt-1 w-full border rounded-xl px-3 py-2 outline-none focus:ring"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="username"
            required
          />
        </label>
        <label className="block mb-4">
          <span className="text-sm text-gray-700">Συνθηματικό</span>
          <input
            type="password"
            className="mt-1 w-full border rounded-xl px-3 py-2 outline-none focus:ring"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
            required
          />
        </label>

        {err && (
          <div className="mb-4 text-sm text-red-600 border border-red-200 bg-red-50 px-3 py-2 rounded-lg">
            {err}
          </div>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-xl px-3 py-2 border bg-black text-white disabled:opacity-60"
        >
          {loading ? "Σύνδεση..." : "Σύνδεση"}
        </button>
      </form>
    </div>
  );
}
