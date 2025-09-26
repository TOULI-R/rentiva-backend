// middleware/errors.js
/* Centralized error handling */

function notFound(req, res, next) {
  res.status(404).json({ error: 'Not found', path: req.originalUrl });
}

/* eslint-disable no-unused-vars */
function errorHandler(err, req, res, next) {
  const status = Number.isInteger(err.status) ? err.status : 500;
  const body = { error: err.message || 'Server error' };

  // Σε dev δείξε και το stack για debugging
  if (process.env.NODE_ENV !== 'production' && err.stack) {
    body.stack = err.stack;
  }
  res.status(status).json(body);
}

module.exports = { notFound, errorHandler };
