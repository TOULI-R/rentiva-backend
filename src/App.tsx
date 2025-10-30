import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import Login from "./pages/Login";
import Properties from "./pages/Properties";
import { storage } from "./lib/api";

function PrivateRoute({ children }: { children: JSX.Element }) {
  const token = storage.getToken();
  return token ? children : <Navigate to="/login" replace />;
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/properties" element={<PrivateRoute><Properties /></PrivateRoute>} />
        <Route path="/" element={<Navigate to="/properties" replace />} />
        <Route path="*" element={<Navigate to="/properties" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
