const router = require('express').Router();
const c = require('../controllers/reservationController');
const { authenticate, authorize } = require('../middlewares/authMiddleware');

router.use(authenticate);

router.get('/resources', c.getResources);
router.get('/busy', c.getBusySlots);

router.post('/', authorize('STUDENT'), c.createReservation);
router.get('/mine', authorize('STUDENT'), c.myReservations);
router.patch('/:id/cancel', authorize('STUDENT'), c.cancelReservation);

router.get('/incoming', authorize('ACADEMIC', 'SUPER_ADMIN'), c.incomingReservations);
router.patch('/:id/status', authorize('ACADEMIC', 'SUPER_ADMIN'), c.updateStatus);
router.get('/stats/devices', authorize('ACADEMIC', 'SUPER_ADMIN'), c.deviceUsageStats);
router.get('/stats/status', authorize('ACADEMIC', 'SUPER_ADMIN'), c.statusStats);

router.get('/admin/users', authorize('SUPER_ADMIN'), c.listUsers);
router.patch('/admin/users/:id/role', authorize('SUPER_ADMIN'), c.updateUserRole);
router.post('/admin/devices', authorize('SUPER_ADMIN'), c.createDevice);
router.delete('/admin/devices/:id', authorize('SUPER_ADMIN'), c.deactivateDevice);

module.exports = router;
