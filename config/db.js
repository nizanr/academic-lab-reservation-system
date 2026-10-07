import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import { v4 as uuid } from 'uuid';
import bcryptjs from 'bcryptjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dbPath = process.env.DB_PATH || path.join(__dirname, '..', 'data', 'app.db');

// Ensure data directory exists
const dataDir = path.dirname(dbPath);
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const db = new Database(dbPath);

// Enable foreign keys
db.pragma('foreign_keys = ON');

/**
 * Initialize database schema and seed default data
 */
export function initializeDatabase() {
  try {
    // Create tables
    db.exec(`
      CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        email TEXT UNIQUE NOT NULL,
        password TEXT NOT NULL,
        role TEXT CHECK(role IN ('STUDENT', 'ACADEMIC', 'SUPER_ADMIN')) NOT NULL DEFAULT 'STUDENT',
        department TEXT,
        phone TEXT,
        bio TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS academic_availability (
        id TEXT PRIMARY KEY,
        academic_id TEXT NOT NULL,
        day_of_week INTEGER CHECK(day_of_week BETWEEN 0 AND 6) NOT NULL,
        start_time TEXT NOT NULL,
        end_time TEXT NOT NULL,
        slot_duration_minutes INTEGER DEFAULT 30,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (academic_id) REFERENCES users(id) ON DELETE CASCADE
      );

      CREATE TABLE IF NOT EXISTS consultation_appointments (
        id TEXT PRIMARY KEY,
        student_id TEXT NOT NULL,
        academic_id TEXT NOT NULL,
        scheduled_date DATE NOT NULL,
        start_time TEXT NOT NULL,
        end_time TEXT NOT NULL,
        status TEXT CHECK(status IN ('PENDING', 'APPROVED', 'REJECTED', 'COMPLETED', 'CANCELLED')) DEFAULT 'PENDING',
        topic TEXT,
        notes TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (student_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (academic_id) REFERENCES users(id) ON DELETE CASCADE,
        UNIQUE(academic_id, scheduled_date, start_time)
      );

      CREATE TABLE IF NOT EXISTS lab_devices (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL UNIQUE,
        description TEXT,
        category TEXT CHECK(category IN ('3D_PRINTER', 'GPU_SERVER', 'VR_EQUIPMENT', 'OTHER')) DEFAULT 'OTHER',
        location TEXT,
        max_reservation_minutes INTEGER DEFAULT 120,
        status TEXT CHECK(status IN ('AVAILABLE', 'MAINTENANCE', 'RETIRED')) DEFAULT 'AVAILABLE',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS device_reservations (
        id TEXT PRIMARY KEY,
        student_id TEXT NOT NULL,
        device_id TEXT NOT NULL,
        reserved_date DATE NOT NULL,
        start_time TEXT NOT NULL,
        end_time TEXT NOT NULL,
        duration_minutes INTEGER NOT NULL,
        purpose TEXT,
        status TEXT CHECK(status IN ('PENDING', 'APPROVED', 'REJECTED', 'ACTIVE', 'COMPLETED', 'CANCELLED')) DEFAULT 'PENDING',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (student_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (device_id) REFERENCES lab_devices(id) ON DELETE CASCADE,
        UNIQUE(device_id, reserved_date, start_time)
      );

      CREATE TABLE IF NOT EXISTS activity_logs (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        action TEXT NOT NULL,
        resource_type TEXT,
        resource_id TEXT,
        details TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      );

      CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
      CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
      CREATE INDEX IF NOT EXISTS idx_appointments_student ON consultation_appointments(student_id);
      CREATE INDEX IF NOT EXISTS idx_appointments_academic ON consultation_appointments(academic_id);
      CREATE INDEX IF NOT EXISTS idx_appointments_date ON consultation_appointments(scheduled_date);
      CREATE INDEX IF NOT EXISTS idx_reservations_student ON device_reservations(student_id);
      CREATE INDEX IF NOT EXISTS idx_reservations_device ON device_reservations(device_id);
      CREATE INDEX IF NOT EXISTS idx_reservations_date ON device_reservations(reserved_date);
      CREATE INDEX IF NOT EXISTS idx_logs_user ON activity_logs(user_id);
      CREATE INDEX IF NOT EXISTS idx_logs_date ON activity_logs(created_at);
    `);

    // Seed default data if tables are empty
    const usersCount = db.prepare('SELECT COUNT(*) as count FROM users').get().count;

    if (usersCount === 0) {
      const salt = bcryptjs.genSaltSync(10);
      const hashedPassword = bcryptjs.hashSync('password123', salt);

      // Create test users
      const testUsers = [
        {
          id: uuid(),
          name: 'Ali Yıldız',
          email: 'student@example.com',
          password: hashedPassword,
          role: 'STUDENT',
          department: 'Bilgisayar Mühendisliği',
          phone: '+90 555 111 1111',
        },
        {
          id: uuid(),
          name: 'Prof. Ahmet Demir',
          email: 'academic@example.com',
          password: hashedPassword,
          role: 'ACADEMIC',
          department: 'Bilgisayar Mühendisliği',
          phone: '+90 555 222 2222',
          bio: 'AI ve Machine Learning uzmanı',
        },
        {
          id: uuid(),
          name: 'Sistem Yöneticisi',
          email: 'admin@example.com',
          password: hashedPassword,
          role: 'SUPER_ADMIN',
          department: 'Bilişim Daire Başkanlığı',
          phone: '+90 555 333 3333',
        },
      ];

      const insertUser = db.prepare(`
        INSERT INTO users (id, name, email, password, role, department, phone, bio)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `);

      for (const user of testUsers) {
        insertUser.run(
          user.id,
          user.name,
          user.email,
          user.password,
          user.role,
          user.department,
          user.phone,
          user.bio || null
        );
      }

      // Create lab devices
      const devices = [
        {
          id: uuid(),
          name: '3D Yazıcı - Prusa i3',
          description: 'Yüksek hassasiyetli 3D yazıcı',
          category: '3D_PRINTER',
          location: 'Lab - Odası 101',
          max_reservation_minutes: 180,
        },
        {
          id: uuid(),
          name: 'GPU Sunucusu - NVIDIA RTX 4090',
          description: 'Derin öğrenme ve AI eğitimi için GPU sunucusu',
          category: 'GPU_SERVER',
          location: 'Server Odası - Raf 3',
          max_reservation_minutes: 240,
        },
        {
          id: uuid(),
          name: 'VR Gözlük - Meta Quest 3',
          description: 'Sanal gerçeklik deneyimi için',
          category: 'VR_EQUIPMENT',
          location: 'Lab - Odası 102',
          max_reservation_minutes: 120,
        },
      ];

      const insertDevice = db.prepare(`
        INSERT INTO lab_devices (id, name, description, category, location, max_reservation_minutes, status)
        VALUES (?, ?, ?, ?, ?, ?, 'AVAILABLE')
      `);

      for (const device of devices) {
        insertDevice.run(
          device.id,
          device.name,
          device.description,
          device.category,
          device.location,
          device.max_reservation_minutes
        );
      }

      console.log('✅ Database initialized with default data');
    }
  } catch (error) {
    console.error('❌ Database initialization error:', error);
    throw error;
  }
}

/**
 * Get database connection
 */
export function getDatabase() {
  return db;
}

/**
 * Close database connection
 */
export function closeDatabase() {
  if (db) {
    db.close();
  }
}

export default db;
