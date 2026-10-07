import express from 'express';
import authMiddleware, { requireAdmin } from '../middleware/authMiddleware.js';
import * as authController from '../controllers/authController.js';

const router = express.Router();

// Public routes
router.post('/register', authController.register);
router.post('/login', authController.login);

// Protected routes
router.get('/profile', authMiddleware, authController.getProfile);
router.put('/profile', authMiddleware, authController.updateProfile);

// Admin routes
router.get('/users', authMiddleware, requireAdmin, authController.getAllUsers);
router.get('/users/:userId', authMiddleware, requireAdmin, authController.getUserById);

export default router;
