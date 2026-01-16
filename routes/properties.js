const express = require('express');
const router = express.Router();

/* COMPATIBILITY_MATCH_V1_HELPERS */
const _CM_ALLOWED_USAGE = new Set([
  "family",
  "remote_work",
  "students",
  "couple",
  "single",
  "roommates",
  "short_term",
]);

function _cmToBool(v) {
  if (typeof v === "boolean") return v;
  if (typeof v === "string") {
    const s = v.trim().toLowerCase();
    if (s === "true" || s === "1" || s === "yes" || s === "ναι") return true;
    if (s === "false" || s === "0" || s === "no" || s === "όχι" || s === "οχι") return false;
  }
  return undefined;
}

function _cmInt(v, { min = 0, max = 999 } = {}) {
  const n = typeof v === "number" ? v : parseInt(String(v ?? ""), 10);
  if (!Number.isFinite(n)) return undefined;
  const nn = Math.trunc(n);
  if (nn < min || nn > max) return undefined;
  return nn;
}

function _cmEnum(v, allowed) {
  const s = String(v ?? "").trim().toLowerCase();
  if (!s) return undefined;
  return allowed.has(s) ? s : undefined;
}

function _cmUsageList(v) {
  const arr = Array.isArray(v) ? v : (typeof v === "string" ? v.split(",") : []);
  const out = [];
  for (const item of arr) {
    const s = String(item ?? "").trim().toLowerCase();
    if (!s) continue;
    if (_CM_ALLOWED_USAGE.has(s) && !out.includes(s)) out.push(s);
    if (out.length >= 8) break;
  }
  return out;
}

// Night-hour normalization: 01:00 => 25, so compares correctly vs 23
function _cmNightHour(h) {
  const n = _cmInt(h, { min: 0, max: 23 });
  if (n == null) return undefined;
  return n < 12 ? n + 24 : n;
}

function normalizeOwnerPrefs(input) {
  const smoking = _cmEnum(input?.smoking, new Set(["no", "yes", "any"])) ?? "any";
  const pets = _cmEnum(input?.pets, new Set(["no", "yes", "any"])) ?? "any";

  const usage = _cmUsageList(input?.usage);
  const quietHoursAfter = _cmInt(input?.quietHoursAfter, { min: 0, max: 23 });
  const quietHoursStrict = _cmToBool(input?.quietHoursStrict) ?? false;
  const maxOccupants = _cmInt(input?.maxOccupants, { min: 1, max: 20 });

  return { smoking, pets, usage, quietHoursAfter, quietHoursStrict, maxOccupants };
}

function normalizeTenantAnswers(input) {
  const smoking = _cmEnum(input?.smoking, new Set(["no", "yes"])) ?? undefined;
  const pets = _cmEnum(input?.pets, new Set(["no", "yes"])) ?? undefined;

  const usage = _cmUsageList(input?.usage);
  const quietHoursAfter = _cmInt(input?.quietHoursAfter, { min: 0, max: 23 });
  const occupants = _cmInt(input?.occupants, { min: 1, max: 20 });

  return { smoking, pets, usage, quietHoursAfter, occupants };
}

function computeCompatibility(ownerPrefs, tenantAns) {
  let score = 100;
  const conflicts = [];
  const breakdown = {};

  function penalize(key, penalty, message, details = {}) {
    if (penalty <= 0) return;
    score -= penalty;
    conflicts.push({ key, penalty, message, ...details });
  }

  // Smoking
  {
    const owner = ownerPrefs.smoking; // no/yes/any
    const tenant = tenantAns.smoking; // yes/no/undefined
    let penalty = 0;
    let ok = true;
    if (tenant != null) {
      if (owner === "no" && tenant === "yes") { ok = false; penalty = 40; }
    }
    breakdown.smoking = { owner, tenant: tenant ?? null, ok, penalty };
    if (!ok) penalize("smoking", penalty, "Ο ιδιοκτήτης δεν δέχεται καπνιστές.", { owner, tenant });
  }

  // Pets
  {
    const owner = ownerPrefs.pets; // no/yes/any
    const tenant = tenantAns.pets; // yes/no/undefined
    let penalty = 0;
    let ok = true;
    if (tenant != null) {
      if (owner === "no" && tenant === "yes") { ok = false; penalty = 30; }
    }
    breakdown.pets = { owner, tenant: tenant ?? null, ok, penalty };
    if (!ok) penalize("pets", penalty, "Ο ιδιοκτήτης δεν δέχεται κατοικίδια.", { owner, tenant });
  }

  // Usage overlap
  {
    const owner = ownerPrefs.usage ?? [];
    const tenant = tenantAns.usage ?? [];
    let penalty = 0;
    let ok = true;

    if (owner.length && tenant.length) {
      const overlap = owner.some((x) => tenant.includes(x));
      if (!overlap) { ok = false; penalty = 12; }
    }

    breakdown.usage = { owner, tenant, ok, penalty };
    if (!ok) penalize("usage", penalty, "Δεν ταιριάζει ο τύπος χρήσης (π.χ. οικογένεια vs φοιτητές).", { owner, tenant });
  }

  // Quiet hours
  {
    const ownerRaw = ownerPrefs.quietHoursAfter;
    const tenantRaw = tenantAns.quietHoursAfter;
    let penalty = 0;
    let ok = true;

    if (ownerRaw != null && tenantRaw != null) {
      const owner = _cmNightHour(ownerRaw);
      const tenant = _cmNightHour(tenantRaw);
      if (owner != null && tenant != null && tenant > owner) {
        ok = false;
        penalty = ownerPrefs.quietHoursStrict ? 22 : 12;
      }
    }

    breakdown.quietHoursAfter = {
      owner: ownerRaw ?? null,
      tenant: tenantRaw ?? null,
      strict: !!ownerPrefs.quietHoursStrict,
      ok,
      penalty,
    };

    if (!ok) {
      penalize(
        "quietHoursAfter",
        penalty,
        ownerPrefs.quietHoursStrict
          ? "Ο ιδιοκτήτης έχει αυστηρές ώρες ησυχίας και δεν ταιριάζουν."
          : "Οι ώρες ησυχίας δεν ταιριάζουν πολύ.",
        { owner: ownerRaw, tenant: tenantRaw, strict: !!ownerPrefs.quietHoursStrict }
      );
    }
  }

  // Occupants
  {
    const owner = ownerPrefs.maxOccupants;
    const tenant = tenantAns.occupants;
    let penalty = 0;
    let ok = true;

    if (owner != null && tenant != null && tenant > owner) {
      ok = false;
      penalty = 25;
    }

    breakdown.occupants = { owner: owner ?? null, tenant: tenant ?? null, ok, penalty };
    if (!ok) penalize("occupants", penalty, "Περισσότερα άτομα από το μέγιστο που δέχεται ο ιδιοκτήτης.", { owner, tenant });
  }

  if (score < 0) score = 0;
  if (score > 100) score = 100;

  return { score, conflicts, breakdown, prefsUsed: ownerPrefs };
}
/* END_COMPATIBILITY_MATCH_V1_HELPERS */

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
    let { limit = 20, kind, q, before } = req.query;

    limit = parseInt(String(limit), 10);
    if (!Number.isFinite(limit) || limit <= 0) limit = 20;
    if (limit > 100) limit = 100;

    const filter = { propertyId: req.params.id };
    const allowedKinds = new Set(['created', 'updated', 'deleted', 'restored', 'note']);

    // kind: "note" or "note,updated"
    if (kind != null && String(kind).trim()) {
      const rawKind = Array.isArray(kind) ? kind.join(',') : String(kind);
      const kinds = rawKind.split(',').map((s) => s.trim()).filter(Boolean);

      for (const k of kinds) {
        if (!allowedKinds.has(k)) return res.status(400).json({ error: `invalid kind: ${k}` });
      }

      if (kinds.length === 1) filter.kind = kinds[0];
      else if (kinds.length > 1) filter.kind = { $in: kinds };
    }

    // before: ISO date (cursor)
    if (before != null && String(before).trim()) {
      const d = new Date(String(before));
      if (Number.isNaN(d.getTime())) {
        return res.status(400).json({ error: 'invalid before date' });
      }
      filter.createdAt = { $lt: d };
    }

    // q: search in title/message (max 80 chars)
    const queryText = q == null ? '' : String(q).trim();
    if (queryText) {
      const safe = queryText.slice(0, 80);
      const esc = safe.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&');
      const rx = new RegExp(esc, 'i');
      filter.$or = [{ title: rx }, { message: rx }];
    }

    const items = await PropertyEvent.find(filter)
      .sort({ createdAt: -1 })
      .limit(limit + 1);

    const hasMore = items.length > limit;
    const pageItems = hasMore ? items.slice(0, limit) : items;
    const nextBefore = hasMore ? pageItems[pageItems.length - 1].createdAt : null;
    res.json({ items: pageItems, nextBefore });
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


/* COMPATIBILITY_MATCH_V1 */
// Compatibility Match (Phase A) — backend-only scoring

const ALLOWED_YNE = new Set(["yes", "no", "either"]);
const ALLOWED_YN = new Set(["yes", "no"]);
const ALLOWED_USAGE = new Set(["family", "remote_work", "students", "single", "couple", "shared", ]);

function normStr(v) {
  if (v == null) return "";
  return String(v).trim();
}

function normYNE(v, field) {
  const s = normStr(v).toLowerCase();
  if (!s) return undefined;
  if (!ALLOWED_YNE.has(s)) throw new Error(`invalid ${field}`);
  return s;
}

function normYN(v, field) {
  const s = normStr(v).toLowerCase();
  if (!s) return undefined;
  if (!ALLOWED_YN.has(s)) throw new Error(`invalid ${field}`);
  return s;
}

function normHour(v, field) {
  if (v == null || v === "") return undefined;
  const n = Number(v);
  if (!Number.isFinite(n)) throw new Error(`invalid ${field}`);
  const i = Math.trunc(n);
  if (i < 0 || i > 23) throw new Error(`invalid ${field}`);
  return i;
}

function normInt(v, field, min, max) {
  if (v == null || v === "") return undefined;
  const n = Number(v);
  if (!Number.isFinite(n)) throw new Error(`invalid ${field}`);
  const i = Math.trunc(n);
  if (i < min || i > max) throw new Error(`invalid ${field}`);
  return i;
}

function normBool(v, field) {
  if (v == null) return undefined;
  if (typeof v === "boolean") return v;
  const s = normStr(v).toLowerCase();
  if (s === "true" || s === "1" || s === "yes") return true;
  if (s === "false" || s === "0" || s === "no") return false;
  throw new Error(`invalid ${field}`);
}

function normUsage(v) {
  if (v == null) return undefined;
  const arr = Array.isArray(v) ? v : [v];
  const out = [];
  for (const x of arr) {
    const s = normStr(x).toLowerCase();
    if (!s) continue;
    if (!ALLOWED_USAGE.has(s)) throw new Error("invalid usage");
    if (!out.includes(s)) out.push(s);
  }
  return out.length ? out.slice(0, 10) : undefined;
}

// map night hours so 01:00 counts as "later" than 23:00
function nightScale(h) {
  return h < 12 ? h + 24 : h;
}

function normalizeTenantPrefs(body) {
  if (!body || typeof body !== "object" || Array.isArray(body)) throw new Error("invalid payload");
  const out = {};
  if ("smoking" in body) out.smoking = normYNE(body.smoking, "smoking");
  if ("pets" in body) out.pets = normYNE(body.pets, "pets");
  if ("usage" in body) out.usage = normUsage(body.usage);
  if ("quietHoursAfter" in body) out.quietHoursAfter = normHour(body.quietHoursAfter, "quietHoursAfter");
  if ("quietHoursStrict" in body) out.quietHoursStrict = normBool(body.quietHoursStrict, "quietHoursStrict");
  if ("maxOccupants" in body) out.maxOccupants = normInt(body.maxOccupants, "maxOccupants", 1, 20);
  return out;
}

function normalizeTenantAnswers(body) {
  if (!body || typeof body !== "object" || Array.isArray(body)) throw new Error("invalid payload");
  return {
    smoking: normYN(body.smoking, "smoking"),
    pets: normYN(body.pets, "pets"),
    usage: normUsage(body.usage),
    quietHoursAfter: normHour(body.quietHoursAfter, "quietHoursAfter"),
    occupants: normInt(body.occupants, "occupants", 1, 20),
  };
}

function computeCompatibility(owner, tenant) {
  let score = 100;
  const conflicts = [];
  const breakdown = {};

  function penalize(key, penalty, severity, message, ownerValue, tenantValue) {
    if (penalty > 0) score = Math.max(0, score - penalty);
    breakdown[key] = { penalty, severity, message, ownerValue, tenantValue };
    if (penalty > 0) conflicts.push({ key, penalty, severity, message, ownerValue, tenantValue });
  }

  // Smoking
  if (owner.smoking && owner.smoking !== "either" && tenant.smoking) {
    if (owner.smoking === "no" && tenant.smoking === "yes") {
      penalize("smoking", 35, "high", "Ο ιδιοκτήτης δεν δέχεται καπνιστές.", owner.smoking, tenant.smoking);
    } else if (owner.smoking === "yes" && tenant.smoking === "no") {
      penalize("smoking", 15, "medium", "Ο ιδιοκτήτης προτιμά καπνιστές.", owner.smoking, tenant.smoking);
    } else {
      penalize("smoking", 0, "ok", "ΟΚ στο κάπνισμα.", owner.smoking, tenant.smoking);
    }
  } else {
    penalize("smoking", 0, "neutral", "Δεν ορίστηκε/δόθηκε πληροφορία για κάπνισμα.", owner.smoking, tenant.smoking);
  }

  // Pets
  if (owner.pets && owner.pets !== "either" && tenant.pets) {
    if (owner.pets === "no" && tenant.pets === "yes") {
      penalize("pets", 25, "high", "Ο ιδιοκτήτης δεν δέχεται κατοικίδια.", owner.pets, tenant.pets);
    } else if (owner.pets === "yes" && tenant.pets === "no") {
      penalize("pets", 10, "low", "Ο ιδιοκτήτης προτιμά κατοικίδια.", owner.pets, tenant.pets);
    } else {
      penalize("pets", 0, "ok", "ΟΚ στα κατοικίδια.", owner.pets, tenant.pets);
    }
  } else {
    penalize("pets", 0, "neutral", "Δεν ορίστηκε/δόθηκε πληροφορία για κατοικίδια.", owner.pets, tenant.pets);
  }

  // Usage overlap
  if (Array.isArray(owner.usage) && owner.usage.length && Array.isArray(tenant.usage) && tenant.usage.length) {
    const overlap = owner.usage.some((u) => tenant.usage.includes(u));
    if (!overlap) {
      penalize("usage", 20, "medium", "Διαφορετικός τύπος χρήσης/προφίλ.", owner.usage, tenant.usage);
    } else {
      penalize("usage", 0, "ok", "Υπάρχει κοινό προφίλ χρήσης.", owner.usage, tenant.usage);
    }
  } else {
    penalize("usage", 0, "neutral", "Δεν ορίστηκε/δόθηκε πληροφορία για χρήση.", owner.usage, tenant.usage);
  }

  // Quiet hours
  if (typeof owner.quietHoursAfter === "number" && typeof tenant.quietHoursAfter === "number") {
    const o = nightScale(owner.quietHoursAfter);
    const t = nightScale(tenant.quietHoursAfter);
    if (t > o) {
      const strict = owner.quietHoursStrict === true;
      penalize("quietHours", strict ? 20 : 10, strict ? "high" : "medium",
        strict ? "Ασυμβατότητα: αυστηρή ησυχία μετά την ώρα." : "Πιθανή σύγκρουση στις ώρες ησυχίας.",
        owner.quietHoursAfter, tenant.quietHoursAfter
      );
    } else {
      penalize("quietHours", 0, "ok", "ΟΚ στις ώρες ησυχίας.", owner.quietHoursAfter, tenant.quietHoursAfter);
    }
  } else {
    penalize("quietHours", 0, "neutral", "Δεν ορίστηκε/δόθηκε πληροφορία για ώρες ησυχίας.", owner.quietHoursAfter, tenant.quietHoursAfter);
  }

  // Occupants
  if (typeof owner.maxOccupants === "number" && typeof tenant.occupants === "number") {
    if (tenant.occupants > owner.maxOccupants) {
      penalize("occupants", 30, "high", "Υπέρβαση μέγιστου αριθμού ατόμων.", owner.maxOccupants, tenant.occupants);
    } else {
      penalize("occupants", 0, "ok", "ΟΚ στον αριθμό ατόμων.", owner.maxOccupants, tenant.occupants);
    }
  } else {
    penalize("occupants", 0, "neutral", "Δεν ορίστηκε/δόθηκε πληροφορία για άτομα.", owner.maxOccupants, tenant.occupants);
  }

  return {
    score,
    conflicts,
    breakdown,
    prefsUsed: { owner, tenant },
  };
}



router.patch('/:id/tenant-prefs', validateObjectIdParam('id'), async (req, res, next) => {
  try {
    const p = await Property.findById(req.params.id);
    if (!p) return res.status(404).json({ error: 'Property not found' });

    const prefs = normalizeOwnerPrefs(req.body);
    p.tenantPrefs = prefs;

    await p.save();

    return res.json({ tenantPrefs: p.tenantPrefs });
  } catch (e) { next(e); }
});


router.post('/:id/compatibility', validateObjectIdParam('id'), async (req, res, next) => {
  try {
    const p = await Property.findById(req.params.id).select('tenantPrefs');
    if (!p) return res.status(404).json({ error: 'Property not found' });

    const ownerPrefs = normalizeOwnerPrefs(p.tenantPrefs || {});
    // αν δεν έχουν μπει prefs, μην κάνουμε "100%" από αέρα
    const hasAnyPrefs =
      ownerPrefs.smoking !== 'any' ||
      ownerPrefs.pets !== 'any' ||
      (ownerPrefs.usage && ownerPrefs.usage.length) ||
      ownerPrefs.quietHoursAfter != null ||
      ownerPrefs.maxOccupants != null;

    if (!hasAnyPrefs) {
      return res.status(400).json({ error: 'tenantPrefs not set for this property' });
    }

    const tenantAns = normalizeTenantAnswers(req.body || {});
    const result = computeCompatibility(ownerPrefs, tenantAns);

    
      // Auto-log compatibility check to timeline
      const actorId = req.user?.id || req.user?._id;
      const title = result.score === 0 ? "Compatibility: conflict" : ("Compatibility: score " + result.score);
      const message = (result.conflicts && result.conflicts.length) ? ("Conflicts: " + result.conflicts.join(", ")) : "No conflicts.";
      await logEvent({ propertyId: req.params.id, kind: "compatibility", title, message, actorId, meta: { score: result.score, conflicts: result.conflicts } });

      return res.json(result);
  } catch (e) { next(e); }
});

module.exports = router;
