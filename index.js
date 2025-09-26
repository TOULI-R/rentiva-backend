// index.js
require('dotenv').config(); // ΠΡΩΤΟ!

const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');

const app = express();
app.use(cors());
app.use(express.json());

// προαιρετικό log για sanity
console.log('[BOOT]', {
  PORT: process.env.PORT || 5001,
  AUTH_OFF: process.env.AUTH_OFF,
  NODE_ENV: process.env.NODE_ENV || 'dev',
});

// Σύνδεση Mongo και ΜΕΤΑ routers + listen
mongoose
  .connect(process.env.MONGO_URI)
  .then(() => {
    console.log('MongoDB connected');

    // Routers
    const authRouter = require('./routes/auth');
    const propertiesRouter = require('./routes/properties');

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

    // Κεντρικός error handler (ΠΡΕΠΕΙ να μπαίνει στο τέλος)
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

// Προαιρετικά: safeguard για απρόβλεπτα promises
process.on('unhandledRejection', (reason) => {
  console.error('UNHANDLED REJECTION:', reason);
});
