const express = require('express');
const router = express.Router();
const Property = require('../models/Property');
const { validateObjectIdParam, requireBody } = require('../middleware/validate');

// GET /api/properties?q=&page=&pageSize=&includeDeleted=&sortBy=&sortDir=
router.get('/', async (req, res, next) => {
  try {
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const pageSize = Math.min(50, Math.max(1, parseInt(req.query.pageSize, 10) || 10));
    const includeDeleted = req.query.includeDeleted === 'true';
    const q = (req.query.q || '').toString().trim();

    const allowedSort = new Set(['createdAt','title','rent','address','deletedAt']);
    const sortBy = allowedSort.has(req.query.sortBy) ? req.query.sortBy : 'createdAt';
    const sortDir = req.query.sortDir === 'asc' ? 1 : -1;
    const sort = { [sortBy]: sortDir, _id: -1 };

    const filter = {};
    if (!includeDeleted) filter.deletedAt = null;
    if (q) {
      filter.$or = [
        { title:   { $regex: q, $options: 'i' } },
        { address: { $regex: q, $options: 'i' } },
      ];
    }

    const [items, total] = await Promise.all([
      Property.find(filter).sort(sort).skip((page - 1) * pageSize).limit(pageSize),
      Property.countDocuments(filter),
    ]);

    res.json({ items, total, page, pageSize });
  } catch (e) { next(e); }
});

// POST /api/properties/create-simple
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

// PATCH /api/properties/:id  (update title/address/rent)
router.patch('/:id', validateObjectIdParam('id'), async (req, res, next) => {
  try {
    const updates = {};
    if (typeof req.body.title === 'string')   updates.title = req.body.title.trim();
    if (typeof req.body.address === 'string') updates.address = req.body.address.trim();
    if (req.body.rent !== undefined) {
      const n = Number(req.body.rent);
      if (typeof n !== 'number' || Number.isNaN(n) || n < 0) {
        return res.status(400).json({ error: 'rent must be a number >= 0' });
      }
      updates.rent = n;
    }
    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ error: 'No valid fields to update' });
    }
    const p = await Property.findByIdAndUpdate(req.params.id, { $set: updates }, { new: true });
    if (!p) return res.status(404).json({ error: 'Property not found' });
    res.json(p);
  } catch (e) { next(e); }
});

// DELETE soft delete
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

// PATCH restore
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

module.exports = router;
