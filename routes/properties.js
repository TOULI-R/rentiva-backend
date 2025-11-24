const express = require('express');
const router = express.Router();
const Property = require('../models/Property');
const { validateObjectIdParam, requireBody } = require('../middleware/validate');

// Λίστα (με pagination, search και με/χωρίς διαγεγραμμένα)
router.get('/', async (req, res, next) => {
  try {
    let { page = 1, pageSize = 10, q, includeDeleted } = req.query;

    // Μετατροπή σε αριθμούς και όρια ασφαλείας
    page = parseInt(page, 10);
    pageSize = parseInt(pageSize, 10);

    if (isNaN(page) || page < 1) page = 1;
    if (isNaN(pageSize) || pageSize < 1) pageSize = 10;
    if (pageSize > 50) pageSize = 50; // προστασία από υπερβολικά μεγάλα pageSize

    const filter = {};

    // soft delete: αν δεν ζητηθούν ρητά τα διαγραμμένα, φέρνουμε μόνο ενεργά
    if (includeDeleted !== 'true') {
      filter.deletedAt = null;
    }

    // αναζήτηση σε title & address (case-insensitive)
    if (q && typeof q === 'string' && q.trim() !== '') {
      const regex = new RegExp(q.trim(), 'i');
      filter.$or = [{ title: regex }, { address: regex }];
    }

    const skip = (page - 1) * pageSize;

    const [items, totalItems] = await Promise.all([
      Property.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(pageSize),
      Property.countDocuments(filter),
    ]);

    const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));

    res.json({
      items,
      totalItems,
      page,
      pageSize,
      totalPages,
    });
  } catch (e) {
    next(e);
  }
});

// Soft delete
router.delete('/:id', validateObjectIdParam('id'), async (req, res, next) => {
  try {
    const p = await Property.findByIdAndUpdate(
      req.params.id,
      { $set: { deletedAt: new Date(), isDeleted: true } },
      { new: true }
    );
    if (!p) return res.status(404).json({ error: 'Property not found' });
    res.json(p);
  } catch (e) { next(e); }
});

// Restore handler (κοινός για PATCH και POST)
async function restoreHandler(req, res, next) {
  try {
    const p = await Property.findByIdAndUpdate(
      req.params.id,
      { $set: { deletedAt: null, isDeleted: false } },
      { new: true }
    );
    if (!p) return res.status(404).json({ error: 'Property not found' });
    res.json(p);
  } catch (e) { next(e); }
}
router.patch('/:id/restore', validateObjectIdParam('id'), restoreHandler);
router.post('/:id/restore',  validateObjectIdParam('id'), restoreHandler);

// Ενημέρωση (inline edit) τίτλου / διεύθυνσης / ενοικίου
router.patch('/:id', validateObjectIdParam('id'), async (req, res, next) => {
  try {
    const updates = {};

    if (typeof req.body.title === 'string') {
      updates.title = req.body.title;
    }
    if (typeof req.body.address === 'string') {
      updates.address = req.body.address;
    }
    if (typeof req.body.rent === 'number') {
      updates.rent = req.body.rent;
    }

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ error: 'No valid fields to update' });
    }

    const p = await Property.findByIdAndUpdate(
      req.params.id,
      { $set: updates },
      { new: true, runValidators: true }
    );

    if (!p) return res.status(404).json({ error: 'Property not found' });
    res.json(p);
  } catch (e) {
    next(e);
  }
});

// Δημιουργία απλή
router.post('/create-simple', requireBody(['title']), async (req, res, next) => {
  try {
    const landlordId = req.user?.id || req.user?._id; // από auth
    const doc = await Property.create({
      title: req.body.title,
      address: req.body.address ?? undefined,
      rent: typeof req.body.rent === 'number' ? req.body.rent : undefined,
      landlordId: landlordId || undefined,
      deletedAt: null,
      isDeleted: false,
    });
    res.status(201).json(doc);
  } catch (e) { next(e); }
});

module.exports = router;
