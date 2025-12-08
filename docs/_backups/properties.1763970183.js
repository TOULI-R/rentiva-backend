const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const Property = require('../models/Property');
const { validateObjectIdParam, requireBody, ensurePositiveNumber } = require('../middleware/validate');

// Λίστα (με includeDeleted)
router.get('/', async (req, res, next) => {
  try {
    const query = {};
    if (req.query.includeDeleted !== 'true') {
      query.deletedAt = null;
    }
    const items = await Property.find(query).sort({ createdAt: -1 });
    res.json(items);
  } catch (e) { next(e); }
});

// Soft delete
router.delete('/:id', validateObjectIdParam('id'), async (req, res, next) => {
  try {
    const p = await Property.findByIdAndUpdate(
      req.params.id,
      { $set: { deletedAt: new Date() } },
      { new: true }
    );
    if (!p) return res.status(404).json({ error: 'Property not found' });
    res.json(p);
  } catch (e) { next(e); }
});

// Restore (PATCH)
router.patch('/:id/restore', validateObjectIdParam('id'), async (req, res, next) => {
  try {
    const p = await Property.findByIdAndUpdate(
      req.params.id,
      { $set: { deletedAt: null } },
      { new: true }
    );
    if (!p) return res.status(404).json({ error: 'Property not found' });
    res.json(p);
  } catch (e) { next(e); }
});

// Δημιουργία απλή
router.post('/create-simple', requireBody(['title']), async (req, res, next) => {
  try {
    const landlordId = req.user?.id || req.user?._id; // από το auth middleware
    const doc = await Property.create({
      title: req.body.title,
      address: req.body.address ?? undefined,
      rent: (typeof req.body.rent === 'number') ? req.body.rent : undefined,
      landlordId: landlordId || undefined,
      deletedAt: null,
    });
    res.status(201).json(doc);
  } catch (e) { next(e); }
});

module.exports = router;
