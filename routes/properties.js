const express = require('express');
const router = express.Router();
const Property = require('../models/Property');
const auth = require('../middleware/auth');
const { validateObjectIdParam } = require('../middleware/validate');

// Λίστα properties (με ή χωρίς διαγεγραμμένα)
router.get('/', auth, async (req, res, next) => {
  try {
    const includeDeleted = req.query.includeDeleted === 'true';
    const filter = includeDeleted ? {} : { deletedAt: null };
    const items = await Property.find(filter).sort({ createdAt: -1 });
    res.json({ items });
  } catch (err) {
    next(err);
  }
});

// Απλό create endpoint για το frontend form
router.post('/create-simple', auth, async (req, res, next) => {
  try {
    const { title, address, price, rent } = req.body;

    if (!title || typeof title !== 'string' || title.trim() === '') {
      return res.status(400).json({ error: 'title is required' });
    }

    // Βρες αριθμητικό ενοίκιο από price ή rent
    let numericRent = null;
    const candidate =
      price !== undefined && price !== null && `${price}`.trim() !== ''
        ? price
        : rent;

    if (candidate !== undefined && candidate !== null && `${candidate}`.trim() !== '') {
      const n = Number(candidate);
      if (Number.isNaN(n) || n < 0) {
        return res.status(400).json({ error: 'rent must be a number >= 0' });
      }
      numericRent = n;
    }

    // landlordId από ένα ήδη υπάρχον property (π.χ. seeded Apt 401)
    const base = await Property.findOne().sort({ createdAt: 1 }).lean();
    const landlordId = base ? base.landlordId : null;

    const doc = new Property({
      title: title.trim(),
      address: address && typeof address === 'string' ? address.trim() : address,
      rent: numericRent,
      price: numericRent,
      landlordId,
    });

    await doc.save();
    res.status(201).json(doc);
  } catch (err) {
    next(err);
  }
});

// Soft delete (θέτει deletedAt)
router.delete('/:id', auth, validateObjectIdParam('id'), async (req, res, next) => {
  try {
    const { id } = req.params;
    const property = await Property.findByIdAndUpdate(
      id,
      { $set: { deletedAt: new Date() } },
      { new: true }
    );
    if (!property) {
      return res.status(404).json({ error: 'Not found' });
    }
    res.json(property);
  } catch (err) {
    next(err);
  }
});

// Restore soft-deleted (deletedAt = null)
router.post('/:id/restore', auth, validateObjectIdParam('id'), async (req, res, next) => {
  try {
    const { id } = req.params;
    const property = await Property.findByIdAndUpdate(
      id,
      { $set: { deletedAt: null } },
      { new: true }
    );
    if (!property) {
      return res.status(404).json({ error: 'Not found' });
    }
    res.json(property);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
