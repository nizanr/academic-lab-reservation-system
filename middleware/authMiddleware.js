import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'your_super_secret_jwt_key_change_in_production_12345';
const JWT_EXPIRE = process.env.JWT_EXPIRE || '7d';

/**
 * Verify JWT token
 */
export function verifyToken(token) {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch (error) {
    return null;
  }
}

/**
 * Generate JWT token
 */
export function generateToken(userId, role) {
  return jwt.sign({ userId, role }, JWT_SECRET, { expiresIn: JWT_EXPIRE });
}

/**
 * Authentication middleware
 * Verifies JWT token from Authorization header
 */
export function authMiddleware(req, res, next) {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Yetkilendirme gerekli' });
    }

    const token = authHeader.substring(7);
    const decoded = verifyToken(token);

    if (!decoded) {
      return res.status(401).json({ error: 'Geçersiz veya süresi dolmuş token' });
    }

    req.user = decoded;
    next();
  } catch (error) {
    console.error('Auth middleware error:', error);
    res.status(500).json({ error: 'Kimlik doğrulama hatası' });
  }
}

/**
 * Role-based authorization middleware
 * Checks if user has required role
 */
export function requireRole(...allowedRoles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Yetkilendirme gerekli' });
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        error: 'Bu işlemi yapma yetkiniz yok',
        requiredRole: allowedRoles,
        userRole: req.user.role,
      });
    }

    next();
  };
}

/**
 * RBAC: Student role required
 */
export function requireStudent(req, res, next) {
  return requireRole('STUDENT', 'SUPER_ADMIN')(req, res, next);
}

/**
 * RBAC: Academic role required
 */
export function requireAcademic(req, res, next) {
  return requireRole('ACADEMIC', 'SUPER_ADMIN')(req, res, next);
}

/**
 * RBAC: Super Admin role required
 */
export function requireAdmin(req, res, next) {
  return requireRole('SUPER_ADMIN')(req, res, next);
}

export default authMiddleware;
