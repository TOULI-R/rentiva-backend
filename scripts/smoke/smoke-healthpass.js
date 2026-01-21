const BASE = process.env.API_BASE || "http://localhost:5001/api";
const EMAIL = process.env.EMAIL || "eleni@email.com";
const PASS  = process.env.PASS  || "1234_password";

async function j(res) {
  const text = await res.text();
  try { return JSON.parse(text); } catch { return { _raw: text }; }
}

async function main() {
  // login
  const loginRes = await fetch(`${BASE}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: EMAIL, password: PASS })
  });
  if (!loginRes.ok) throw new Error("Login failed: " + JSON.stringify(await j(loginRes)));
  const login = await j(loginRes);
  const token = login.token;
  if (!token) throw new Error("No token in login response: " + JSON.stringify(login));

  const auth = {
    "Content-Type": "application/json",
    "Authorization": `Bearer ${token}`
  };

  // create
  const createBody = {
    title: "HP Smoke",
    address: "Test Address",
    rent: 123,
    size: 45,
    balcony: true,
    healthPassport: {
      windowsYear: 2018,
      acYear: 2020,
      roofInsulationYear: 2015,
      notes: "initial hp"
    }
  };

  const createRes = await fetch(`${BASE}/properties/create-simple`, {
    method: "POST",
    headers: auth,
    body: JSON.stringify(createBody)
  });
  if (!createRes.ok) throw new Error("Create failed: " + JSON.stringify(await j(createRes)));
  const created = await j(createRes);

  const id = created?._id || created?.property?._id || created?.doc?._id;
  if (!id) throw new Error("Could not detect created property id: " + JSON.stringify(created));

  // update hp
  const patchRes = await fetch(`${BASE}/properties/${id}`, {
    method: "PATCH",
    headers: auth,
    body: JSON.stringify({
      healthPassport: {
        plumbingYear: 2017,
        electricalYear: 2016,
        notes: "updated hp"
      }
    })
  });
  if (!patchRes.ok) throw new Error("PATCH failed: " + JSON.stringify(await j(patchRes)));

  // get single
  const getRes = await fetch(`${BASE}/properties/${id}`, {
    method: "GET",
    headers: { "Authorization": `Bearer ${token}` }
  });
  if (!getRes.ok) throw new Error("GET failed: " + JSON.stringify(await j(getRes)));
  const p = await j(getRes);

  console.log("OK: property id =", id);
  console.log("healthPassport =", p.healthPassport);
}

main().catch((e) => { console.error(e); process.exit(1); });
