#!/usr/bin/env bash
set -euo pipefail
BASE="https://rentiva-backend-x35o.onrender.com"
EMAIL="dimi4@example.com"
PASS="secret123"
TOKEN=$(curl.exe --ssl-no-revoke -s -X POST "$BASE/api/auth/login" \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"$EMAIL\",\"password\":\"$PASS\"}" | tr -d '\r\n' | sed -E 's/.*"token":"([^"]+)".*/\1/')
curl.exe --ssl-no-revoke -s "$BASE/health"
curl.exe --ssl-no-revoke -s "$BASE/api/landlords" -H "Authorization: Bearer $TOKEN"
