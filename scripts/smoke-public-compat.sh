#!/usr/bin/env bash
set -euo pipefail

API="http://localhost:5001/api"
FRONT="http://localhost:5174"

EMAIL="${RENTIVA_EMAIL:-eleni@email.com}"
PASS="${RENTIVA_PASSWORD:-1234_password}"

mkdir -p .tmp

echo "[1/3] LOGIN..."
LOGIN_JSON="$(curl -sS -H "Content-Type: application/json" \
  -d "{\"email\":\"$EMAIL\",\"password\":\"$PASS\"}" \
  "$API/auth/login")"

TOKEN="$(printf "%s" "$LOGIN_JSON" | sed -n 's/.*"token":"\([^"]*\)".*/\1/p')"
if [ -z "$TOKEN" ]; then
  echo "ERROR: Δεν βρήκα token. Response:"
  echo "$LOGIN_JSON"
  exit 1
fi

printf "%s" "$TOKEN" > .tmp/token.txt
echo "OK: token saved -> .tmp/token.txt (len=${#TOKEN})"

echo "[2/3] ME (role)..."
ME_JSON="$(curl -sS -H "Authorization: Bearer $TOKEN" "$API/auth/me")"
ROLE="$(printf "%s" "$ME_JSON" | sed -n 's/.*"role":"\([^"]*\)".*/\1/p')"
echo "ROLE: ${ROLE:-UNKNOWN}"

echo "[3/3] PROPERTIES -> pick shareKey (owner-only)..."
if [ "$ROLE" != "owner" ]; then
  echo "SKIP: /properties είναι owner-only. Θέλει owner credentials."
  echo "Tip: τρέξε με env vars:"
  echo "  RENTIVA_EMAIL=<OWNER_EMAIL> RENTIVA_PASSWORD=<PASS> ./scripts/smoke-public-compat.sh"
  exit 0
fi

RESP="$(curl -sS -H "Authorization: Bearer $TOKEN" "$API/properties?page=1&pageSize=20&includeDeleted=true")"
echo "$RESP" > .tmp/properties.json

SHAREKEY="$(printf "%s" "$RESP" | node - <<'NODE'
const fs = require("fs");
const input = fs.readFileSync(0,"utf8");
const j = JSON.parse(input);
const items = j.items || j.properties || j.data || (Array.isArray(j) ? j : []);
function pick(p){
  return p?.shareKey || p?.publicShareKey || p?.share_key || p?.share?.key || p?.public?.shareKey || null;
}
let sk = null;
for (const p of items) {
  const x = pick(p);
  if (x && /^[a-f0-9]{32}$/i.test(String(x))) { sk = String(x); break; }
}
process.stdout.write(sk || "");
NODE
)"

if [ -n "$SHAREKEY" ]; then
  echo "SHAREKEY: $SHAREKEY"
  echo "OPEN: $FRONT/tairiazoume/$SHAREKEY"
else
  echo "WARNING: Δεν βρήκα shareKey σε properties."
fi
