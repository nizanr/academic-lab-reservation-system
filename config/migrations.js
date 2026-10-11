// Additive migrations preserve the existing users and reservations.
module.exports = function migrate(db) {
  db.exec(`CREATE TABLE IF NOT EXISTS schema_migrations (
    version INTEGER PRIMARY KEY, applied_at TEXT NOT NULL DEFAULT (datetime('now'))
  )`);
  if (!db.prepare('SELECT 1 FROM schema_migrations WHERE version = 1').get()) {
    db.transaction(() => {
      const columns = new Set(db.prepare('PRAGMA table_info(users)').all().map(c => c.name));
      if (!columns.has('student_number')) db.exec('ALTER TABLE users ADD COLUMN student_number TEXT');
      if (!columns.has('active')) db.exec('ALTER TABLE users ADD COLUMN active INTEGER NOT NULL DEFAULT 1 CHECK(active IN (0,1))');
      if (!columns.has('token_version')) db.exec('ALTER TABLE users ADD COLUMN token_version INTEGER NOT NULL DEFAULT 0');
      db.exec('CREATE UNIQUE INDEX IF NOT EXISTS users_student_number ON users(student_number)');
      db.prepare('INSERT INTO schema_migrations(version) VALUES (1)').run();
    }).immediate();
  }
};
