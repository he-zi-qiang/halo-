// middleware/admin.js
module.exports = function(req, res, next) {
  // req.user should be attached by the 'auth' middleware
  if (!req.user || req.user.role !== 'ADMIN') {
    return res.status(403).json({ error: 'Access denied. Administrator privileges required.' });
  }
  next();
};