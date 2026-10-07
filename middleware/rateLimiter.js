import rateLimit from 'express-rate-limit'

// General API rate limiter
export const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: 'Çok fazla istek gönderdiniz, lütfen daha sonra tekrar deneyiniz.',
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
  skip: (req) => {
    // Skip health check endpoint
    return req.path === '/api/health'
  },
})

// Auth endpoints rate limiter (stricter)
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // limit each IP to 5 requests per windowMs for auth endpoints
  message: 'Çok fazla giriş denemesi, lütfen 15 dakika sonra tekrar deneyiniz.',
  skipSuccessfulRequests: true, // Don't count successful requests
  skipFailedRequests: false, // Count failed requests
  standardHeaders: true,
  legacyHeaders: false,
})

// Reservation endpoints rate limiter
export const reservationLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 30, // limit each IP to 30 requests per minute
  message: 'Çok fazla işlem, lütfen biraz sonra tekrar deneyiniz.',
  standardHeaders: true,
  legacyHeaders: false,
})

export default {
  apiLimiter,
  authLimiter,
  reservationLimiter,
}
