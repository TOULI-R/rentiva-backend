// routes/auth.js
require('dotenv').config();
const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const User = require('../models/User');
const auth = require('../middleware/auth'); // <-- Χρειαζόμαστε το middleware για /me

const router = express.Router();

// Ping για έλεγχο mount
router.get('/ping', (req, res) => res.json({ ok: true, scope: 'auth' }));

/**
 * POST /api/auth/login
 * body: { email, password }
 * returns: { token }
 */
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body || {};
    if (!email || !password) {
      return res.status(400).json({ error: 'missing fields' });
    }

    const user = await User.findOne({ email });
    if (!user) return res.status(401).json({ error: 'invalid credentials' });

    // Υποστηρίζει παλαιότερες εγγραφές: κοιτά passwordHash, αλλιώς password
    const hash = user.passwordHash || user.password;
    if (!hash) {
      return res.status(500).json({ error: 'user has no passwordHash set' });
    }

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

/**
 * DEV register (προαιρετικό)
 * body: { name, email, password }
 * αποθηκεύει σε passwordHash
 */
router.post('/register', async (req, res) => {
  try {
    const { name, email, password } = req.body || {};
    if (!email || !password) {
      return res.status(400).json({ error: 'missing fields' });
    }
    const exists = await User.findOne({ email });
    if (exists) return res.status(409).json({ error: 'email already exists' });

    const passwordHash = await bcrypt.hash(password, 10);
    const user = await User.create({ name: name || 'User', email, passwordHash });

    res.status(201).json({ id: user._id.toString(), email: user.email });
  } catch (err) {
    res.status(500).json({ error: 'register failed', details: err.message });
  }
});

/**
 * GET /api/auth/me
 * Header: Authorization: Bearer <token>
 * returns: user public info
 */
router.get('/me', auth, async (req, res) => {
  try {
    const u = await User.findById(req.userId).select('_id name email createdAt updatedAt role');
    if (!u) return res.status(404).json({ error: 'user not found' });
    res.json(u);
  } catch (err) {
    res.status(500).json({ error: 'me failed', details: err.message });
  }
});


/**
 * PATCH /api/auth/role
 * Header: Authorization: Bearer <token>
 * body: { role: "tenant" | "owner" }
 * returns: { role }
 */
router.patch('/role', auth, async (req, res) => {
  try {
    const role = String(req.body?.role || '').trim().toLowerCase();
    if (role !== 'tenant' && role !== 'owner') {
      return res.status(400).json({ error: 'invalid role' });
    }

    const u = await User.findById(req.userId);
    if (!u) return res.status(404).json({ error: 'user not found' });

    u.role = role;
    await u.save();

    res.json({ role: u.role });
  } catch (err) {
    res.status(500).json({ error: 'set role failed', details: err.message });
  }
});


module.exports = router;
