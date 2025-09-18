// index.js
require('dotenv').config();
console.log('⏺️ ENV MONGO_URI =', process.env.MONGO_URI);
const express  = require('express');
const cors     = require('cors');
const mongoose = require('mongoose');
const authRouter = require('./routes/auth');

const MONGO_URI = process.env.MONGO_URI;
if (!MONGO_URI) throw new Error('No MONGO_URI in .env');
mongoose
  .connect(MONGO_URI)
  .then(() => console.log('✅ Connected to MongoDB Atlas'))
  .catch(err => console.error('❌ MongoDB connection error:', err));

const app = express();
const PORT = process.env.PORT || 5001;

app.use(cors());
app.use(express.json());
app.use('/api/auth', authRouter);

// *debug-middleware για να βλέπουμε ότι δικτυώνεται στο API*
app.use('/api', (req, res, next) => {
  console.log(`➡️ ${req.method} ${req.originalUrl}`);
  next();
});
app.use(cors());
app.use(express.json());

// healthcheck
app.get('/health', (req, res) => {
  res.json({ ok: true, uptime: process.uptime() });
});

// *εδώ προσθέτουμε τον router*
const landlordsRouter = require('./routes/landlords');
app.use('/api/landlords', landlordsRouter);

app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
console.log(' ENV MONGO_URI =', process.env.MONGO_URI);