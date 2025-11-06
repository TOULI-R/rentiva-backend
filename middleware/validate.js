const mongoose = require('mongoose');

const validateObjectIdParam = (param = 'id') => (req, res, next) => {
  const id = req.params[param];
  if (!mongoose.Types.ObjectId.isValid(id)) {
    return res.status(400).json({ error: `Invalid ${param}` });
  }
  next();
};

// Accepts either requireBody('a', 'b') or requireBody(['a','b'])
const requireBody = (...fields) => (req, res, next) => {
  const list =
    Array.isArray(fields[0]) && fields.length === 1 ? fields[0] : fields;

  for (const f of list) {
    const v = req.body[f];
    if (
      v === undefined ||
      v === null ||
      (typeof v === 'string' && v.trim() === '')
    ) {
      return res.status(400).json({ error: `Missing or empty field: ${f}` });
    }
  }
  next();
};

const ensurePositiveNumber = (field) => (req, res, next) => {
  if (req.body[field] !== undefined) {
    const n = req.body[field];
    if (typeof n !== 'number' || Number.isNaN(n) || n < 0) {
      return res
        .status(400)
        .json({ error: `${field} must be a number >= 0` });
    }
  }
  next();
};

module.exports = { validateObjectIdParam, requireBody, ensurePositiveNumber };
