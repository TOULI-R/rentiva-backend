const auth = require('../middleware/auth');
const express = require('express');
const bcrypt = require('bcryptjs');
const Landlord = require('../models/Landlord');
const {
  Types: { ObjectId },
} = require('mongoose');

const router = express.Router();
router.use(auth); // απαιτεί JWT για όλα τα endpoints του router

/**
 * POST /api/landlords
 * Δημιουργία νέου landlord
 */
router.post('/', async (req, res) => {
  console.log('➡️ POST /api/landlords', req.body);
  try {
    const { name, email, phone, password } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ error: 'missing fields' });
    }

    const normalizedEmail = email.toLowerCase().trim();
    const existing = await Landlord.findOne({ email: normalizedEmail });
    if (existing) {
      return res.status(409).json({ error: 'email exists' });
    }

    const hash = await bcrypt.hash(password, 10);

    const landlord = await Landlord.create({
      name,
      email: normalizedEmail,
      phone,
      passwordHash: hash,
    });

    return res.status(201).json({
      id: landlord._id.toString(),
      name: landlord.name,
      email: landlord.email,
      createdAt: landlord.createdAt,
    });
  } catch (err) {
    console.error('❌ POST /api/landlords error:', err);
    if (err.code === 11000) {
      return res.status(409).json({ error: 'email exists' });
    }
    return res.status(500).json({ error: 'internal server error' });
  }
});

/**
 * GET /api/landlords
 * Λίστα landlords (χωρίς passwordHash)
 */
router.get('/', async (req, res) => {
  try {
    const rows = await Landlord.find({}).select('-passwordHash');
    const list = rows.map((doc) => ({
      id: doc._id.toString(),
      name: doc.name,
      email: doc.email,
      phone: doc.phone ?? null,
      createdAt: doc.createdAt?.toISOString?.() ?? null,
    }));
    return res.json(list);
  } catch (err) {
    console.error('❌ Error fetching landlords:', err);
    return res.status(500).json({ error: 'internal server error' });
  }
});

/**
 * GET /api/landlords/:id
 * Επιστροφή landlord με ασφαλή έλεγχο ObjectId
 */
router.get('/:id', async (req, res) => {
  let raw = req.params.id;
  let id = (raw || '').trim();

  // αφαίρεση τυχόν εισαγωγικών από copy/paste
  if (
    (id.startsWith('"') && id.endsWith('"')) ||
    (id.startsWith("'") && id.endsWith("'"))
  ) {
    id = id.slice(1, -1).trim();
  }

  console.log(
    '🔎 /api/landlords/:id got ->',
    JSON.stringify(raw),
    ' cleaned ->',
    id,
    'len',
    id.length
  );

  if (!ObjectId.isValid(id)) {
    return res.status(400).json({ error: 'invalid id' });
  }

  try {
    const doc = await Landlord.findById(id).select('-passwordHash');
    if (!doc) return res.status(404).json({ error: 'not found' });

    return res.json({
      id: doc._id.toString(),
      name: doc.name,
      email: doc.email,
      phone: doc.phone ?? null,
      createdAt: doc.createdAt?.toISOString?.() ?? null,
    });
  } catch (err) {
    console.error('❌ GET /api/landlords/:id error:', err);
    return res.status(500).json({ error: 'internal server error' });
  }
});
// UPDATE landlord
const mongoose = require('mongoose'); // αν υπάρχει ήδη, άστο—δεν πειράζει

router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    // Έλεγχος ότι το id είναι έγκυρο ObjectId
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ error: 'invalid id' });
    }

    // Επιτρεπτά πεδία για update
    const updates = {};
    const allowed = ['name', 'email', 'phone', 'password'];

    for (const key of allowed) {
      if (req.body[key] !== undefined) updates[key] = req.body[key];
    }

    // Αν αλλάζουμε κωδικό, φτιάξε hash
    if (updates.password) {
      const bcrypt = require('bcryptjs');
      updates.passwordHash = await bcrypt.hash(updates.password, 10);
      delete updates.password;
    }

    const updated = await Landlord.findByIdAndUpdate(
      id,
      updates,
      { new: true, runValidators: true, projection: { passwordHash: 0 } }
    );

    if (!updated) return res.status(404).json({ error: 'not found' });

    return res.json({
      id: updated._id.toString(),
      name: updated.name,
      email: updated.email,
      phone: updated.phone ?? null,
      createdAt: updated.createdAt.toISOString()
    });
  } catch (err) {
    console.error('❌ PUT /api/landlords/:id error:', err);
    return res.status(500).json({ error: 'internal server error' });
  }
});
// DELETE landlord
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    if (!require('mongoose').Types.ObjectId.isValid(id)) {
      return res.status(400).json({ error: 'invalid id' });
    }

    const deleted = await Landlord.findByIdAndDelete(id);
    if (!deleted) return res.status(404).json({ error: 'not found' });

    return res.status(204).send(); // No Content
  } catch (err) {
    console.error('❌ DELETE /api/landlords/:id error:', err);
    return res.status(500).json({ error: 'internal server error' });
  }
});

module.exports = router;

