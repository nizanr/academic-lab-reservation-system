import express from 'express';
import authMiddleware, { requireStudent, requireAcademic, requireAdmin } from '../middleware/authMiddleware.js';
import * as reservationController from '../controllers/reservationController.js';

const router = express.Router();

// Appointments routes
router.post('/appointments/request', authMiddleware, requireStudent, reservationController.requestAppointment);
router.get('/appointments', authMiddleware, reservationController.getMyAppointments);
router.put('/appointments/:appointmentId/approve', authMiddleware, requireAcademic, reservationController.approveAppointment);
router.put('/appointments/:appointmentId/reject', authMiddleware, requireAcademic, reservationController.rejectAppointment);

// Device Reservations routes
router.post('/reservations/request', authMiddleware, requireStudent, reservationController.requestDeviceReservation);
router.get('/reservations', authMiddleware, reservationController.getMyReservations);
router.get('/reservations/pending', authMiddleware, requireAdmin, reservationController.getPendingReservations);
router.put('/reservations/:reservationId/approve', authMiddleware, requireAdmin, reservationController.approveReservation);
router.put('/reservations/:reservationId/reject', authMiddleware, requireAdmin, reservationController.rejectReservation);

// Available resources
router.get('/academics/available', authMiddleware, requireStudent, reservationController.getAvailableAcademics);
router.get('/devices/available', authMiddleware, reservationController.getAvailableDevices);

// Statistics and analytics
router.get('/statistics', authMiddleware, reservationController.getStatistics);
router.get('/devices/usage/stats', authMiddleware, requireAcademic, reservationController.getDeviceUsageStats);

export default router;
