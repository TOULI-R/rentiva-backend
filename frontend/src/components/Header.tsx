import { useNavigate, NavLink } from "react-router-dom";

export default function Header() {
  const nav = useNavigate();
  const loggedIn = Boolean(localStorage.getItem("token"));

  const logout = () => {
    localStorage.removeItem("token");
    nav("/login", { replace: true });
  };

  return (
    <header className="border-b">
      <div className="app-container py-3 flex items-center justify-between">
        <NavLink to="/properties" className="font-bold text-lg">
          Rentiva
        </NavLink>
        <nav className="flex items-center gap-3">
          {loggedIn && (
            <>
              <NavLink to="/properties" className="text-sm">Properties</NavLink>
              <button onClick={logout} className="text-sm border px-3 py-1 rounded">
                Logout
              </button>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}
