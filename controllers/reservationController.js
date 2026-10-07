const db = require('../config/db');

const ACTIVE = "('PENDING','APPROVED')";
const MAX_HOURS = 8;

const SELECT_RES = `
  SELECT r.*, s.name AS student_name, s.email AS student_email,
         a.name AS academic_name, d.name AS device_name
  FROM reservations r
  JOIN users s ON s.id = r.student_id
  LEFT JOIN users a ON a.id = r.academic_id
  LEFT JOIN devices d ON d.id = r.device_id`;

function findConflict(type, resourceId, start, end) {
  const col = type === 'DEVICE' ? 'device_id' : 'academic_id';
  return db
    .prepare(
      `SELECT id FROM reservations
       WHERE ${col} = ? AND status IN ${ACTIVE} AND start_time < ? AND end_time > ?`
    )
    .get(resourceId, end, start);
}

exports.getResources = (req, res) => {
  const academics = db
    .prepare(
      `SELECT u.id, u.name, p.title, p.department, p.office
       FROM users u LEFT JOIN academic_profiles p ON p.user_id = u.id WHERE u.role = 'ACADEMIC'`
    )
    .all();
  const devices = db.prepare('SELECT id, name, description, location FROM devices WHERE active = 1').all();
  res.json({ academics, devices });
};

// Herkese açık doluluk bilgisi (kişisel veri içermez): takvimde dolu aralıkları göstermek için.
exports.getBusySlots = (req, res) => {
  const { type, resourceId } = req.query;
  if (!['APPOINTMENT', 'DEVICE'].includes(type) || !Number.isInteger(Number(resourceId))) {
    return res.status(400).json({ error: 'type ve resourceId gerekli.' });
  }
  const col = type === 'DEVICE' ? 'device_id' : 'academic_id';
  const rows = db
    .prepare(
      `SELECT start_time, end_time, status FROM reservations
       WHERE ${col} = ? AND status IN ${ACTIVE} AND end_time > ? ORDER BY start_time`
    )
    .all(Number(resourceId), new Date().toISOString());
  res.json(rows);
};

exports.createReservation = (req, res) => {
  const { type, resourceId, startTime, endTime, note } = req.body || {};
  if (!['APPOINTMENT', 'DEVICE'].includes(type)) return res.status(400).json({ error: 'Geçersiz rezervasyon türü.' });
  const rid = Number(resourceId);
  if (!Number.isInteger(rid)) return res.status(400).json({ error: 'Kaynak seçilmeli.' });
  const start = new Date(startTime);
  const end = new Date(endTime);
  if (isNaN(start) || isNaN(end)) return res.status(400).json({ error: 'Geçersiz tarih.' });
  if (end <= start) return res.status(400).json({ error: 'Bitiş zamanı başlangıçtan sonra olmalı.' });
  if (start < new Date()) return res.status(400).json({ error: 'Geçmiş bir zamana rezervasyon yapılamaz.' });
  if ((end - start) / 3600000 > MAX_HOURS) {
    return res.status(400).json({ error: `Bir rezervasyon en fazla ${MAX_HOURS} saat olabilir.` });
  }
  const s = start.toISOString();
  const e = end.toISOString();

  if (type === 'DEVICE') {
    if (!db.prepare('SELECT id FROM devices WHERE id = ? AND active = 1').get(rid)) {
      return res.status(404).json({ error: 'Cihaz bulunamadı.' });
    }
  } else if (!db.prepare("SELECT id FROM users WHERE id = ? AND role = 'ACADEMIC'").get(rid)) {
    return res.status(404).json({ error: 'Akademisyen bulunamadı.' });
  }

  // better-sqlite3 senkron çalışır; transaction ile kontrol + ekleme atomik olur.
  const book = db.transaction(() => {
    if (findConflict(type, rid, s, e)) return null;
    return db
      .prepare(
        `INSERT INTO reservations (student_id, type, academic_id, device_id, start_time, end_time, note)
         VALUES (?,?,?,?,?,?,?)`
      )
      .run(
        req.user.id,
        type,
        type === 'APPOINTMENT' ? rid : null,
        type === 'DEVICE' ? rid : null,
        s,
        e,
        typeof note === 'string' ? note.slice(0, 500) : null
      ).lastInsertRowid;
  });
  const id = book.immediate();
  if (!id) return res.status(409).json({ error: 'Seçilen zaman aralığı dolu (çakışma).' });
  res.status(201).json(db.prepare(`${SELECT_RES} WHERE r.id = ?`).get(id));
};

exports.myReservations = (req, res) => {
  res.json(db.prepare(`${SELECT_RES} WHERE r.student_id = ? ORDER BY r.start_time DESC`).all(req.user.id));
};

exports.incomingReservations = (req, res) => {
  if (req.user.role === 'SUPER_ADMIN') {
    return res.json(db.prepare(`${SELECT_RES} ORDER BY r.start_time DESC`).all());
  }
  // Akademisyen: kendisine gelen randevular ve tüm cihaz talepleri
  res.json(
    db
      .prepare(`${SELECT_RES} WHERE r.academic_id = ? OR r.type = 'DEVICE' ORDER BY r.start_time DESC`)
      .all(req.user.id)
  );
};

exports.updateStatus = (req, res) => {
  const { status } = req.body || {};
  if (!['APPROVED', 'REJECTED'].includes(status)) {
    return res.status(400).json({ error: "Durum 'APPROVED' veya 'REJECTED' olmalı." });
  }
  const r = db.prepare('SELECT * FROM reservations WHERE id = ?').get(Number(req.params.id));
  if (!r) return res.status(404).json({ error: 'Rezervasyon bulunamadı.' });
  if (req.user.role === 'ACADEMIC' && r.type === 'APPOINTMENT' && r.academic_id !== req.user.id) {
    return res.status(403).json({ error: 'Bu randevu size ait değil.' });
  }
  if (r.status !== 'PENDING') return res.status(409).json({ error: 'Sadece bekleyen talepler güncellenebilir.' });
  db.prepare('UPDATE reservations SET status = ? WHERE id = ?').run(status, r.id);
  res.json(db.prepare(`${SELECT_RES} WHERE r.id = ?`).get(r.id));
};

exports.cancelReservation = (req, res) => {
  const r = db.prepare('SELECT * FROM reservations WHERE id = ?').get(Number(req.params.id));
  if (!r || r.student_id !== req.user.id) return res.status(404).json({ error: 'Rezervasyon bulunamadı.' });
  if (!['PENDING', 'APPROVED'].includes(r.status)) {
    return res.status(409).json({ error: 'Bu rezervasyon iptal edilemez.' });
  }
  db.prepare("UPDATE reservations SET status = 'CANCELLED' WHERE id = ?").run(r.id);
  res.json(db.prepare(`${SELECT_RES} WHERE r.id = ?`).get(r.id));
};

// ---- Grafik verileri ----
exports.deviceUsageStats = (req, res) => {
  // Kullanım oranı: son 30 gündeki onaylı rezervasyon saatleri / (30 gün * 8 saatlik çalışma günü)
  const since = new Date(Date.now() - 30 * 86400000).toISOString();
  const capacityHours = 30 * 8;
  const rows = db
    .prepare(
      `SELECT d.id, d.name,
              COALESCE(SUM((julianday(r.end_time) - julianday(r.start_time)) * 24), 0) AS hours,
              COUNT(r.id) AS count
       FROM devices d
       LEFT JOIN reservations r ON r.device_id = d.id AND r.status = 'APPROVED' AND r.start_time >= ?
       GROUP BY d.id ORDER BY d.name`
    )
    .all(since);
  res.json(
    rows.map((x) => ({
      id: x.id,
      name: x.name,
      hours: Math.round(x.hours * 100) / 100,
      count: x.count,
      utilization: Math.min(100, Math.round((x.hours / capacityHours) * 10000) / 100)
    }))
  );
};

exports.statusStats = (req, res) => {
  const rows = db
    .prepare('SELECT type, status, COUNT(*) AS count FROM reservations GROUP BY type, status')
    .all();
  const totals = { PENDING: 0, APPROVED: 0, REJECTED: 0, CANCELLED: 0 };
  rows.forEach((r) => (totals[r.status] += r.count));
  res.json({ totals, byType: rows });
};

// ---- Süper admin ----
exports.listUsers = (req, res) => {
  res.json(db.prepare('SELECT id, name, email, role, created_at FROM users ORDER BY id').all());
};

exports.updateUserRole = (req, res) => {
  const { role } = req.body || {};
  const id = Number(req.params.id);
  if (!['STUDENT', 'ACADEMIC', 'SUPER_ADMIN'].includes(role)) return res.status(400).json({ error: 'Geçersiz rol.' });
  if (id === req.user.id) return res.status(400).json({ error: 'Kendi rolünüzü değiştiremezsiniz.' });
  const u = db.prepare('SELECT id FROM users WHERE id = ?').get(id);
  if (!u) return res.status(404).json({ error: 'Kullanıcı bulunamadı.' });
  db.transaction(() => {
    db.prepare('UPDATE users SET role = ? WHERE id = ?').run(role, id);
    if (role === 'ACADEMIC') {
      db.prepare('INSERT OR IGNORE INTO academic_profiles (user_id, title, department, office) VALUES (?,?,?,?)').run(
        id, '', '', ''
      );
    }
  })();
  res.json(db.prepare('SELECT id, name, email, role FROM users WHERE id = ?').get(id));
};

exports.createDevice = (req, res) => {
  const { name, description, location } = req.body || {};
  if (typeof name !== 'string' || !name.trim()) return res.status(400).json({ error: 'Cihaz adı gerekli.' });
  const info = db
    .prepare('INSERT INTO devices (name, description, location) VALUES (?,?,?)')
    .run(name.trim(), description || '', location || '');
  res.status(201).json(db.prepare('SELECT * FROM devices WHERE id = ?').get(info.lastInsertRowid));
};

exports.deactivateDevice = (req, res) => {
  const info = db.prepare('UPDATE devices SET active = 0 WHERE id = ?').run(Number(req.params.id));
  if (!info.changes) return res.status(404).json({ error: 'Cihaz bulunamadı.' });
  res.json({ ok: true });
};
