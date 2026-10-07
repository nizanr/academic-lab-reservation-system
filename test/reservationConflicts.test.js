// Regression tests for double-booking prevention (HTTP 409) on POST /api/reservations.
// They exercise the real routers, auth middleware, controller and SQLite layer over HTTP
// against a throw-away database, so neither a .env file nor a running server is needed.
const { describe, it, before, after, beforeEach } = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const express = require('express');
const bcrypt = require('bcryptjs');

const PASSWORD = crypto.randomBytes(8).toString('hex');
// A far-future day keeps the "no reservations in the past" validation out of the way.
const at = (hhmm) => `2099-01-05T${hhmm}:00.000Z`;
const atUtcPlus3 = (hhmm) => `2099-01-05T${hhmm}:00+03:00`;

// Requests made while 09:00-11:00 is already booked: [description, start, end].
const OVERLAPS = [
  ['identical slot', '09:00', '11:00'],
  ['starts inside the booked slot', '10:00', '12:00'],
  ['ends inside the booked slot', '08:00', '10:00'],
  ['contains the booked slot', '08:00', '12:00'],
  ['lies inside the booked slot', '09:30', '10:30'],
  ['overlaps the end by one minute', '10:59', '12:00'],
  ['overlaps the start by one minute', '08:00', '09:01']
];

let tmpDir;
let db;
let server;
let baseUrl;
let studentA; // JWTs of two different students
let studentB;
let academic1; // { id, token }
let resources; // per reservation type: a primary and another resource to book

// config/db.js and middlewares/authMiddleware.js read their environment variables when they are
// first required, so the environment is prepared and the app modules are loaded here rather than
// at import time. Nothing is created unless the suite runs, and after() can always clean up.
async function startApp() {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'lab-reservation-test-'));
  process.env.JWT_SECRET = crypto.randomBytes(32).toString('hex');
  process.env.DB_PATH = path.join(tmpDir, 'test.sqlite');
  process.env.SEED_DEMO_DATA = 'false';

  db = require('../config/db');
  // Same wiring as server.js, which starts listening as soon as it is required.
  const app = express();
  app.use(express.json());
  app.use('/api/auth', require('../routes/authRoutes'));
  app.use('/api/reservations', require('../routes/reservationRoutes'));
  await new Promise((resolve) => {
    server = app.listen(0, '127.0.0.1', resolve);
  });
  baseUrl = `http://127.0.0.1:${server.address().port}`;
}

async function request(method, url, { token, body } = {}) {
  const headers = {};
  if (body !== undefined) headers['Content-Type'] = 'application/json';
  if (token) headers.Authorization = 'Bearer ' + token;
  const res = await fetch(baseUrl + url, {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body)
  });
  return { status: res.status, body: await res.json() };
}

const book = (token, type, resourceId, startTime, endTime) =>
  request('POST', '/api/reservations', { token, body: { type, resourceId, startTime, endTime } });

const setStatus = (token, id, status) =>
  request('PATCH', `/api/reservations/${id}/status`, { token, body: { status } });

const assertStatus = (res, expected) => assert.equal(res.status, expected, JSON.stringify(res.body));

function assertConflict(res) {
  assertStatus(res, 409);
  assert.equal(typeof res.body.error, 'string'); // the UI shows this message
}

async function mustBook(...args) {
  const res = await book(...args);
  assertStatus(res, 201);
  return res.body;
}

async function registerStudent(email) {
  const body = { name: email, email, password: PASSWORD };
  const res = await request('POST', '/api/auth/register', { body });
  assertStatus(res, 201);
  return res.body.token;
}

// Registration only creates students, so academics are inserted directly.
async function createAcademic(email) {
  const info = db
    .prepare('INSERT INTO users (name, email, password_hash, role) VALUES (?,?,?,?)')
    .run(email, email, bcrypt.hashSync(PASSWORD, 4), 'ACADEMIC');
  const res = await request('POST', '/api/auth/login', { body: { email, password: PASSWORD } });
  assertStatus(res, 200);
  return { id: Number(info.lastInsertRowid), token: res.body.token };
}

const createDevice = (name, id = null) =>
  Number(db.prepare('INSERT INTO devices (id, name) VALUES (?,?)').run(id, name).lastInsertRowid);

describe('double-booking prevention', () => {
  before(async () => {
    await startApp();

    studentA = await registerStudent('student.a@test.edu');
    studentB = await registerStudent('student.b@test.edu');
    academic1 = await createAcademic('academic1@test.edu');
    const academic2 = await createAcademic('academic2@test.edu');
    // The first device deliberately gets the same numeric id as the first academic: the two
    // resource types are separate id spaces and must never be mistaken for one another.
    const device1 = createDevice('Device 1', academic1.id);
    const device2 = createDevice('Device 2');
    resources = {
      DEVICE: { primary: device1, other: device2 },
      APPOINTMENT: { primary: academic1.id, other: academic2.id }
    };
  });

  after(async () => {
    if (server) {
      await new Promise((resolve) => {
        server.close(resolve);
        server.closeAllConnections();
      });
    }
    if (db) db.close();
    if (tmpDir) fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  beforeEach(() => {
    db.prepare('DELETE FROM reservations').run();
  });

  for (const type of ['DEVICE', 'APPOINTMENT']) {
    describe(`${type} reservations`, () => {
      const primary = () => resources[type].primary;
      // Student A holds 09:00-11:00 on the primary resource.
      const bookBaseline = () => mustBook(studentA, type, primary(), at('09:00'), at('11:00'));

      for (const [name, from, to] of OVERLAPS) {
        it(`rejects an overlapping request: ${name} (${from}-${to})`, async () => {
          await bookBaseline();
          assertConflict(await book(studentB, type, primary(), at(from), at(to)));
        });
      }

      it('allows back-to-back slots that only touch the booked one', async () => {
        await bookBaseline();
        await mustBook(studentB, type, primary(), at('11:00'), at('12:00'));
        await mustBook(studentB, type, primary(), at('08:00'), at('09:00'));
      });

      it('keeps the slot blocked while the reservation is PENDING or APPROVED', async () => {
        const booked = await bookBaseline();
        assert.equal(booked.status, 'PENDING');
        assertConflict(await book(studentB, type, primary(), at('09:00'), at('11:00')));

        assertStatus(await setStatus(academic1.token, booked.id, 'APPROVED'), 200);
        assertConflict(await book(studentB, type, primary(), at('09:00'), at('11:00')));
      });

      it('frees the slot when the reservation is REJECTED', async () => {
        const booked = await bookBaseline();
        assertStatus(await setStatus(academic1.token, booked.id, 'REJECTED'), 200);
        await mustBook(studentB, type, primary(), at('09:00'), at('11:00'));
      });

      it('frees the slot when the student cancels the reservation', async () => {
        const booked = await bookBaseline();
        const cancelled = await request('PATCH', `/api/reservations/${booked.id}/cancel`, {
          token: studentA
        });
        assertStatus(cancelled, 200);
        await mustBook(studentB, type, primary(), at('09:00'), at('11:00'));
      });

      it('does not conflict with the same slot on another resource', async () => {
        await bookBaseline();
        await mustBook(studentB, type, resources[type].other, at('09:00'), at('11:00'));
      });
    });
  }

  it('does not mix up a device and an academic that share the same numeric id', async () => {
    assert.equal(resources.DEVICE.primary, resources.APPOINTMENT.primary, 'fixture precondition');
    await mustBook(studentA, 'APPOINTMENT', resources.APPOINTMENT.primary, at('09:00'), at('11:00'));
    await mustBook(studentB, 'DEVICE', resources.DEVICE.primary, at('09:00'), at('11:00'));
  });

  it('compares instants rather than text when a request uses a UTC offset', async () => {
    const { primary } = resources.DEVICE;
    await mustBook(studentA, 'DEVICE', primary, at('09:00'), at('11:00'));
    // 12:00-14:00 at UTC+3 is exactly 09:00-11:00 UTC.
    assertConflict(await book(studentB, 'DEVICE', primary, atUtcPlus3('12:00'), atUtcPlus3('14:00')));
    // 14:00-15:00 at UTC+3 is 11:00-12:00 UTC, which only touches the booked slot.
    await mustBook(studentB, 'DEVICE', primary, atUtcPlus3('14:00'), atUtcPlus3('15:00'));
  });

  it('lets exactly one of several simultaneous requests for a slot through', async () => {
    const { primary } = resources.DEVICE;
    const students = [studentA, studentB];
    const results = await Promise.all(
      Array.from({ length: 6 }, (_, i) => book(students[i % 2], 'DEVICE', primary, at('09:00'), at('11:00')))
    );
    assert.deepEqual(results.map((r) => r.status).sort((a, b) => a - b), [201, 409, 409, 409, 409, 409]);
  });

  it('does not store a request that was rejected as a conflict', async () => {
    const { primary } = resources.DEVICE;
    await mustBook(studentA, 'DEVICE', primary, at('09:00'), at('11:00'));
    assertConflict(await book(studentB, 'DEVICE', primary, at('10:00'), at('12:00')));

    const mine = await request('GET', '/api/reservations/mine', { token: studentB });
    assertStatus(mine, 200);
    assert.deepEqual(mine.body, []);
  });
});
