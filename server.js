import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { initializeDatabase } from './config/db.js';
import authRoutes from './routes/authRoutes.js';
import reservationRoutes from './routes/reservationRoutes.js';
import { apiLimiter, authLimiter, reservationLimiter } from './middleware/rateLimiter.js'

// Load environment variables
dotenv.config()

// Initialize database
initializeDatabase()

// Create Express app
const app = express()
const PORT = process.env.PORT || 5000
const CORS_ORIGIN = process.env.CORS_ORIGIN || 'http://localhost:5173'

// Middleware
app.use(cors({
  origin: CORS_ORIGIN,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}))

// Apply global rate limiter
app.use(apiLimiter)

app.use(express.json())
app.use(express.urlencoded({ extended: true }))

// Request logging middleware
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`)
  next()
})

// Routes with specific rate limiters
app.use('/api/auth', authLimiter, authRoutes)
app.use('/api/reservations', reservationLimiter, reservationRoutes)

// Health check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    message: 'Akademik Birebir Danışmanlık ve Lab Cihazı Rezerve Sistemi - API Server',
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    error: 'Not Found',
    message: `Route ${req.method} ${req.path} bulunamadı`,
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(err.status || 500).json({
    error: err.message || 'İç sunucu hatası',
    timestamp: new Date().toISOString(),
  });
});

// Start server
const server = app.listen(PORT, () => {
  console.log(`\n🚀 Akademik Birebir Danışmanlık ve Lab Cihazı Rezerve Sistemi`);
  console.log(`📡 API Server: http://localhost:${PORT}`);
  console.log(`🔐 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`✅ Bağlantı: http://localhost:${PORT}/api/health`);
  console.log(`\n📚 Frontend: ${CORS_ORIGIN}`);
  console.log(`\n⚠️  Ctrl+C ile sunucuyu durdur\n`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM alındı, sunucu kapatılıyor...');
  server.close(() => {
    console.log('Sunucu kapatıldı');
    process.exit(0);
  });
});

export default app;
