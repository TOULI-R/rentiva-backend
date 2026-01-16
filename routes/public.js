const express = require("express");
const router = express.Router();

const Property = require("../models/Property");
const PropertyEvent = require("../models/PropertyEvent");
const {
  normalizeOwnerPrefsV1,
  normalizeTenantAnswersV1,
  computeCompatibilityV1,
  hasAnyOwnerPrefsV1,
} = require("../lib/compatibilityV1");

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
    console.error("Public PropertyEvent log failed:", e?.message || e);
  }
}

// Anonymous compatibility check via shareKey
router.post("/compatibility/:shareKey", async (req, res, next) => {
  try {
    const shareKey = String(req.params.shareKey || "").trim().toLowerCase();
    if (!/^[a-f0-9]{32}$/.test(shareKey)) {
      return res.status(400).json({ error: "Invalid shareKey" });
    }

    const p = await Property.findOne({ shareKey }).select("_id tenantPrefs deletedAt");
    if (!p) return res.status(404).json({ error: "Not found" });
    if (p.deletedAt) return res.status(400).json({ error: "Property is deleted" });

    const ownerPrefs = normalizeOwnerPrefsV1(p.tenantPrefs || {});
    if (!hasAnyOwnerPrefsV1(ownerPrefs)) {
      return res.status(400).json({ error: "tenantPrefs not set for this property" });
    }

    const tenantAns = normalizeTenantAnswersV1(req.body || {});
    const result = computeCompatibilityV1(ownerPrefs, tenantAns);

    const conflictsText = (result.conflicts || [])
      .map(c => (c.key ? (c.key + ": ") : "") + (c.message || ""))
      .join(" | ");

    const title = result.score === 0 ? "Compatibility (public): conflict" : ("Compatibility (public): score " + result.score);
    const message = conflictsText ? ("Conflicts: " + conflictsText).slice(0, 1900) : "No conflicts.";

    await logEvent({
      propertyId: p._id,
      kind: "compatibility",
      title,
      message,
      meta: { score: result.score, conflictKeys: (result.conflicts || []).map(c => c.key) },
    });

    return res.json(result);
  } catch (e) {
    next(e);
  }
});

module.exports = router;
