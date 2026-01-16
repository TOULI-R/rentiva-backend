"use strict";

/**
 * Compatibility Match v1 (shared)
 * Owner prefs live on Property.tenantPrefs
 * Tenant answers come from anonymous or authed request payload.
 */

const ALLOWED_YNE = new Set(["yes", "no", "either"]);
const ALLOWED_YN = new Set(["yes", "no"]);
const ALLOWED_USAGE = new Set(["family", "remote_work", "students", "single", "couple", "shared"]);

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
  if (v == null || v === "") return undefined;
  if (typeof v === "boolean") return v;
  const s = normStr(v).toLowerCase();
  if (s === "true" || s === "1" || s === "yes") return true;
  if (s === "false" || s === "0" || s === "no") return false;
  throw new Error(`invalid ${field}`);
}

function normUsage(v) {
  if (v == null) return undefined;
  const arr = Array.isArray(v) ? v : (typeof v === "string" ? v.split(",") : [v]);
  const out = [];
  for (const x of arr) {
    const s = normStr(x).toLowerCase();
    if (!s) continue;
    if (!ALLOWED_USAGE.has(s)) throw new Error("invalid usage");
    if (!out.includes(s)) out.push(s);
    if (out.length >= 10) break;
  }
  return out.length ? out : undefined;
}

// map night hours so 01:00 counts as "later" than 23:00
function nightScale(h) {
  return h < 12 ? h + 24 : h;
}

function normalizeOwnerPrefsV1(body) {
  if (!body || typeof body !== "object" || Array.isArray(body)) throw new Error("invalid payload");
  return {
    smoking: normYNE(body.smoking, "smoking") ?? "either",
    pets: normYNE(body.pets, "pets") ?? "either",
    usage: normUsage(body.usage) ?? [],
    quietHoursAfter: normHour(body.quietHoursAfter, "quietHoursAfter"),
    quietHoursStrict: normBool(body.quietHoursStrict, "quietHoursStrict") ?? false,
    maxOccupants: normInt(body.maxOccupants, "maxOccupants", 1, 20),
  };
}

function normalizeTenantAnswersV1(body) {
  if (!body || typeof body !== "object" || Array.isArray(body)) throw new Error("invalid payload");
  return {
    smoking: normYN(body.smoking, "smoking"),
    pets: normYN(body.pets, "pets"),
    usage: normUsage(body.usage),
    quietHoursAfter: normHour(body.quietHoursAfter, "quietHoursAfter"),
    occupants: normInt(body.occupants, "occupants", 1, 20),
  };
}

function hasAnyOwnerPrefsV1(owner) {
  if (!owner) return false;
  return (
    (owner.smoking && owner.smoking !== "either") ||
    (owner.pets && owner.pets !== "either") ||
    (Array.isArray(owner.usage) && owner.usage.length) ||
    owner.quietHoursAfter != null ||
    owner.maxOccupants != null
  );
}

function computeCompatibilityV1(owner, tenant) {
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
      penalize(
        "quietHours",
        strict ? 20 : 10,
        strict ? "high" : "medium",
        strict ? "Ασυμβατότητα: αυστηρή ησυχία μετά την ώρα." : "Πιθανή σύγκρουση στις ώρες ησυχίας.",
        owner.quietHoursAfter,
        tenant.quietHoursAfter
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

  return { score, conflicts, breakdown, prefsUsed: { owner, tenant } };
}

module.exports = {
  normalizeOwnerPrefsV1,
  normalizeTenantAnswersV1,
  hasAnyOwnerPrefsV1,
  computeCompatibilityV1,
};
