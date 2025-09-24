require('dotenv').config(); // ασφαλιστική δικλείδα
// routes/properties.js
const express = require('express');
const router = express.Router();

const Property = require('../models/Property');
const auth = require('../middleware/auth'); // το κανονικό middleware
const {
  validateObjectIdParam,
  requireBody,
  ensurePositiveNumber,
} = require('../middleware/validate');

// Αν AUTH_OFF=true, παρακάμπτουμε το auth ΜΟΝΟ για dev
const maybeAuth = process.env.AUTH_OFF === 'true' ? (req, res, next) => next() : auth;

// CREATE
router.post(
  '/',
  maybeAuth,
  requireBody(['landlordId', 'title', 'address', 'rent']),
  ensurePositiveNumber('rent'),
  async (req, res) => {
    try {
      const { landlordId, title, address, rent, status } = req.body;
      const doc = await Property.create({ landlordId, title, address, rent, status });
      return res.status(201).json(doc);
    } catch (err) {
      return res.status(500).json({ error: 'Create failed', details: err.message });
    }
  }
);

// LIST (προαιρετικά φίλτρα: status, landlordId)
router.get('/', maybeAuth, async (req, res) => {
  try {
    const { status, landlordId } = req.query;
    const filter = {};
    if (status) filter.status = status;
    if (landlordId) filter.landlordId = landlordId;

    const docs = await Property.find(filter).sort({ createdAt: -1 });
    return res.json(docs);
  } catch (err) {
    return res.status(500).json({ error: 'List failed', details: err.message });
  }
});

// GET BY ID
router.get('/:id', maybeAuth, validateObjectIdParam('id'), async (req, res) => {
  try {
    const doc = await Property.findById(req.params.id);
    if (!doc) return res.status(404).json({ error: 'Property not found' });
    return res.json(doc);
  } catch (err) {
    return res.status(500).json({ error: 'Fetch failed', details: err.message });
  }
});

// UPDATE
router.put(
  '/:id',
  maybeAuth,
  validateObjectIdParam('id'),
  ensurePositiveNumber('rent'),
  async (req, res) => {
    try {
      const allowed = ['title', 'address', 'rent', 'status', 'landlordId'];
      const update = {};
      for (const k of allowed) {
        if (Object.prototype.hasOwnProperty.call(req.body, k)) update[k] = req.body[k];
      }
      const doc = await Property.findByIdAndUpdate(req.params.id, update, {
        new: true,
        runValidators: true,
      });
      if (!doc) return res.status(404).json({ error: 'Property not found' });
      return res.json(doc);
    } catch (err) {
      return res.status(500).json({ error: 'Update failed', details: err.message });
    }
  }
);

// DELETE (hard)
router.delete('/:id', maybeAuth, validateObjectIdParam('id'), async (req, res) => {
  try {
    const doc = await Property.findByIdAndDelete(req.params.id);
    if (!doc) return res.status(404).json({ error: 'Property not found' });
    return res.json({ ok: true, id: doc._id });
  } catch (err) {
    return res.status(500).json({ error: 'Delete failed', details: err.message });
  }
});

module.exports = router;
