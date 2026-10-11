const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const { mkdtempSync, rmSync } = require('node:fs');
const path = require('node:path');
const { tmpdir } = require('node:os');
const dir = mkdtempSync(path.join(tmpdir(), 'lab-auth-'));
process.env.DB_PATH = path.join(dir, 'auth.sqlite');
process.env.JWT_SECRET = 'isolated-auth-test-secret';
process.env.SEED_DEMO_DATA = 'false';
const db = require('../config/db');
const express = require('express');
let server, base, session;
async function request(url, body, token, method = 'POST') {
  const res = await fetch(base + url, { method, headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) }, body: body ? JSON.stringify(body) : undefined });
  return { status: res.status, body: await res.json() };
}
before(async () => {
  const app = express(); app.use(express.json()); app.use('/auth', require('../routes/authRoutes'));
  server = await new Promise(resolve => { const s = app.listen(0, '127.0.0.1', () => resolve(s)); });
  base = `http://127.0.0.1:${server.address().port}/auth`;
});
after(async () => { await new Promise(resolve => server.close(resolve)); db.close(); rmSync(dir, { recursive: true, force: true }); });
const input = { name: 'Demo Student', email: ' Demo@Example.test ', studentNumber: '123456', password: 'StrongPassword123!', role: 'SUPER_ADMIN' };
test('Registration requires number and bounded password; role comes from server', async () => {
  assert.equal((await request('/register', { ...input, studentNumber: '' })).status, 400);
  assert.equal((await request('/register', { ...input, password: '123456789' })).status, 400);
  assert.equal((await request('/register', { ...input, password: 'a'.repeat(129) })).status, 400);
  const res = await request('/register', input);
  assert.equal(res.status, 201); session = res.body;
  assert.equal(session.user.role, 'STUDENT'); assert.equal(session.user.email, 'demo@example.test');
  assert.equal(session.user.password_hash, undefined);
  assert.equal((await request('/register', { ...input, email: 'other@example.test' })).status, 409);
  assert.equal((await request('/register', { ...input, email: 'DEMO@EXAMPLE.TEST', studentNumber: '987654' })).status, 409);
});
test('Unicode passwords retain differences beyond bcrypt 72-byte boundary', async () => {
  const password = 'ş'.repeat(45) + 'distinct-tail';
  assert.equal((await request('/register', { ...input, email: 'long@example.test', studentNumber: '333333', password })).status, 201);
  assert.equal((await request('/login', { email: 'long@example.test', password: 'ş'.repeat(45) + 'wrong-tail' })).status, 401);
  assert.equal((await request('/login', { email: 'long@example.test', password })).status, 200);
});
test('Logout revokes old tokens and deactivated accounts cannot login or use tokens', async () => {
  assert.equal((await request('/me', null, session.token, 'GET')).status, 200);
  assert.equal((await request('/logout', {}, session.token)).status, 200);
  assert.equal((await request('/me', null, session.token, 'GET')).status, 401);
  const login = await request('/login', { email: input.email, password: input.password });
  assert.equal(login.status, 200);
  db.prepare('UPDATE users SET active = 0 WHERE id = ?').run(session.user.id);
  assert.equal((await request('/me', null, login.body.token, 'GET')).status, 401);
  assert.equal((await request('/login', { email: input.email, password: input.password })).status, 401);
});
test('Legacy password hashes work and migration can run repeatedly without data loss', async () => {
  const bcrypt = require('bcryptjs');
  db.prepare('INSERT INTO users(name,email,password_hash,role) VALUES(?,?,?,?)').run('Legacy', 'legacy@example.test', bcrypt.hashSync('Legacy123!', 4), 'ACADEMIC');
  const count = db.prepare('SELECT count(*) AS n FROM users').get().n;
  require('../config/migrations')(db); require('../config/migrations')(db);
  assert.equal(db.prepare('SELECT count(*) AS n FROM users').get().n, count);
  assert.equal(db.prepare('SELECT count(*) AS n FROM schema_migrations').get().n, 1);
  assert.equal((await request('/login', { email: 'legacy@example.test', password: 'Legacy123!' })).status, 200);
});
test('Repeated failed login attempts are temporarily throttled', async () => {
  let result;
  for (let i = 0; i < 7; i++) result = await request('/login', { email: 'missing@example.test', password: 'Incorrect123!' });
  assert.equal(result.status, 429);
});
test('Migration upgrades an old schema while retaining user and reservation rows', () => {
  const Database = require('better-sqlite3');
  const legacy = new Database(':memory:');
  try {
    legacy.exec(`CREATE TABLE users (id INTEGER PRIMARY KEY, name TEXT, email TEXT, password_hash TEXT, role TEXT);
      CREATE TABLE reservations (id INTEGER PRIMARY KEY, student_id INTEGER REFERENCES users(id));
      INSERT INTO users VALUES(1,'Existing','existing@example.test','legacy-hash','STUDENT');
      INSERT INTO reservations VALUES(1,1);`);
    require('../config/migrations')(legacy);
    assert.equal(legacy.prepare('SELECT name,active,token_version,student_number FROM users').get().name, 'Existing');
    assert.deepEqual(legacy.prepare('SELECT active,token_version,student_number FROM users').get(), { active: 1, token_version: 0, student_number: null });
    assert.equal(legacy.prepare('SELECT student_id FROM reservations').get().student_id, 1);
    assert.deepEqual(legacy.pragma('foreign_key_check'), []);
  } finally { legacy.close(); }
});
