Rentiva – Next session
1) Login και έλεγχος ότι στέλνεται Authorization: Bearer <token> από frontend.
2) Επιβεβαίωση auto-logout σε 401/403 στο api.ts.
3) Δημιουργία property: να καλούμε σωστό endpoint (/properties ή /properties/create-simple) με {title, address, rent}.
4) Pagination:
   - Backend: ?page=&limit= με total/items.
   - Frontend: state για σελίδα, κουμπιά Προηγ/Επόμενη, εμφάνιση "Σελίδα X από Y".
