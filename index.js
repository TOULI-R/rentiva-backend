// index.js  (CommonJS)

// ── Φόρτωση .env με ρητό path ─────────────────────────────────────────────
const path = require('path');
const dotenvPath = path.join(__dirname, '.env');
require('dotenv').config({ path: dotenvPath });

console.log('[BOOT]', {
  dotenvPath,
  hasMongo: !!process.env.MONGO_URI,
  PORT: process.env.PORT || 5001,
  AUTH_OFF: process.env.AUTH_OFF,
  NODE_ENV: process.env.NODE_ENV || 'dev',
});

if (!process.env.MONGO_URI) {
  console.error('FATAL: MONGO_URI is missing; check .env at:', dotenvPath);
  process.exit(1);
}
// ──────────────────────────────────────────────────────────────────────────

const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');

// Routers & error middleware
const authRouter = require('./routes/auth');
const propertiesRouter = require('./routes/properties');
const { notFound, errorHandler } = require('./middleware/errors');

// ── App & middleware ──────────────────────────────────────────────────────
const app = express();

// CORS allowlist από CORS_ORIGINS (comma-separated)
const allowlist = (process.env.CORS_ORIGINS || '')
  .split(',')
  .map(s => s.trim())
  .filter(Boolean);

const corsOptions = {
  origin(origin, cb) {
    if (!origin) return cb(null, true); // επιτρέπει curl/insomnia/same-origin
    if (allowlist.length === 0 || allowlist.includes(origin)) return cb(null, true);
    return cb(new Error('CORS blocked'), false);
  },
  credentials: true,
};

app.use(cors(corsOptions));
app.use(express.json());

// ── Σύνδεση Mongo ΚΑΙ ΜΕΤΑ mount routes + listen ─────────────────────────
mongoose
  .connect(process.env.MONGO_URI)
  .then(() => {
    console.log('MongoDB connected');

    // Routers
    app.use('/api/auth', authRouter);
    app.use('/api/properties', propertiesRouter);

    // Healthcheck
    app.get('/api/health', (req, res) => {
      res.json({
        ok: true,
        port: Number(process.env.PORT || 5001),
        auth_off: process.env.AUTH_OFF === 'true',
      });
    });

    // Error handlers (πρέπει να μπαίνουν τελευταίοι)
    app.use(notFound);
    app.use(errorHandler);

    const PORT = process.env.PORT || 5001;
    app.listen(PORT, () => {
      console.log(`API listening on http://localhost:${PORT}`);
    });
  })
  .catch((err) => {
    console.error('Mongo connection error:', err.message);
    process.exit(1);
  });

// Προαιρετικό: safeguard για απρόβλεπτα promises
process.on('unhandledRejection', (reason) => {
  console.error('UNHANDLED REJECTION:', reason);
});
