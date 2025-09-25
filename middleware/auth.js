// middleware/auth.js
require('dotenv').config();
const jwt = require('jsonwebtoken');

/**
 * Δέχεται είτε:
 *  - Authorization: Bearer <token>
 *  - x-auth-token: <token>
 * Εξάγει userId από id | userId | _id.
 */
module.exports = function auth(req, res, next) {
  try {
    const hdr = req.headers['authorization'] || '';
    const bearer = hdr.startsWith('Bearer ') ? hdr.slice(7).trim() : null;
    const token = bearer || req.headers['x-auth-token'];

    if (!token) {
      return res.status(401).json({ error: 'missing or malformed token' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.userId = decoded.id || decoded.userId || decoded._id;
    if (!req.userId) {
      return res.status(401).json({ error: 'invalid token payload' });
    }
    next();
  } catch (err) {
    return res.status(401).json({ error: 'invalid or expired token' });
  }
};
