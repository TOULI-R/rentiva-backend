const express = require('express');
const router = express.Router();
const Property = require('../models/Property');
const PropertyEvent = require('../models/PropertyEvent');
const { validateObjectIdParam, requireBody } = require('../middleware/validate');

async function logEvent({ propertyId, kind, title, message, actorId, meta }) {
  try {
    await PropertyEvent.create({
      propertyId,
      kind,
      title,
      message: message ?? undefined,
      actorId: actorId ?? undefined,
      meta: meta ?? {},
    });
  } catch (e) {
    // δεν μπλοκάρουμε το βασικό flow αν αποτύχει το logging
    console.error("PropertyEvent log failed:", e?.message || e);
  }
}

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

// Events timeline (Phase A)
router.get('/:id/events', validateObjectIdParam('id'), async (req, res, next) => {
  try {
    let { limit = 20 } = req.query;
    limit = parseInt(limit, 10);
    if (isNaN(limit) || limit < 1) limit = 20;
    if (limit > 100) limit = 100;

    const items = await PropertyEvent.find({ propertyId: req.params.id })
      .sort({ createdAt: -1 })
      .limit(limit);

    res.json({ items });
  } catch (e) { next(e); }
});

// Manual note event (useful for testing)
router.post('/:id/events', validateObjectIdParam('id'), requireBody(['title']), async (req, res, next) => {
  try {
    const actorId = req.user?.id || req.user?._id;

    // NOTE_LIMITS_V1: sanitize + enforce limits (defense in depth)
    const titleRaw = req.body?.title;
    const messageRaw = req.body?.message;

    const title = String(titleRaw ?? "").trim();
    const message = messageRaw == null ? undefined : String(messageRaw).trim();

    if (!title) return res.status(400).json({ error: "title is required" });
    if (title.length > 120) return res.status(400).json({ error: "title is too long (max 120)" });

    if (message != null && message.length > 2000) {
      return res.status(400).json({ error: "message is too long (max 2000)" });
    }

    // meta: only allow plain object-ish values (optional)
    const meta = req.body?.meta;
    const safeMeta =
      meta && typeof meta === "object" && !Array.isArray(meta) ? meta : undefined;

    const ev = await PropertyEvent.create({
      propertyId: req.params.id,
      kind: 'note',
      title,
      message,
      meta: safeMeta,
      actorId,
    });
    res.status(201).json(ev);
  } catch (e) { next(e); }
});


// Λήψη ενός ακινήτου με id
router.get('/:id', validateObjectIdParam('id'), async (req, res, next) => {
  try {
    const p = await Property.findById(req.params.id);
    if (!p) {
      return res.status(404).json({ error: 'Property not found' });
    }
    res.json(p);
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
    await logEvent({ propertyId: p._id, kind: 'deleted', title: 'Έγινε soft delete', actorId: req.user?.id || req.user?._id, meta: {} });

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
    await logEvent({ propertyId: p._id, kind: 'restored', title: 'Έγινε restore', actorId: req.user?.id || req.user?._id, meta: {} });

    res.json(p);
} catch (e) { next(e); }
}
router.patch('/:id/restore', validateObjectIdParam('id'), restoreHandler);
router.post('/:id/restore',  validateObjectIdParam('id'), restoreHandler);

// Ενημέρωση (inline edit) βασικών πεδίων
router.patch('/:id', validateObjectIdParam('id'), async (req, res, next) => {
  try {
    const updates = {};

    // βασικά
    if (typeof req.body.title === 'string') {
      updates.title = req.body.title;
    }
    if (typeof req.body.address === 'string') {
      updates.address = req.body.address;
    }
    if (typeof req.body.rent === 'number') {
      updates.rent = req.body.rent;
    }
    if (typeof req.body.size === 'number') {
      updates.size = req.body.size;
    }
    if (typeof req.body.floor === 'number') {
      updates.floor = req.body.floor;
    }
    if (typeof req.body.bedrooms === 'number') {
      updates.bedrooms = req.body.bedrooms;
    }
    if (typeof req.body.bathrooms === 'number') {
      updates.bathrooms = req.body.bathrooms;
    }
    if (typeof req.body.description === 'string') {
      updates.description = req.body.description;
    }

    // χαρακτηριστικά κτιρίου
    if (typeof req.body.yearBuilt === 'number') {
      updates.yearBuilt = req.body.yearBuilt;
    }
    if (typeof req.body.yearRenovated === 'number') {
      updates.yearRenovated = req.body.yearRenovated;
    }
    if (typeof req.body.heatingType === 'string') {
      updates.heatingType = req.body.heatingType;
    }
    if (typeof req.body.energyClass === 'string') {
      updates.energyClass = req.body.energyClass;
    }
    if (typeof req.body.parking === 'string') {
      updates.parking = req.body.parking;
    }
    if (typeof req.body.elevator === 'boolean') {
      updates.elevator = req.body.elevator;
    }

    // επιπλωμένο / κατοικίδια
    if (typeof req.body.furnished === 'string') {
      updates.furnished = req.body.furnished;
    }
    if (typeof req.body.petsAllowed === 'boolean') {
      updates.petsAllowed = req.body.petsAllowed;
    }

    // Οικονομικά πεδία
    if (typeof req.body.commonCharges === 'number') {
      updates.commonCharges = req.body.commonCharges;
    }
    if (typeof req.body.otherFixedCosts === 'number') {
      updates.otherFixedCosts = req.body.otherFixedCosts;
    }
    if (typeof req.body.billsIncluded === 'boolean') {
      updates.billsIncluded = req.body.billsIncluded;
    }
    if (typeof req.body.depositMonths === 'number') {
      updates.depositMonths = req.body.depositMonths;
    }
    if (typeof req.body.minimumContractMonths === 'number') {
      updates.minimumContractMonths = req.body.minimumContractMonths;
    }

    const changedFields = Object.keys(updates);

      if (changedFields.length === 0) {
      return res.status(400).json({ error: 'No valid fields to update' });
    }

    const p = await Property.findByIdAndUpdate(
      req.params.id,
      { $set: updates },
      { new: true, runValidators: true }
    );

    if (!p) return res.status(404).json({ error: 'Property not found' });
    await logEvent({ propertyId: p._id, kind: 'updated', title: 'Ενημερώθηκε', actorId: req.user?.id || req.user?._id, meta: { changedFields } });

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
      size: typeof req.body.size === 'number' ? req.body.size : undefined,
      floor: typeof req.body.floor === 'number' ? req.body.floor : undefined,
      bedrooms: typeof req.body.bedrooms === 'number' ? req.body.bedrooms : undefined,
      bathrooms: typeof req.body.bathrooms === 'number' ? req.body.bathrooms : undefined,

      // χαρακτηριστικά κτιρίου
      yearBuilt: typeof req.body.yearBuilt === 'number' ? req.body.yearBuilt : undefined,
      yearRenovated: typeof req.body.yearRenovated === 'number' ? req.body.yearRenovated : undefined,
      heatingType: typeof req.body.heatingType === 'string' ? req.body.heatingType : undefined,
      energyClass: typeof req.body.energyClass === 'string' ? req.body.energyClass : undefined,
      parking: typeof req.body.parking === 'string' ? req.body.parking : undefined,
      elevator: typeof req.body.elevator === 'boolean' ? req.body.elevator : undefined,

      // επιπλωμένο / κατοικίδια
      furnished: typeof req.body.furnished === 'string' ? req.body.furnished : undefined,
      petsAllowed: typeof req.body.petsAllowed === 'boolean' ? req.body.petsAllowed : undefined,

      // περιγραφή
      description: typeof req.body.description === 'string' ? req.body.description : undefined,

      // οικονομικά πεδία
      commonCharges: typeof req.body.commonCharges === 'number' ? req.body.commonCharges : undefined,
      otherFixedCosts: typeof req.body.otherFixedCosts === 'number' ? req.body.otherFixedCosts : undefined,
      billsIncluded: typeof req.body.billsIncluded === 'boolean' ? req.body.billsIncluded : undefined,
      depositMonths: typeof req.body.depositMonths === 'number' ? req.body.depositMonths : undefined,
      minimumContractMonths: typeof req.body.minimumContractMonths === 'number' ? req.body.minimumContractMonths : undefined,

      landlordId: landlordId || undefined,
      deletedAt: null,
      isDeleted: false,
    });
    await logEvent({ propertyId: doc._id, kind: 'created', title: 'Δημιουργήθηκε', actorId: req.user?.id || req.user?._id, meta: {} });

    res.status(201).json(doc);
} catch (e) { next(e); }
});

module.exports = router;
