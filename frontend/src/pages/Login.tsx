import { useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../lib/api";
import { useNotification } from "../lib/notifications";

export default function Login() {
  const [email, setEmail] = useState("eleni@email.com");
  const [password, setPassword] = useState("1234_password");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const navigate = useNavigate();
  const notifications = useNotification();

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    setLoading(true);
    try {
      await api.login(email, password);
      notifications.notifySuccess("Συνδεθήκατε επιτυχώς.");
      navigate("/", { replace: true });
} catch (ex: any) {
      const message = ex?.error || ex?.message || "Η σύνδεση απέτυχε.";
      setErr(message);
      notifications.notifyError(message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ maxWidth: 420, margin: "60px auto", fontFamily: "system-ui" }}>
      <h1 style={{ fontSize: 24, fontWeight: 600, marginBottom: 16 }}>Rentiva</h1>
      <form onSubmit={onSubmit} style={{ display: "grid", gap: 12 }}>
        <label>
          Email
          <input
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            style={{ width: "100%", padding: 8, border: "1px solid #ddd", borderRadius: 8 }}
            autoComplete="username"
          />
        </label>
        <label>
          Password
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            style={{ width: "100%", padding: 8, border: "1px solid #ddd", borderRadius: 8 }}
            autoComplete="current-password"
          />
        </label>
        {err && (
          <div style={{ color: "#b10000", fontSize: 14, background: "#ffecec", padding: 8, borderRadius: 8 }}>
            {err}
          </div>
        )}
        <button
          type="submit"
          disabled={loading || !email || !password}
          style={{
            padding: "10px 14px",
            borderRadius: 10,
            border: "1px solid #111",
            background: "#111",
            color: "#fff",
            cursor: loading ? "not-allowed" : "pointer"
          }}
        >
          {loading ? "Σύνδεση..." : "Σύνδεση"}
        </button>
      </form>
    </div>
  );
}
