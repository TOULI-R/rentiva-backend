const BASE = process.env.API_BASE || "http://localhost:5001/api";
const EMAIL = process.env.EMAIL || "eleni@email.com";
const PASS  = process.env.PASS  || "1234_password";

async function j(r){ const t=await r.text(); try{return JSON.parse(t);}catch{return {raw:t}} }

(async () => {
  const loginRes = await fetch(`${BASE}/auth/login`, {
    method:"POST",
    headers:{"Content-Type":"application/json"},
    body: JSON.stringify({ email: EMAIL, password: PASS })
  });
  if (!loginRes.ok) throw new Error("Login failed: " + JSON.stringify(await j(loginRes)));

  const login = await j(loginRes);
  const token = login.token;
  if (!token) throw new Error("No token in login response");

  const res = await fetch(`${BASE}/properties?page=1&pageSize=100&q=${encodeURIComponent("HP Smoke")}`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  if (!res.ok) throw new Error("List failed: " + JSON.stringify(await j(res)));

  const data = await j(res);
  const items = data.items || data.properties || [];
  console.log("Found:", items.length);
  items.forEach(p => console.log(p._id, "-", p.title, "-", (p.address || "-")));
})();
