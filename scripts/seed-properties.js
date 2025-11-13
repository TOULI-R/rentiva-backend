const BASE = "http://localhost:5001/api";
const EMAIL = "eleni@email.com";
const PASSWORD = "1234_password";

// Μικρή παύση για να μην πέσουμε σε rate-limits
const sleep = (ms) => new Promise(r => setTimeout(r, ms));

async function main() {
  // 1) Login -> token
  const loginRes = await fetch(`${BASE}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: EMAIL, password: PASSWORD })
  });
  if (!loginRes.ok) {
    const t = await loginRes.text();
    throw new Error("Login failed: " + loginRes.status + " " + t);
  }
  const { token } = await loginRes.json();
  if (!token) throw new Error("No token in login response");

  // 2) Δεδομένα προς εισαγωγή
  const items = [
    { title: "Κέντρο", address: "Πανεπιστημίου 10", rent: 700 },
    { title: "Παγκράτι", address: "Ευφρονίου 5", rent: 680 },
    { title: "Κουκάκι", address: "Δράκου 12", rent: 820 },
    { title: "Νέα Σμύρνη", address: "Ομήρου 45", rent: 750 },
    { title: "Χαλάνδρι", address: "Αγίας Παρασκευής 3", rent: 900 },
    { title: "Μετς", address: "Αναπαύσεως 8", rent: 720 },
    { title: "Εξάρχεια", address: "Θεμιστοκλέους 60", rent: 640 },
    { title: "Κηφισιά", address: "Κολοκοτρώνη 2", rent: 1300 },
    { title: "Γκάζι", address: "Περσεφόνης 20", rent: 780 },
    { title: "Πετράλωνα", address: "Τριών Ιεραρχών 15", rent: 690 },
    { title: "Αμπελόκηποι", address: "Λουίζης Ριανκούρ 50", rent: 770 },
    { title: "Ζωγράφου", address: "Γρηγορίου Αυξεντίου 9", rent: 560 },
    { title: "Βύρωνας", address: "Κολοκοτρώνη 18", rent: 590 },
    { title: "Καλλιθέα", address: "Θεσσαλονίκης 7", rent: 650 },
    { title: "Μαρούσι", address: "Κηφισίας 120", rent: 950 },
    { title: "Νέα Ιωνία", address: "Ηρακλείου 210", rent: 600 },
    { title: "Πειραιάς", address: "Ηρώων Πολυτεχνείου 30", rent: 700 },
    { title: "Περιστέρι", address: "Θηβών 180", rent: 620 },
    { title: "Ηλιούπολη", address: "Μαρίνου Αντύπα 4", rent: 680 },
    { title: "Γλυφάδα", address: "Μεταξά 5", rent: 1400 }
  ];

  // 3) Δημιουργία μέσω /properties/create-simple
  let ok = 0, fail = 0;
  for (const it of items) {
    const res = await fetch(`${BASE}/properties/create-simple`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify(it)
    });
    if (res.ok) ok++;
    else {
      fail++;
      const t = await res.text().catch(() => "");
      console.log("FAIL:", it.title, res.status, t);
    }
    await sleep(120); // ήπια παύση
  }
  console.log("Seed finished:", { ok, fail });
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
