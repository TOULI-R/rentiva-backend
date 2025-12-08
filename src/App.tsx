import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import Login from "./pages/Login";
import Login from "./pages/Login";
import Properties from "./pages/Properties";
import Properties from "./pages/Properties";
import { storage } from "./lib/api";
import { storage } from "./lib/api";


function PrivateRoute({ children }: { children: JSX.Element }) {
function PrivateRoute({ children }: { children: JSX.Element }) {
  const token = storage.getToken();
  const token = storage.getToken();
  return token ? children : <Navigate to="/login" replace />;
  return token ? children : <Navigate to="/login" replace />;
}
}


export default function App() {
export default function App() {
  return (
  return (
    <BrowserRouter>
    <BrowserRouter>
      <Routes>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/login" element={<Login />} />
        <Route path="/properties" element={<PrivateRoute><Properties /></PrivateRoute>} />
        <Route path="/properties" element={<PrivateRoute><Properties /></PrivateRoute>} />
        <Route path="/" element={<Navigate to="/properties" replace />} />
        <Route path="/" element={<Navigate to="/properties" replace />} />
        <Route path="*" element={<Navigate to="/properties" replace />} />
        <Route path="*" element={<Navigate to="/properties" replace />} />
      </Routes>
      </Routes>
    </BrowserRouter>
    </BrowserRouter>
  );
  );
}
}
