// routes/properties.js
const express = require('express');
const requireAuth = require('../middleware/auth');
const Property = require('../models/Property');

const router = express.Router();

// Create
router.post('/', requireAuth, async (req, res) => {
  try {
    const { landlordId, title, address, rent, status } = req.body || {};
    if (!landlordId || !title || !address || rent == null) {
      return res.status(400).json({ error: 'missing fields' });
    }
    const doc = await Property.create({ landlordId, title, address, rent, status });
    res.status(201).json(doc);
  } catch (err) {
    console.error('POST /api/properties error:', err);
    res.status(500).json({ error: 'internal server error' });
  }
});

// List
router.get('/', requireAuth, async (_req, res) => {
  try {
    const docs = await Property.find().sort({ createdAt: -1 });
    res.json(docs);
  } catch (err) {
    console.error('GET /api/properties error:', err);
    res.status(500).json({ error: 'internal server error' });
  }
});

// Get by id
router.get('/:id', requireAuth, async (req, res) => {
  try {
    const doc = await Property.findById(req.params.id);
    if (!doc) return res.status(404).json({ error: 'not found' });
    res.json(doc);
  } catch {
    res.status(400).json({ error: 'invalid id' });
  }
});

// Update
router.put('/:id', requireAuth, async (req, res) => {
  try {
    const { title, address, rent, status } = req.body || {};
    const doc = await Property.findByIdAndUpdate(
      req.params.id,
      { $set: { title, address, rent, status } },
      { new: true, runValidators: true }
    );
    if (!doc) return res.status(404).json({ error: 'not found' });
    res.json(doc);
  } catch (err) {
    console.error('PUT /api/properties/:id error:', err);
    res.status(500).json({ error: 'internal server error' });
  }
});

// Delete
router.delete('/:id', requireAuth, async (req, res) => {
  try {
    const out = await Property.findByIdAndDelete(req.params.id);
    if (!out) return res.status(404).json({ error: 'not found' });
    res.json({ ok: true });
  } catch (err) {
    console.error('DELETE /api/properties/:id error:', err);
    res.status(500).json({ error: 'internal server error' });
  }
});

module.exports = router;

