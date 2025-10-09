// index.js
require('dotenv').config(); // ΠΡΩΤΟ!

const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');

const app = express();
app.use(express.json());

// ---- CORS allow-list (από .env) ----
const allowlist = (process.env.CORS_ORIGINS || 'http://localhost:5173,http://localhost:3000')
  .split(',')
  .map(s => s.trim())
  .filter(Boolean);

const corsOptions = {
  origin(origin, cb) {
    if (!origin) return cb(null, true);            // server-to-server / curl / Postman
    const ok = allowlist.includes(origin);
    return cb(null, ok);                            // ok -> βάζει ACAO header, αλλιώς όχι (browser μπλοκ)
  },
  credentials: true,
  methods: ['GET','POST','PUT','PATCH','DELETE','OPTIONS'],
  allowedHeaders: ['Content-Type','Authorization'],
};
app.use(cors(corsOptions));
app.options('*', cors(corsOptions));
// ------------------------------------

// sanity log
console.log('[BOOT]', {
  PORT: process.env.PORT || 5001,
  AUTH_OFF: process.env.AUTH_OFF,
  NODE_ENV: process.env.NODE_ENV || 'dev',
  ALLOWLIST: allowlist,
});

mongoose
  .connect(process.env.MONGO_URI)
  .then(() => {
    console.log('MongoDB connected');

    // --- Security middleware ---
    app.use(helmet());

    // Γενικό rate limit (π.χ. 200 req/15m ανά IP)
    const apiLimiter = rateLimit({
      windowMs: Number(process.env.RL_WINDOW_MS || 15 * 60 * 1000),
      max: Number(process.env.RL_MAX || 200),
      standardHeaders: true,
      legacyHeaders: false,
      message: { error: 'Too many requests, slow down.' },
    });
    app.use(apiLimiter);

    // Πιο αυστηρό για /auth (π.χ. 20 req/15m ανά IP)
    const authLimiter = rateLimit({
      windowMs: Number(process.env.RL_AUTH_WINDOW_MS || 15 * 60 * 1000),
      max: Number(process.env.RL_AUTH_MAX || 20),
      standardHeaders: true,
      legacyHeaders: false,
      message: { error: 'Too many auth requests, try later.' },
    });

    // Routers
    const authRouter = require('./routes/auth');
    const propertiesRouter = require('./routes/properties');

    app.use('/api/auth', authLimiter, authRouter);
    app.use('/api/properties', propertiesRouter);

    // Healthcheck
    app.get('/api/health', (req, res) => {
      res.json({
        ok: true,
        port: Number(process.env.PORT || 5001),
        auth_off: process.env.AUTH_OFF === 'true',
      });
    });

    // Error handlers (τελευταία)
    const { notFound, errorHandler } = require('./middleware/errors');
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

// safeguard για unhandled promises
process.on('unhandledRejection', (reason) => {
  console.error('UNHANDLED REJECTION:', reason);
});
