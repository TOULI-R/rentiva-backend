const fs = require("fs");

const file = "routes/properties.js";
let s = fs.readFileSync(file, "utf8");

function ensure(str, label = str) {
  if (!s.includes(str)) throw new Error("Δεν βρέθηκε: " + label);
}

function ensureAfter(needle, insert, guard) {
  ensure(needle);
  if (guard && s.includes(guard)) return;
  s = s.replace(needle, needle + "\n" + insert);
}

function patchBetween(startMarker, endMarker, fn) {
  const a = s.indexOf(startMarker);
  if (a === -1) throw new Error("Δεν βρέθηκε start marker: " + startMarker);
  const b = s.indexOf(endMarker, a + startMarker.length);
  if (b === -1) throw new Error("Δεν βρέθηκε end marker: " + endMarker);
  const block = s.slice(a, b);
  const patched = fn(block);
  s = s.slice(0, a) + patched + s.slice(b);
}

// 1) require PropertyEvent
const propReq = "const Property = require('../models/Property');";
ensure(propReq, "Property require");
if (!s.includes("models/PropertyEvent")) {
  s = s.replace(
    propReq,
    propReq + "\nconst PropertyEvent = require('../models/PropertyEvent');"
  );
}

// 2) helper logEvent
const validateReq =
  "const { validateObjectIdParam, requireBody } = require('../middleware/validate');";
ensureAfter(
  validateReq,
  `
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
`.trimEnd(),
  "async function logEvent"
);

// 3) endpoints: GET/POST events πριν το single GET
const markerSingle = "// Λήψη ενός ακινήτου με id";
ensure(markerSingle);
if (!s.includes("router.get('/:id/events'")) {
  const endpoints = `// Events timeline (Phase A)
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
    const ev = await PropertyEvent.create({
      propertyId: req.params.id,
      kind: 'note',
      title: String(req.body.title).slice(0, 200),
      message: typeof req.body.message === 'string' ? req.body.message.slice(0, 2000) : undefined,
      actorId: actorId || undefined,
      meta: req.body.meta && typeof req.body.meta === 'object' ? req.body.meta : {},
    });
    res.status(201).json(ev);
  } catch (e) { next(e); }
});
`;
  s = s.replace(markerSingle, endpoints + "\n\n" + markerSingle);
}

// 4) Soft delete: log πριν το res.json(p)
patchBetween("// Soft delete", "// Restore handler", (block) => {
  if (block.includes("kind: 'deleted'")) return block;
  if (!block.includes("router.delete(")) throw new Error("Soft delete block δεν φαίνεται σωστό.");
  block = block.replace(
    /(\s*)res\.json\(p\);\s*/m,
    `$1await logEvent({ propertyId: p._id, kind: 'deleted', title: 'Έγινε soft delete', actorId: req.user?.id || req.user?._id, meta: {} });\n$1res.json(p);\n`
  );
  return block;
});

// 5) Restore handler: log πριν το res.json(p)
patchBetween("// Restore handler", "// Ενημέρωση (inline edit) βασικών πεδίων", (block) => {
  if (block.includes("kind: 'restored'")) return block;
  if (!block.includes("async function restoreHandler")) throw new Error("Restore block δεν φαίνεται σωστό.");
  block = block.replace(
    /(\s*)res\.json\(p\);\s*/m,
    `$1await logEvent({ propertyId: p._id, kind: 'restored', title: 'Έγινε restore', actorId: req.user?.id || req.user?._id, meta: {} });\n$1res.json(p);\n`
  );
  return block;
});

// 6) Update: changedFields + log updated
patchBetween("// Ενημέρωση (inline edit) βασικών πεδίων", "// Δημιουργία απλή", (block) => {
  if (!block.includes("router.patch('/:id'")) throw new Error("Update block δεν φαίνεται σωστό.");

  // changedFields
  if (!block.includes("const changedFields = Object.keys(updates);")) {
    block = block.replace(
      /if\s*\(Object\.keys\(updates\)\.length\s*===\s*0\)\s*\{/,
      "const changedFields = Object.keys(updates);\n\n      if (changedFields.length === 0) {"
    );
  }

  // log updated (before res.json(p))
  if (!block.includes("kind: 'updated'")) {
    block = block.replace(
      /(\s*)res\.json\(p\);\s*/m,
      `$1await logEvent({ propertyId: p._id, kind: 'updated', title: 'Ενημερώθηκε', actorId: req.user?.id || req.user?._id, meta: { changedFields } });\n$1res.json(p);\n`
    );
  }

  return block;
});

// 7) Create-simple: log created πριν το res.status(201).json(doc)
patchBetween("// Δημιουργία απλή", "module.exports = router;", (block) => {
  if (block.includes("kind: 'created'")) return block;

  if (!block.includes("const doc = await Property.create(")) {
    throw new Error("Create-simple block δεν φαίνεται σωστό.");
  }

  block = block.replace(
    /(\s*)res\.status\(201\)\.json\(doc\);\s*/m,
    `$1await logEvent({ propertyId: doc._id, kind: 'created', title: 'Δημιουργήθηκε', actorId: req.user?.id || req.user?._id, meta: {} });\n$1res.status(201).json(doc);\n`
  );

  return block;
});

fs.writeFileSync(file, s, "utf8");
console.log("OK: Phase A PropertyEvents patched into", file);
