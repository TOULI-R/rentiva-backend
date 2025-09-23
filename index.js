require('dotenv').config();
const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');

const authRouter = require('./routes/auth');
const landlordsRouter = require('./routes/landlords');
const propertiesRouter = require('./routes/properties'); // σωστό import

const MONGO_URI = process.env.MONGO_URI;
if (!MONGO_URI) throw new Error('No MONGO_URI in .env');

mongoose
  .connect(MONGO_URI)
  .then(() => console.log('✅ Connected to MongoDB Atlas'))
  .catch(err => console.error('❌ MongoDB connection error:', err));

const app = express();
const PORT = process.env.PORT || 5001;

// middlewares
app.use(cors());
app.use(express.json());

// debug (προαιρετικό)
app.use('/api', (req, _res, next) => {
  console.log(`${req.method} ${req.originalUrl}`);
  next();
});

// healthcheck
app.get('/health', (_req, res) => res.json({ ok: true, uptime: process.uptime() }));

// routers
app.use('/api/auth', authRouter);
app.use('/api/landlords', landlordsRouter);
app.use('/api/properties', propertiesRouter); // ΒΑΛ’ ΤΟ ΕΔΩ

app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
