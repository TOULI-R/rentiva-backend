const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const Property = require('../models/Property');
const { validateObjectIdParam, requireBody } = require('../middleware/validate');

// Λίστα με pagination, αναζήτηση, includeDeleted
router.get('/', async (req, res, next) => {
  try {
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const pageSize = Math.min(50, Math.max(1, parseInt(req.query.pageSize, 10) || 10));
    const includeDeleted = req.query.includeDeleted === 'true';
    const q = (req.query.q || '').toString().trim();

    const filter = {};
    if (!includeDeleted) filter.deletedAt = null;
    if (q) {
      filter.$or = [
        { title:   { $regex: q, $options: 'i' } },
        { address: { $regex: q, $options: 'i' } },
      ];
    }

    const [items, total] = await Promise.all([
      Property.find(filter)
        .sort({ createdAt: -1 })
        .skip((page - 1) * pageSize)
        .limit(pageSize),
      Property.countDocuments(filter),
    ]);

    res.json({ items, total, page, pageSize });
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

// Restore (PATCH, με σταθερό path)
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

// Δημιουργία απλή (κρατάμε όπως το είχαμε)
router.post('/create-simple', requireBody(['title']), async (req, res, next) => {
  try {
    const landlordId = req.user?.id || req.user?._id;
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
