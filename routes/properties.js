// routes/properties.js
require('dotenv').config();
const express = require('express');
const router = express.Router();

const Property = require('../models/Property');
const auth = require('../middleware/auth'); // το κανονικό middleware
const {
  validateObjectIdParam,
  requireBody,
  ensurePositiveNumber,
} = require('../middleware/validate');

// Dev-bypass αν ποτέ χρειαστεί (βάλε AUTH_OFF=true στο .env)
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

// LIST (φίλτρα: status, landlordId; default exclude deleted)
router.get('/', maybeAuth, async (req, res) => {
  try {
    const { status, landlordId, includeDeleted } = req.query;
    const filter = {};
    if (!includeDeleted) filter.isDeleted = { $ne: true }; // δείχνει και τα παλιά χωρίς πεδίο
    if (status) filter.status = status;
    if (landlordId) filter.landlordId = landlordId;

    const docs = await Property.find(filter).sort({ createdAt: -1 });
    return res.json(docs);
  } catch (err) {
    return res.status(500).json({ error: 'List failed', details: err.message });
  }
});

// GET BY ID (κρύβει τα deleted εκτός αν includeDeleted=1)
router.get('/:id', maybeAuth, validateObjectIdParam('id'), async (req, res) => {
  try {
    const doc = await Property.findById(req.params.id);
    if (!doc) return res.status(404).json({ error: 'Property not found' });

    const showDeleted = req.query.includeDeleted == '1' || req.query.includeDeleted === 'true';
    if (doc.isDeleted && !showDeleted) {
      return res.status(404).json({ error: 'Property not found' });
    }
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

// SOFT DELETE -> isDeleted=true, deletedAt=now
router.delete('/:id', maybeAuth, validateObjectIdParam('id'), async (req, res) => {
  try {
    const doc = await Property.findByIdAndUpdate(
      req.params.id,
      { isDeleted: true, deletedAt: new Date() },
      { new: true }
    );
    if (!doc) return res.status(404).json({ error: 'Property not found' });
    return res.json({ ok: true, id: doc._id, isDeleted: doc.isDeleted });
  } catch (err) {
    return res.status(500).json({ error: 'Delete failed', details: err.message });
  }
});

// RESTORE -> isDeleted=false
router.patch('/:id/restore', maybeAuth, validateObjectIdParam('id'), async (req, res) => {
  try {
    const doc = await Property.findByIdAndUpdate(
      req.params.id,
      { isDeleted: false, deletedAt: null },
      { new: true }
    );
    if (!doc) return res.status(404).json({ error: 'Property not found' });
    return res.json(doc);
  } catch (err) {
    return res.status(500).json({ error: 'Restore failed', details: err.message });
  }
});

module.exports = router;
