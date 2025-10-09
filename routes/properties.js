// routes/properties.js
const express = require('express');
const router = express.Router();

const Property = require('../models/Property');
const auth = require('../middleware/auth');
const {
  validateObjectIdParam,
  requireBody,
  ensurePositiveNumber,
} = require('../middleware/validate');

// Αν το AUTH_OFF='true' παρακάμπτει το auth (dev μόνο)
const maybeAuth = (req, res, next) =>
  process.env.AUTH_OFF === 'true' ? next() : auth(req, res, next);

/* ------------------------- CREATE ------------------------- */
router.post(
  '/',
  maybeAuth,
  requireBody('landlordId', 'title', 'address', 'rent'),
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

/* -------------------- LIST (with meta) -------------------- */
router.get('/', maybeAuth, async (req, res) => {
  try {
    const {
      page = '1',
      limit = '10',
      q,
      status,
      landlordId,
      includeDeleted,
      sort = 'createdAt',
      dir = 'desc',
    } = req.query;

    const filter = {};
    const includeDel =
      includeDeleted === '1' || includeDeleted === 'true' || includeDeleted === true;
    if (!includeDel) filter.isDeleted = { $ne: true };
    if (status) filter.status = status;
    if (landlordId) filter.landlordId = landlordId;
    if (q && q.trim()) {
      const rx = new RegExp(q.trim(), 'i');
      filter.$or = [{ title: rx }, { address: rx }];
    }

    const direction = dir === 'asc' ? 1 : -1;
    const sortSpec = { [sort]: direction };

    const pageNum = Math.max(parseInt(page, 10) || 1, 1);
    const limitNum = Math.min(Math.max(parseInt(limit, 10) || 10, 1), 100);
    const skip = (pageNum - 1) * limitNum;

    const [total, data] = await Promise.all([
      Property.countDocuments(filter),
      Property.find(filter).sort(sortSpec).skip(skip).limit(limitNum),
    ]);

    return res.json({
      meta: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages: Math.max(Math.ceil(total / limitNum), 1),
        sort,
        dir: direction === 1 ? 'asc' : 'desc',
        q: q || null,
        filters: { status: status || null, landlordId: landlordId || null, includeDeleted: includeDel },
      },
      data,
    });
  } catch (err) {
    return res.status(500).json({ error: 'List failed', details: err.message });
  }
});

/* ------------------------- GET BY ID ---------------------- */
router.get('/:id', maybeAuth, validateObjectIdParam('id'), async (req, res) => {
  try {
    const includeDel =
      req.query.includeDeleted === '1' ||
      req.query.includeDeleted === 'true' ||
      req.query.includeDeleted === true;

    const doc = await Property.findById(req.params.id);
    if (!doc) return res.status(404).json({ error: 'Property not found' });
    if (doc.isDeleted && !includeDel)
      return res.status(404).json({ error: 'Property not found' });

    return res.json(doc);
  } catch (err) {
    return res.status(500).json({ error: 'Fetch failed', details: err.message });
  }
});

/* ------------------------- UPDATE ------------------------ */
router.put(
  '/:id',
  maybeAuth,
  validateObjectIdParam('id'),
  ensurePositiveNumber('rent'),
  async (req, res) => {
    try {
      const allowed = ['title', 'address', 'rent', 'status', 'landlordId'];
      const update = {};
      for (const k of allowed) if (Object.prototype.hasOwnProperty.call(req.body, k)) update[k] = req.body[k];

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

/* ------------------------ SOFT DELETE --------------------- */
router.delete('/:id', maybeAuth, validateObjectIdParam('id'), async (req, res) => {
  try {
    const doc = await Property.findByIdAndUpdate(
      req.params.id,
      { isDeleted: true, deletedAt: new Date() },
      { new: true }
    );
    if (!doc) return res.status(404).json({ error: 'Property not found' });
    return res.json({ ok: true, id: doc._id.toString(), isDeleted: true });
  } catch (err) {
    return res.status(500).json({ error: 'Delete failed', details: err.message });
  }
});

/* ------------------------- RESTORE ------------------------ */
router.patch('/:id/restore', maybeAuth, validateObjectIdParam('id'), async (req, res) => {
  try {
    const doc = await Property.findByIdAndUpdate(
      req.params.id,
      { isDeleted: false, deletedAt: null },
      { new: true }
    );
    if (!doc) return res.status(404).json({ error: 'Property not found' });
    return res.json({ ok: true, id: doc._id.toString(), isDeleted: false });
  } catch (err) {
    return res.status(500).json({ error: 'Restore failed', details: err.message });
  }
});

module.exports = router;
