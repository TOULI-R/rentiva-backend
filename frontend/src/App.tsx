import { useEffect, useState } from "react";
const API_URL = import.meta.env.VITE_API_URL as string;

export default function App() {
  const [health, setHealth] = useState<string>("…");

  useEffect(() => {
    fetch(`${API_URL}/health`)
      .then(r => r.json())
      .then(d => setHealth(JSON.stringify(d)))
      .catch(() => setHealth("⚠️ API unreachable"));
  }, []);

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="border-b bg-white">
        <div className="app-container py-4">
          <h1 className="text-2xl font-bold text-indigo-600">Rentiva</h1>
          <p className="text-sm text-gray-500">Frontend scaffold (Vite + Tailwind)</p>
        </div>
      </header>

      <main className="app-container py-8 space-y-6">
        <section className="bg-white rounded-2xl shadow p-6">
          <h2 className="text-lg font-medium mb-2">Health check</h2>
          <p className="text-sm text-gray-600">
            <span className="font-mono">GET {API_URL}/health</span>
          </p>
          <pre className="mt-3 p-3 bg-gray-100 rounded-lg overflow-auto text-sm">
{health}
          </pre>
        </section>

        <section className="bg-white rounded-2xl shadow p-6">
          <h2 className="text-lg font-medium mb-2">Tailwind test</h2>
          <div className="text-3xl font-semibold">✅ Tailwind classes αποδίδονται</div>
        </section>
      </main>
    </div>
  );
}
