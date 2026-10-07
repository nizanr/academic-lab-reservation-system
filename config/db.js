require('dotenv').config();
const path = require('path');
const Database = require('better-sqlite3');
const bcrypt = require('bcryptjs');

const dbPath = path.resolve(process.env.DB_PATH || './database.sqlite');
const db = new Database(dbPath);
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

db.exec(`
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('STUDENT','ACADEMIC','SUPER_ADMIN')),
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE TABLE IF NOT EXISTS academic_profiles (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  title TEXT,
  department TEXT,
  office TEXT
);
CREATE TABLE IF NOT EXISTS devices (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  description TEXT,
  location TEXT,
  active INTEGER NOT NULL DEFAULT 1
);
CREATE TABLE IF NOT EXISTS reservations (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  student_id INTEGER NOT NULL REFERENCES users(id),
  type TEXT NOT NULL CHECK (type IN ('APPOINTMENT','DEVICE')),
  academic_id INTEGER REFERENCES users(id),
  device_id INTEGER REFERENCES devices(id),
  start_time TEXT NOT NULL,
  end_time TEXT NOT NULL,
  note TEXT,
  status TEXT NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING','APPROVED','REJECTED','CANCELLED')),
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_res_device ON reservations(device_id, start_time, end_time);
CREATE INDEX IF NOT EXISTS idx_res_academic ON reservations(academic_id, start_time, end_time);
`);

function seed() {
  if (db.prepare('SELECT COUNT(*) AS c FROM users').get().c > 0) return;
  const insUser = db.prepare('INSERT INTO users (name, email, password_hash, role) VALUES (?,?,?,?)');
  const insProfile = db.prepare('INSERT INTO academic_profiles (user_id, title, department, office) VALUES (?,?,?,?)');
  const insDevice = db.prepare('INSERT INTO devices (name, description, location) VALUES (?,?,?)');
  const hash = (p) => bcrypt.hashSync(p, 10);

  db.transaction(() => {
    insUser.run('Sistem Yöneticisi', 'admin@uni.edu', hash('Admin123!'), 'SUPER_ADMIN');
    const a1 = insUser.run('Ayşe Yılmaz', 'academic@uni.edu', hash('Academic123!'), 'ACADEMIC').lastInsertRowid;
    const a2 = insUser.run('Mehmet Demir', 'academic2@uni.edu', hash('Academic123!'), 'ACADEMIC').lastInsertRowid;
    insUser.run('Öğrenci Deneme', 'student@uni.edu', hash('Student123!'), 'STUDENT');
    insProfile.run(a1, 'Prof. Dr.', 'Bilgisayar Mühendisliği', 'B-204');
    insProfile.run(a2, 'Doç. Dr.', 'Elektrik-Elektronik Mühendisliği', 'C-110');
    insDevice.run('3D Yazıcı (Prusa MK4)', 'FDM 3D yazıcı', 'Lab 1');
    insDevice.run('GPU Sunucusu (RTX 4090)', 'Derin öğrenme eğitim sunucusu', 'Sunucu Odası');
    insDevice.run('VR Gözlük (Quest 3)', 'Sanal gerçeklik başlığı', 'Lab 2');
  })();
}
seed();

module.exports = db;
