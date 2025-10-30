import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { login } from '../lib/api';

export default function Login() {
  const [email, setEmail] = useState('ELENI@email.com');
  const [password, setPassword] = useState('1234_password');
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const nav = useNavigate();

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr(null); setLoading(true);
    try {
      const { token } = await login(email, password);
      localStorage.setItem('token', token);
      nav('/properties');
    } catch (e: any) {
      setErr(e.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center">
      <form onSubmit={onSubmit} className="app-container w-full max-w-sm space-y-3">
        <h1 className="text-2xl font-bold">Rentiva – Login</h1>

        <div>
          <label className="text-sm">Email</label>
          <input
            className="w-full border p-2 rounded"
            value={email}
            onChange={(e)=>setEmail(e.target.value)}
          />
        </div>

        <div>
          <label className="text-sm">Password</label>
          <input
            className="w-full border p-2 rounded"
            type="password"
            value={password}
            onChange={(e)=>setPassword(e.target.value)}
          />
        </div>

        {err && <div className="text-red-600 text-sm">{err}</div>}

        <button disabled={loading} className="w-full py-2 rounded bg-black text-white">
          {loading ? '...' : 'Login'}
        </button>
      </form>
    </div>
  );
}
