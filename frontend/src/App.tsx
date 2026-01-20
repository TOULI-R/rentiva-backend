import { useEffect, useState, type ReactNode } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";

import PublicCompatibility from "./pages/PublicCompatibilityPage";
import Login from "./pages/Login";
import Properties from "./pages/Properties";
import PropertyDetails from "./pages/PropertyDetails";
import ChooseRole from "./pages/ChooseRolePage";
import TenantHome from "./pages/TenantHomePage";

import api, { storage, type UserRole } from "./lib/api";
import { NotificationProvider } from "./lib/notifications";

type RequireAuthProps = {
  children: ReactNode;
};

function RequireAuth({ children }: RequireAuthProps) {
  const token = storage.getToken();
  if (!token) return <Navigate to="/login" replace />;
  return children;
}

function RequireRole({
  children,
  allow,
}: {
  children: ReactNode;
  allow: Exclude<UserRole, null>;
}) {
  const token = storage.getToken();
  const [loading, setLoading] = useState(true);
  const [role, setRole] = useState<UserRole>(null);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        if (!token) {
          if (!cancelled) setRole(null);
          return;
        }
        const me = await api.me();
        if (!cancelled) setRole((me?.role ?? null) as UserRole);
      } catch {
        if (!cancelled) setRole(null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [token]);

  if (!token) return <Navigate to="/login" replace />;

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="mx-auto max-w-4xl px-4 py-6">
          <div className="animate-pulse bg-white rounded-xl shadow h-24" />
        </div>
      </div>
    );
  }

  if (!role) return <Navigate to="/choose-role" replace />;

  if (role !== allow) {
    return <Navigate to={role === "tenant" ? "/tenant" : "/properties"} replace />;
  }

  return children;
}

function PostLoginRedirect() {
  const token = storage.getToken();
  const [loading, setLoading] = useState(true);
  const [role, setRole] = useState<UserRole>(null);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        if (!token) {
          if (!cancelled) setRole(null);
          return;
        }
        const me = await api.me();
        if (!cancelled) setRole((me?.role ?? null) as UserRole);
      } catch {
        if (!cancelled) setRole(null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [token]);

  if (!token) return <Navigate to="/login" replace />;

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="mx-auto max-w-4xl px-4 py-6">
          <div className="animate-pulse bg-white rounded-xl shadow h-24" />
        </div>
      </div>
    );
  }

  if (!role) return <Navigate to="/choose-role" replace />;

  return <Navigate to={role === "tenant" ? "/tenant" : "/properties"} replace />;
}

export default function App() {
  const token = storage.getToken();

  return (
    <NotificationProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<PostLoginRedirect />} />
          <Route path="/login" element={token ? <PostLoginRedirect /> : <Login />} />

          {/* Public compatibility page */}
          <Route path="/tairiazoume/:shareKey" element={<PublicCompatibility />} />

          {/* Role chooser */}
          <Route
            path="/choose-role"
            element={
              <RequireAuth>
                <ChooseRole />
              </RequireAuth>
            }
          />

          {/* Tenant area */}
          <Route
            path="/tenant"
            element={
              <RequireRole allow="tenant">
                <TenantHome />
              </RequireRole>
            }
          />

          {/* Owner area */}
          <Route
            path="/properties"
            element={
              <RequireRole allow="owner">
                <Properties />
              </RequireRole>
            }
          />
          <Route
            path="/properties/:id"
            element={
              <RequireRole allow="owner">
                <PropertyDetails />
              </RequireRole>
            }
          />

          {/* Default */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </NotificationProvider>
  );
}
