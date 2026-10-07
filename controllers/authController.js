import bcryptjs from 'bcryptjs';
import { v4 as uuid } from 'uuid';
import db from '../config/db.js';
import { generateToken } from '../middleware/authMiddleware.js';

/**
 * Register a new user
 */
export async function register(req, res) {
  try {
    const { name, email, password, role, department, phone } = req.body;

    // Validation
    if (!name || !email || !password) {
      return res.status(400).json({ error: 'Ad, email ve şifre gereklidir' });
    }

    if (password.length < 6) {
      return res.status(400).json({ error: 'Şifre en az 6 karakter olmalıdır' });
    }

    // Check if user already exists
    const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(email);
    if (existing) {
      return res.status(409).json({ error: 'Bu email zaten kayıtlı' });
    }

    // Hash password
    const salt = bcryptjs.genSaltSync(10);
    const hashedPassword = bcryptjs.hashSync(password, salt);

    // Create user
    const userId = uuid();
    const userRole = role || 'STUDENT';

    const insert = db.prepare(`
      INSERT INTO users (id, name, email, password, role, department, phone)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);

    insert.run(userId, name, email, hashedPassword, userRole, department || null, phone || null);

    // Generate token
    const token = generateToken(userId, userRole);

    res.status(201).json({
      message: 'Kullanıcı başarıyla oluşturuldu',
      user: {
        id: userId,
        name,
        email,
        role: userRole,
        department: department || null,
        phone: phone || null,
      },
      token,
    });
  } catch (error) {
    console.error('Register error:', error);
    res.status(500).json({ error: 'Kayıt hatası' });
  }
}

/**
 * Login user
 */
export async function login(req, res) {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email ve şifre gereklidir' });
    }

    // Get user
    const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email);

    if (!user) {
      return res.status(401).json({ error: 'Email veya şifre yanlış' });
    }

    // Verify password
    const isPasswordValid = bcryptjs.compareSync(password, user.password);

    if (!isPasswordValid) {
      return res.status(401).json({ error: 'Email veya şifre yanlış' });
    }

    // Generate token
    const token = generateToken(user.id, user.role);

    res.json({
      message: 'Başarıyla giriş yapıldı',
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        department: user.department,
        phone: user.phone,
      },
      token,
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Giriş hatası' });
  }
}

/**
 * Get current user profile
 */
export function getProfile(req, res) {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Yetkilendirme gerekli' });
    }

    const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.user.userId);

    if (!user) {
      return res.status(404).json({ error: 'Kullanıcı bulunamadı' });
    }

    res.json({
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        department: user.department,
        phone: user.phone,
        bio: user.bio,
      },
    });
  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({ error: 'Profil alma hatası' });
  }
}

/**
 * Update user profile
 */
export function updateProfile(req, res) {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Yetkilendirme gerekli' });
    }

    const { name, phone, department, bio } = req.body;
    const userId = req.user.userId;

    const update = db.prepare(`
      UPDATE users
      SET name = COALESCE(?, name),
          phone = COALESCE(?, phone),
          department = COALESCE(?, department),
          bio = COALESCE(?, bio),
          updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `);

    update.run(name || null, phone || null, department || null, bio || null, userId);

    const user = db.prepare('SELECT * FROM users WHERE id = ?').get(userId);

    res.json({
      message: 'Profil başarıyla güncellendi',
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        department: user.department,
        phone: user.phone,
        bio: user.bio,
      },
    });
  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({ error: 'Profil güncelleme hatası' });
  }
}

/**
 * Get all users (Admin only)
 */
export function getAllUsers(req, res) {
  try {
    const users = db.prepare('SELECT id, name, email, role, department, created_at FROM users ORDER BY created_at DESC').all();
    res.json({ users });
  } catch (error) {
    console.error('Get all users error:', error);
    res.status(500).json({ error: 'Kullanıcıları alma hatası' });
  }
}

/**
 * Get user by ID (Admin only)
 */
export function getUserById(req, res) {
  try {
    const { userId } = req.params;
    const user = db.prepare('SELECT * FROM users WHERE id = ?').get(userId);

    if (!user) {
      return res.status(404).json({ error: 'Kullanıcı bulunamadı' });
    }

    res.json({ user });
  } catch (error) {
    console.error('Get user by ID error:', error);
    res.status(500).json({ error: 'Kullanıcı alma hatası' });
  }
}
