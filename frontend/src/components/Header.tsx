import { useEffect, useState } from "react";
import api from "../lib/api";
import { useNavigate, Link } from "react-router-dom";

export default function Header() {
  const [email, setEmail] = useState<string>("");
  const navigate = useNavigate();

  useEffect(() => {
    let mounted = true;
    api
      .me()
      .then((u: any) => {
        if (!mounted) return;
        setEmail(u?.email || "");
      })
      .catch(() => {
        // αν αποτύχει, αδιαφορούμε εδώ
      });
    return () => {
      mounted = false;
    };
  }, []);

  const onLogout = () => {
    api.logout();
    navigate("/login", { replace: true });
  };

  return (
    <header className="w-full border-b bg-white sticky top-0 z-10">
      <div className="mx-auto max-w-5xl px-4 py-3 flex items-center justify-between">
        <Link to="/properties" className="flex items-center gap-2">
          <span className="text-xl font-bold">Rentiva</span>
          <span className="text-xs px-2 py-0.5 border rounded-full">alpha</span>
        </Link>
        <div className="flex items-center gap-3">
          {email ? (
            <span className="text-sm text-gray-600 hidden sm:inline">
              {email}
            </span>
          ) : null}
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
