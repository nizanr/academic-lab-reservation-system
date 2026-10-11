const jwt = require('jsonwebtoken');
const db = require('../config/db');

const JWT_SECRET = process.env.JWT_SECRET;

function authenticate(req, res, next) {
  const header = req.headers.authorization || '';
  const [scheme, token] = header.split(' ');
  if (scheme !== 'Bearer' || !token) {
    return res.status(401).json({ error: 'Kimlik doğrulama gerekli.' });
  }
  try {
    const claims = jwt.verify(token, JWT_SECRET);
    const user = db.prepare('SELECT id, name, email, role FROM users WHERE id = ?').get(claims.id);
    if (!user) return res.status(401).json({ error: 'Kimlik doğrulama gerekli.' });
    req.user = user;
    next();
  } catch (e) {
    return res.status(401).json({ error: 'Geçersiz veya süresi dolmuş token.' });
  }
}

function authorize(...roles) {
  return (req, res, next) => {
    if (!req.user) return res.status(401).json({ error: 'Kimlik doğrulama gerekli.' });
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Bu işlem için yetkiniz yok.' });
    }
    next();
  };
}

module.exports = { authenticate, authorize, JWT_SECRET };
