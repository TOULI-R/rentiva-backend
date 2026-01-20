const express = require("express");
const router = express.Router();

const auth = require("../middleware/auth");
const User = require("../models/User");
const TenantProfile = require("../models/TenantProfile");

function pickString(v, maxLen = 120) {
  if (v == null) return undefined;
  const s = String(v).trim();
  if (!s) return undefined;
  return s.slice(0, maxLen);
}

function pickInt(v, { min = 0, max = 999 } = {}) {
  if (v == null || v === "") return undefined;
  const n = typeof v === "number" ? v : parseInt(String(v), 10);
  if (!Number.isFinite(n)) return undefined;
  const nn = Math.trunc(n);
  if (nn < min || nn > max) return undefined;
  return nn;
}

function pickEnum(v, allowed) {
  if (v == null || v === "") return undefined;
  const s = String(v).trim().toLowerCase();
  return allowed.has(s) ? s : undefined;
}

function pickUsageList(v) {
  const allowed = new Set(["family", "remote_work", "students", "single", "couple", "shared"]);
  const arr = Array.isArray(v) ? v : (typeof v === "string" ? v.split(",") : []);
  const out = [];
  for (const item of arr) {
    const s = String(item ?? "").trim().toLowerCase();
    if (!s) continue;
    if (allowed.has(s) && !out.includes(s)) out.push(s);
    if (out.length >= 8) break;
  }
  return out;
}

async function ensureTenant(req, res, next) {
  try {
    const u = await User.findById(req.userId).select("_id role");
    if (!u) return res.status(401).json({ error: "user not found" });
    if (u.role !== "tenant") return res.status(403).json({ error: "tenant role required" });
    next();
  } catch (e) {
    next(e);
  }
}

/**
 * GET /api/tenant/me
 * returns tenant profile (creates if missing)
 */
router.get("/me", auth, ensureTenant, async (req, res, next) => {
  try {
    let p = await TenantProfile.findOne({ userId: req.userId });
    if (!p) {
      p = await TenantProfile.create({ userId: req.userId });
    }
    res.json(p);
  } catch (e) {
    next(e);
  }
});

/**
 * PATCH /api/tenant/me
 * body: { phone?, city?, about?, tenantAnswers?: { smoking?, pets?, usage?, quietHoursAfter?, occupants? } }
 */
router.patch("/me", auth, ensureTenant, async (req, res, next) => {
  try {
    const body = req.body || {};

    const patch = {};
    const phone = pickString(body.phone, 32);
    const city = pickString(body.city, 80);
    const about = pickString(body.about, 800);

    if (phone !== undefined) patch.phone = phone;
    if (city !== undefined) patch.city = city;
    if (about !== undefined) patch.about = about;

    const ta = body.tenantAnswers || {};
    const hasUsage = Object.prototype.hasOwnProperty.call(ta, "usage");
    const tenantAnswers = {};

    const smoking = pickEnum(ta.smoking, new Set(["yes", "no"]));
    const pets = pickEnum(ta.pets, new Set(["yes", "no"]));
    const usage = pickUsageList(ta.usage);
    const quietHoursAfter = pickInt(ta.quietHoursAfter, { min: 0, max: 23 });
    const occupants = pickInt(ta.occupants, { min: 1, max: 20 });

    if (smoking !== undefined) tenantAnswers.smoking = smoking;
    if (pets !== undefined) tenantAnswers.pets = pets;
    if (hasUsage && Array.isArray(usage)) tenantAnswers.usage = usage;
    if (quietHoursAfter !== undefined) tenantAnswers.quietHoursAfter = quietHoursAfter;
    if (occupants !== undefined) tenantAnswers.occupants = occupants;

    if (Object.keys(tenantAnswers).length) {
      patch["tenantAnswers"] = tenantAnswers;
    }

    const updated = await TenantProfile.findOneAndUpdate(
      { userId: req.userId },
      { $set: patch },
      { new: true, upsert: true }
    );

    res.json(updated);
  } catch (e) {
    next(e);
  }
});

module.exports = router;
