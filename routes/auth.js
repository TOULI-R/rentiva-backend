const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const Landlord = require('../models/Landlord');

const router = express.Router();

router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    // Ζήτα ρητά τα πεδία με hash (αν έχουν select:false στο schema)
    const landlord = await Landlord
      .findOne({ email })
      .select('+passwordHash +password');

    if (!landlord) {
      return res.status(401).json({ error: 'invalid credentials' });
    }

    // Υποστήριξε και τις δύο ονομασίες πεδίου, για κάθε ενδεχόμενο
    const hashed = landlord.passwordHash || landlord.password;
    if (!hashed) {
      return res.status(401).json({ error: 'invalid credentials' });
    }

    const ok = await bcrypt.compare(password, hashed);
    if (!ok) {
      return res.status(401).json({ error: 'invalid credentials' });
    }

    const token = jwt.sign(
      { sub: landlord._id.toString(), email: landlord.email },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.json({ token });
  } catch (err) {
    console.error('POST /api/auth/login error:', err);
    res.status(500).json({ error: 'internal server error' });
  }
});

module.exports = router;
