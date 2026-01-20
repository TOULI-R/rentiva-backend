#!/usr/bin/env bash
set -euo pipefail

API="http://localhost:5001/api"
FRONT="http://localhost:5174"

EMAIL="${RENTIVA_EMAIL:-eleni@email.com}"
PASS="${RENTIVA_PASSWORD:-1234_password}"

mkdir -p .tmp

echo "[1/4] LOGIN..."
LOGIN_JSON="$(curl -sS -H "Content-Type: application/json" -d "{\"email\":\"$EMAIL\",\"password\":\"$PASS\"}" "$API/auth/login")"
TOKEN="$(printf "%s" "$LOGIN_JSON" | sed -n 's/.*"token":"\([^"]*\)".*/\1/p')"

if [ -z "$TOKEN" ]; then
  echo "ERROR: no token from /auth/login"
  echo "$LOGIN_JSON"
  exit 1
fi

printf "%s" "$TOKEN" > .tmp/token.txt
echo "OK: token saved -> .tmp/token.txt (len=${#TOKEN})"

echo "[2/4] ME (role)..."
ME_JSON="$(curl -sS -H "Authorization: Bearer $TOKEN" "$API/auth/me")"
ROLE="$(printf "%s" "$ME_JSON" | sed -n 's/.*"role":"\([^"]*\)".*/\1/p')"
echo "ROLE: ${ROLE:-UNKNOWN}"

echo "[3/4] PROPERTIES -> pick propertyId (owner-only)..."
if [ "${ROLE:-}" != "owner" ]; then
  echo "SKIP: /properties is owner-only. Run with owner creds:"
  echo "  RENTIVA_EMAIL=<OWNER_EMAIL> RENTIVA_PASSWORD=<PASS> ./scripts/smoke-public-compat.sh"
  exit 0
fi

RESP="$(curl -sS -H "Authorization: Bearer $TOKEN" "$API/properties?page=1&pageSize=20&includeDeleted=true")"
echo "$RESP" > .tmp/properties.json

PROPERTY_ID="$(printf "%s" "$RESP" | grep -oE '"_id":"[a-f0-9]{24}"' | head -n 1 | sed -n 's/.*"_id":"\([a-f0-9]\{24\}\)".*/\1/p')"
if [ -z "$PROPERTY_ID" ]; then
  echo "ERROR: no property _id found (create a property first)."
  exit 1
fi
echo "PROPERTY_ID: $PROPERTY_ID"

echo "[4/4] SHARE KEY -> POST /properties/:id/share-key ..."
SK_JSON="$(curl -sS -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" -d '{}' "$API/properties/$PROPERTY_ID/share-key")"
SHAREKEY="$(printf "%s" "$SK_JSON" | grep -oE '"shareKey":"[a-f0-9]{32}"' | head -n 1 | sed -n 's/.*"shareKey":"\([a-f0-9]\{32\}\)".*/\1/p')"

if [ -z "$SHAREKEY" ]; then
  echo "ERROR: share-key endpoint did not return shareKey"
  echo "$SK_JSON"
  exit 1
fi

echo "SHAREKEY: $SHAREKEY"
echo "OPEN: $FRONT/tairiazoume/$SHAREKEY"
