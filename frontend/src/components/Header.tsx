import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import api, { storage, type UserRole } from "../lib/api";
import { useNotification } from "../lib/notifications";

export default function Header() {
  const navigate = useNavigate();
  const notifications = useNotification();

  const token = storage.getToken();

  const [roleLoading, setRoleLoading] = useState(!!token);
  const [role, setRole] = useState<UserRole>(null);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      if (!token) {
        setRole(null);
        setRoleLoading(false);
        return;
      }

      try {
        const me = await api.me();
        if (!cancelled) setRole((me?.role ?? null) as UserRole);
      } catch {
        if (!cancelled) setRole(null);
      } finally {
        if (!cancelled) setRoleLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [token]);

  const onChangeRole = () => {
    navigate("/choose-role");
  };

  const onLogout = () => {
    storage.clearToken();
    notifications.notifySuccess("Αποσυνδεθήκατε.");
    navigate("/login");
  };

  const roleLabel = roleLoading
    ? "Ρόλος: …"
    : role === "tenant"
      ? "Ρόλος: Ενοικιαστής"
      : role === "owner"
        ? "Ρόλος: Ιδιοκτήτης"
        : "Ρόλος: —";

  return (
    <header className="bg-white border-b">
      <div className="mx-auto max-w-5xl px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="font-semibold">Rentiva</div>

          {token && (
            <span className="text-[11px] px-2 py-1 rounded-full border bg-gray-50 text-gray-700">
              {roleLabel}
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          {token && (
            <button
              onClick={onChangeRole}
              className="text-sm px-3 py-1.5 rounded-xl border hover:bg-gray-50"
              title="Άλλαξε ρόλο"
            >
              Αλλαγή ρόλου
            </button>
          )}

          <button
            onClick={onLogout}
            className="text-sm px-3 py-1.5 rounded-xl border hover:bg-gray-50"
          >
            Logout
          </button>
        </div>
      </div>
    </header>
  );
}
