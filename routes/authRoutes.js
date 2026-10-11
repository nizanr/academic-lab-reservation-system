const router = require('express').Router();
const { register, login, me, logout } = require('../controllers/authController');
const { authenticate } = require('../middlewares/authMiddleware');

router.post('/register', register);
router.post('/login', require('../middlewares/loginThrottle'), login);
router.get('/me', authenticate, me);
router.post('/logout', authenticate, logout);

module.exports = router;
