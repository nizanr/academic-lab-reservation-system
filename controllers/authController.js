const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../config/db');
const { JWT_SECRET } = require('../middlewares/authMiddleware');
const { createHash } = require('node:crypto');

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function issue(user) {
  const payload = { id: user.id, name: user.name, email: user.email, role: user.role, student_number: user.student_number };
  return { token: jwt.sign({ id: user.id, version: user.token_version ?? 0 }, JWT_SECRET, { expiresIn: '8h' }), user: payload };
}
// Prehash prevents bcrypt's 72-byte truncation for long or Unicode passwords.
const digest = password => createHash('sha256').update(password, 'utf8').digest('base64');
const hashPassword = password => 'sha256:' + bcrypt.hashSync(digest(password), 10);
const matchesPassword = (password, hash) => hash.startsWith('sha256:')
  ? bcrypt.compareSync(digest(password), hash.slice(7)) : bcrypt.compareSync(password, hash);

exports.register = (req, res) => {
  const { name, email, password, studentNumber } = req.body || {};
  if (typeof name !== 'string' || !name.trim() || typeof email !== 'string' || typeof password !== 'string') {
    return res.status(400).json({ error: 'Ad, e-posta ve şifre gerekli.' });
  }
  const mail = email.trim().toLowerCase();
  if (name.trim().length > 100 || mail.length > 254 || !EMAIL_RE.test(mail)) return res.status(400).json({ error: 'Ad veya e-posta geçersiz.' });
  if (password.length < 10 || password.length > 128) return res.status(400).json({ error: 'Şifre 10–128 karakter olmalı.' });
  if (typeof studentNumber !== 'string' || !/^[0-9]{5,20}$/.test(studentNumber.trim())) {
    return res.status(400).json({ error: 'Öğrenci numarası 5–20 rakam olmalı.' });
  }
  if (db.prepare('SELECT id FROM users WHERE email = ?').get(mail)) {
    return res.status(409).json({ error: 'Bu e-posta zaten kayıtlı.' });
  }
  // Kayıt her zaman STUDENT rolüyle yapılır; rol istemciden alınmaz.
  let info;
  try {
    info = db.prepare('INSERT INTO users (name, email, student_number, password_hash, role) VALUES (?,?,?,?,?)')
      .run(name.trim(), mail, studentNumber.trim(), hashPassword(password), 'STUDENT');
  } catch (error) {
    if (error.code?.startsWith('SQLITE_CONSTRAINT')) return res.status(409).json({ error: 'E-posta veya öğrenci numarası zaten kayıtlı.' });
    throw error;
  }
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(info.lastInsertRowid);
  res.status(201).json(issue(user));
};

exports.login = (req, res) => {
  const { email, password } = req.body || {};
  if (typeof email !== 'string' || typeof password !== 'string' || email.length > 254 || password.length > 128) {
    return res.status(400).json({ error: 'E-posta ve şifre gerekli.' });
  }
  const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email.trim().toLowerCase());
  if (!user || !user.active || !matchesPassword(password, user.password_hash)) {
    return res.status(401).json({ error: 'E-posta veya şifre hatalı.' });
  }
  res.json(issue(user));
};

exports.me = (req, res) => res.json({ user: req.user });
exports.logout = (req, res) => {
  // Invalidates every outstanding token for this account, not just this tab.
  db.prepare('UPDATE users SET token_version = token_version + 1 WHERE id = ?').run(req.user.id);
  res.json({ ok: true });
};
