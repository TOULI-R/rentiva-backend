# Rentiva – TODO Next

## ✅ Τι ολοκληρώθηκε μέχρι τώρα

- Backend & frontend τρέχουν σταθερά (API στο http://localhost:5001, frontend στο http://localhost:5173).
- Login με seed χρήστη:
  - Email: ELENI@email.com
  - Password: 1234_password
- Properties σελίδα:
  - Λίστα ακινήτων με:
    - πλήρη φόρμα καταχώρησης (τίτλος, διεύθυνση, ενοίκιο, τ.μ., όροφος, υπνοδωμάτια, μπάνια κ.λπ.)
    - στοιχεία κτιρίου (έτος κατασκευής, ανακαίνιση, θέρμανση, ενεργειακή κλάση, parking, ασανσέρ)
    - επίπλωση, κατοικίδια, οικονομικά (κοινόχρηστα, άλλα σταθερά έξοδα, εγγύηση, ελάχιστη διάρκεια)
    - περιγραφή και flags όπως billsIncluded
  - Client-side search (q) και φίλτρο includeDeleted.
  - Client-side pagination (page, pageSize).
  - Soft delete & restore για properties.
  - Inline edit σε σχεδόν όλα τα βασικά πεδία (με validation).

- Notifications system (toasts):
  - `NotificationsProvider` τυλίγει όλη την εφαρμογή.
  - Hook `useNotification` / `useNotifications` διαθέσιμο σε components.
  - Login:
    - Επιτυχής σύνδεση → πράσινο toast: "Συνδεθήκατε επιτυχώς."
    - Αποτυχία σύνδεσης → κόκκινο toast με μήνυμα λάθους.
  - Properties:
    - Χρήση `notifySuccess` / `notifyError` σε validation & update (π.χ. αποτυχία parsing αριθμών, επιτυχής ενημέρωση).
- Header / Logout:
  - Logout κουμπί στο Header:
    - Καθαρίζει το token (`storage.clearToken()`).
    - Δείχνει πράσινο toast: "Αποσυνδεθήκατε."
    - Κάνει `navigate("/login")`.

- Git:
  - Stable commit με working login + properties.
  - Επιπλέον commit για notifications + logout.
  - Όλα έχουν ανέβει στο origin/main.


## ��� Προτεραιότητες για τα επόμενα sessions (κώδικας)

1) **Server-side pagination & search (API + frontend)**
   - Backend:
     - Επέκταση `/api/properties` να δέχεται:
       - `page`, `pageSize`
       - `q` (αναζήτηση σε τίτλο/διεύθυνση)
       - `includeDeleted`
     - Επιστροφή structured αποτελέσματος:
       - `items`, `page`, `pageSize`, `totalItems`, `totalPages`
   - Frontend:
     - Προσαρμογή `api.listProperties(...)` να περνάει τα παραπάνω params.
     - Δέσιμο pagination UI με server-side δεδομένα.
   - Στόχος: να μπορούμε να κλιμακώσουμε σε πολλά properties χωρίς να βαραίνει το client.

2) **Βελτίωση UX στα Properties**
   - Ενοποίηση όλων των validation errors με καθαρά toast μηνύματα.
   - Καλύτερα μηνύματα στα ελληνικά για:
     - λάθος αριθμούς,
     - αποτυχία fetch/save,
     - soft delete / restore.

3) **Λεπτομερής σελίδα ακινήτου (Property detail page)**
   - Route π.χ. `/properties/:id`.
   - Πλήρης προβολή όλων των πληροφοριών (βασικά, κτίριο, οικονομικά, περιγραφή).
   - Προετοιμασία για μελλοντικά modules:
     - Condition Report / Digital Walkthrough.
     - Tenant Passport / FastLane.
     - Transparency Timeline (Phase A: events history).

4) **Render deploy fix (backend)**
   - Έλεγχος logs στο Render για το project `rentiva-backend`.
   - Διόρθωση start script, env vars ή build settings αν χρειάζεται.
   - Στόχος: σταθερό online API για demo.

5) **Refactor / cleanup (όταν υπάρχει άνεση χρόνου)**
   - Σπάσιμο του `Properties.tsx` σε μικρότερα components:
     - `PropertyForm`
     - `PropertyCard`
     - `PropertyEditForm`
   - Κοινά helpers για parsing αριθμών & validation.


## ��� Μελλοντικά (πέρα από το άμεσο MVP)

- **Tenant Passport & FastLane**
  - Προφίλ ενοικιαστή με structured στοιχεία & βαθμολογία αξιοπιστίας.
  - Δυνατότητα "Κάνε αίτηση με το διαβατήριό μου" σε αγγελίες.
  - Προτεραιότητα (FastLane) για καλές αγγελίες σε χρήστες με πλήρες Passport.

- **Home Services / Μετακόμιση & Τεχνικοί**
  - Module για μεταφορικές, ηλεκτρολόγους, υδραυλικούς μέσα από την εφαρμογή.
  - Ενσωμάτωση στο flow μετά τη μίσθωση.
  - Προ-συμπλήρωση στοιχείων ακινήτου.
  - Curated δίκτυο συνεργατών με ratings & SLA.

- **Condition Report / Digital Walkthrough**
  - Wizard για καταγραφή κατάστασης ακινήτου.
  - Photo uploads & structured checklists.

- **Accessibility & Inclusion Score**
  - Checklist προσβασιμότητας.
  - Φίλτρα αναζήτησης με βάση το accessibility score.

- **Transparency Timeline (Phase A)**
  - Βασικό ιστορικό γεγονότων του ακινήτου (δημιουργία, αλλαγές, μισθώσεις κ.λπ.).
  - Εμφάνιση αυτού του timeline στη σελίδα λεπτομερειών ακινήτου.

