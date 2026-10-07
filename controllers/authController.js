const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../config/db');
const { JWT_SECRET } = require('../middlewares/authMiddleware');

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function issue(user) {
  const payload = { id: user.id, name: user.name, email: user.email, role: user.role };
  return { token: jwt.sign(payload, JWT_SECRET, { expiresIn: '8h' }), user: payload };
}

exports.register = (req, res) => {
  const { name, email, password } = req.body || {};
  if (typeof name !== 'string' || !name.trim() || typeof email !== 'string' || typeof password !== 'string') {
    return res.status(400).json({ error: 'Ad, e-posta ve şifre gerekli.' });
  }
  const mail = email.trim().toLowerCase();
  if (!EMAIL_RE.test(mail)) return res.status(400).json({ error: 'Geçersiz e-posta.' });
  if (password.length < 6) return res.status(400).json({ error: 'Şifre en az 6 karakter olmalı.' });
  if (db.prepare('SELECT id FROM users WHERE email = ?').get(mail)) {
    return res.status(409).json({ error: 'Bu e-posta zaten kayıtlı.' });
  }
  // Kayıt her zaman STUDENT rolüyle yapılır; rol istemciden alınmaz.
  const info = db
    .prepare('INSERT INTO users (name, email, password_hash, role) VALUES (?,?,?,?)')
    .run(name.trim(), mail, bcrypt.hashSync(password, 10), 'STUDENT');
  const user = db.prepare('SELECT id, name, email, role FROM users WHERE id = ?').get(info.lastInsertRowid);
  res.status(201).json(issue(user));
};

exports.login = (req, res) => {
  const { email, password } = req.body || {};
  if (typeof email !== 'string' || typeof password !== 'string') {
    return res.status(400).json({ error: 'E-posta ve şifre gerekli.' });
  }
  const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email.trim().toLowerCase());
  if (!user || !bcrypt.compareSync(password, user.password_hash)) {
    return res.status(401).json({ error: 'E-posta veya şifre hatalı.' });
  }
  res.json(issue(user));
};

exports.me = (req, res) => res.json({ user: req.user });
