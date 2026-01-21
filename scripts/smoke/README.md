# Smoke scripts — Health Passport (v1)

Τα παρακάτω scripts κάνουν γρήγορο έλεγχο API για το Property Health Passport (v1).

## Προαπαιτούμενα
- Backend να τρέχει (π.χ. http://localhost:5001)
- Υπάρχει χρήστης (default: eleni@email.com / 1234_password)

## Environment variables (προαιρετικά)
- API_BASE (default: http://localhost:5001/api)
- EMAIL (default: eleni@email.com)
- PASS (default: 1234_password)

Παράδειγμα:
API_BASE="http://localhost:5001/api" EMAIL="eleni@email.com" PASS="1234_password"

## Scripts

### 1) smoke-healthpass.js
- Κάνει login
- Δημιουργεί property "HP Smoke" με healthPassport
- Κάνει PATCH στο healthPassport (plumbing/electrical/notes)
- Κάνει GET το property και τυπώνει το healthPassport

Run:
API_BASE="http://localhost:5001/api" node scripts/smoke/smoke-healthpass.js

### 2) list-hp-smoke.js
- Κάνει login
- Φέρνει properties με q="HP Smoke" (pageSize=100)
- Τυπώνει id/title/address

Run:
node scripts/smoke/list-hp-smoke.js

### 3) delete-hp-smoke.js
- Κάνει login
- Φέρνει properties με q="HP Smoke"
- Κάνει soft delete (DELETE /properties/:id) για όλα

Run:
node scripts/smoke/delete-hp-smoke.js
