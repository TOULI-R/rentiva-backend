import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import Login from "./pages/Login";
import Properties from "./pages/Properties";
import { storage } from "./lib/api";
import { NotificationsProvider } from "./lib/notifications";

type RequireAuthProps = {
  children: JSX.Element;
};

function RequireAuth({ children }: RequireAuthProps) {
  const token = storage.getToken();
  if (!token) {
    return <Navigate to="/login" replace />;
  }
  return children;
}

export default function App() {
  const token = storage.getToken();

  return (
    <NotificationsProvider>
      <BrowserRouter>
        <Routes>
          <Route
            path="/login"
            element={token ? <Navigate to="/properties" replace /> : <Login />}
          />
          <Route
            path="/properties"
            element={
              <RequireAuth>
                <Properties />
              </RequireAuth>
            }
          />
          <Route path="*" element={<Navigate to="/properties" replace />} />
        </Routes>
      </BrowserRouter>
    </NotificationsProvider>
  );
}
