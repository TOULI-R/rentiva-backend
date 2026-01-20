const User = require("../models/User");

module.exports = async function requireOwner(req, res, next) {
  try {
    if (!req.userId) return res.status(401).json({ error: "missing or malformed token" });

    const u = await User.findById(req.userId).select("role").lean();
    const role = u?.role ?? null;

    if (role !== "owner") return res.status(403).json({ error: "forbidden: owner only" });

    return next();
  } catch (e) {
    return next(e);
  }
};
