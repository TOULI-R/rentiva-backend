// routes/auth.js
const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const requireAuth = require('../middleware/auth');

const router = express.Router();

// POST /api/auth/signup
router.post('/signup', async (req, res) => {
  try {
    const { name, email, password } = req.body || {};
    if (!name || !email || !password) {
      return res.status(400).json({ error: 'missing fields' });
    }

    const normalizedEmail = email.toLowerCase().trim();
    const existing = await User.findOne({ email: normalizedEmail });
    if (existing) {
      return res.status(409).json({ error: 'email exists' });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const user = await User.create({ name, email: normalizedEmail, passwordHash });

    return res.status(201).json({
      id: user.id,
      name: user.name,
      email: user.email,
      createdAt: user.createdAt.toISOString()
    });
  } catch (err) {
    console.error('signup error:', err);
    return res.status(500).json({ error: 'internal server error' });
  }
});

// POST /api/auth/login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body || {};
    if (!email || !password) {
      return res.status(400).json({ error: 'missing fields' });
    }

    const user = await User.findOne({ email: email.toLowerCase().trim() });
    if (!user) return res.status(401).json({ error: 'invalid credentials' });

    const ok = await bcrypt.compare(password, user.passwordHash);
    if (!ok) return res.status(401).json({ error: 'invalid credentials' });

    const token = jwt.sign(
      { sub: user.id, email: user.email },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    return res.json({ token });
  } catch (err) {
    console.error('login error:', err);
    return res.status(500).json({ error: 'internal server error' });
  }
});

// GET /api/auth/me (protected)
router.get('/me', requireAuth, async (req, res) => {
  // req.user = { id, email } από το middleware
  res.json(req.user);
});

module.exports = router;

