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

  const listRes = await fetch(`${BASE}/properties?page=1&pageSize=200&q=${encodeURIComponent("HP Smoke")}`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  if (!listRes.ok) throw new Error("List failed: " + JSON.stringify(await j(listRes)));

  const data = await j(listRes);
  const items = data.items || data.properties || [];

  console.log("To delete:", items.length);

  for (const p of items) {
    const delRes = await fetch(`${BASE}/properties/${p._id}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` }
    });

    if (!delRes.ok) {
      console.log("FAIL:", p._id, JSON.stringify(await j(delRes)));
    } else {
      console.log("DELETED:", p._id);
    }
  }

  console.log("Done.");
})();
