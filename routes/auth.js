// routes/auth.js
require('dotenv').config();
const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');

const router = express.Router();

router.get('/ping', (req, res) => res.json({ ok: true, scope: 'auth' }));

// LOGIN  (υποστηρίζει passwordHash, και fallback σε παλιό password πεδίο)
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body || {};
    if (!email || !password) return res.status(400).json({ error: 'missing fields' });

    const user = await User.findOne({ email });
    if (!user) return res.status(401).json({ error: 'invalid credentials' });

    const hash = user.passwordHash || user.password; // <- εδώ το fallback
    if (!hash) return res.status(500).json({ error: 'user has no passwordHash set' });

    const ok = await bcrypt.compare(password, hash);
    if (!ok) return res.status(401).json({ error: 'invalid credentials' });

    const token = jwt.sign(
      { id: user._id.toString(), email: user.email },
      process.env.JWT_SECRET,
      { expiresIn: '2h' }
    );
    res.json({ token });
  } catch (err) {
    res.status(500).json({ error: 'login failed', details: err.message });
  }
});

// REGISTER (DEV) – αποθηκεύει ΠΑΝΤΑ σε passwordHash
router.post('/register', async (req, res) => {
  try {
    const { name, email, password } = req.body || {};
    if (!email || !password) return res.status(400).json({ error: 'missing fields' });

    const exists = await User.findOne({ email });
    if (exists) return res.status(409).json({ error: 'email already exists' });

    const passwordHash = await bcrypt.hash(password, 10);  // <- ΣΩΣΤΟ ΠΕΔΙΟ
    const user = await User.create({ name: name || 'User', email, passwordHash });
    res.status(201).json({ id: user._id.toString(), email: user.email });
  } catch (err) {
    res.status(500).json({ error: 'register failed', details: err.message });
  }
});

module.exports = router;
