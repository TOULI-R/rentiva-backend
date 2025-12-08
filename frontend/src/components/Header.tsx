import { storage } from "../lib/api";

export default function Header() {
  const onLogout = () => {
    storage.clearToken();
    window.location.href = "/login";
  };
  return (
    <header className="bg-white border-b">
      <div className="mx-auto max-w-5xl px-4 py-3 flex items-center justify-between">
        <div className="font-semibold">Rentiva</div>
        <button onClick={onLogout} className="text-sm px-3 py-1.5 rounded-xl border hover:bg-gray-50">
          Logout
        </button>
      </div>
    </header>
  );
}
