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
      .map((c) => (c.key ? c.key + ": " : "") + (c.message || ""))
      .join(" | ");

    const title =
      result.score === 0
        ? "Compatibility (public): conflict"
        : "Compatibility (public): score " + result.score;

    const message = conflictsText
      ? ("Conflicts: " + conflictsText).slice(0, 1900)
      : "No conflicts.";

    await logEvent({
      propertyId: p._id,
      kind: "compatibility",
      title,
      message,
      meta: {
        score: result.score,
        conflictKeys: (result.conflicts || []).map((c) => c.key),
      },
    });

    return res.json(result);
  } catch (e) {
    next(e);
  }
});

// Public property search/listing (published only)
// GET /api/public/properties?page=1&pageSize=10&q=...&minRent=&maxRent=&minSize=&maxSize=&bedrooms=&petsAllowed=&furnished=&balcony=&elevator=
router.get("/properties", async (req, res, next) => {
  try {
    const page = Math.max(1, parseInt(String(req.query.page || "1"), 10) || 1);
    const pageSize = Math.min(
      50,
      Math.max(1, parseInt(String(req.query.pageSize || "10"), 10) || 10)
    );

    const q = String(req.query.q || "").trim();

    const minRent =
      req.query.minRent != null && String(req.query.minRent).trim() !== ""
        ? Number(req.query.minRent)
        : null;
    const maxRent =
      req.query.maxRent != null && String(req.query.maxRent).trim() !== ""
        ? Number(req.query.maxRent)
        : null;

    const minSize =
      req.query.minSize != null && String(req.query.minSize).trim() !== ""
        ? Number(req.query.minSize)
        : null;
    const maxSize =
      req.query.maxSize != null && String(req.query.maxSize).trim() !== ""
        ? Number(req.query.maxSize)
        : null;

    const bedrooms =
      req.query.bedrooms != null && String(req.query.bedrooms).trim() !== ""
        ? Number(req.query.bedrooms)
        : null;

    const petsAllowed =
      req.query.petsAllowed === "true"
        ? true
        : req.query.petsAllowed === "false"
          ? false
          : null;

    const balcony =
      req.query.balcony === "true"
        ? true
        : req.query.balcony === "false"
          ? false
          : null;

    const elevator =
      req.query.elevator === "true"
        ? true
        : req.query.elevator === "false"
          ? false
          : null;

    const furnished =
      req.query.furnished != null && String(req.query.furnished).trim() !== ""
        ? String(req.query.furnished)
        : null;

    const filter = {
      deletedAt: null,
      isPublished: true,
    };

    if (q) {
      filter.$or = [
        { title: { $regex: q, $options: "i" } },
        { address: { $regex: q, $options: "i" } },
      ];
    }

    if (!Number.isNaN(minRent) && minRent != null) {
      filter.rent = { ...(filter.rent || {}), $gte: minRent };
    }
    if (!Number.isNaN(maxRent) && maxRent != null) {
      filter.rent = { ...(filter.rent || {}), $lte: maxRent };
    }

    if (!Number.isNaN(minSize) && minSize != null) {
      filter.size = { ...(filter.size || {}), $gte: minSize };
    }
    if (!Number.isNaN(maxSize) && maxSize != null) {
      filter.size = { ...(filter.size || {}), $lte: maxSize };
    }

    if (!Number.isNaN(bedrooms) && bedrooms != null) filter.bedrooms = bedrooms;

    if (petsAllowed !== null) filter.petsAllowed = petsAllowed;
    if (balcony !== null) filter.balcony = balcony;
    if (elevator !== null) filter.elevator = elevator;
    if (furnished) filter.furnished = furnished;

    const skip = (page - 1) * pageSize;

    const [totalItems, items] = await Promise.all([
      Property.countDocuments(filter),
      Property.find(filter)
        .select(
          "_id title address rent size bedrooms bathrooms floor yearBuilt yearRenovated heatingType energyClass parking elevator balcony furnished petsAllowed description commonCharges otherFixedCosts billsIncluded depositMonths minimumContractMonths shareKey"
        )
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(pageSize),
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

module.exports = router;
