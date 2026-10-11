// Single-process demo limiter. A multi-instance deployment needs a shared store.
const WINDOW = 15 * 60 * 1000;
const failures = new Map();
module.exports = function loginThrottle(req, res, next) {
  const now = Date.now();
  for (const [key, entry] of failures) if (entry.until <= now) failures.delete(key);
  const email = typeof req.body?.email === 'string' ? req.body.email.trim().toLowerCase().slice(0, 254) : '';
  const keys = ['ip:' + req.ip, 'email:' + email];
  const blocked = keys.map(key => failures.get(key)).find(entry => entry?.count >= 5);
  if (blocked) {
    res.set('Retry-After', String(Math.ceil((blocked.until - now) / 1000)));
    return res.status(429).json({ error: 'Çok fazla başarısız deneme. Daha sonra tekrar deneyin.' });
  }
  res.on('finish', () => {
    if (res.statusCode === 401) {
      for (const key of keys) {
        if (failures.size >= 10000 && !failures.has(key)) failures.delete(failures.keys().next().value);
        const entry = failures.get(key);
        failures.set(key, { count: (entry?.count || 0) + 1, until: entry?.until || now + WINDOW });
      }
    } else if (res.statusCode === 200) {
      failures.delete(keys[1]);
    }
  });
  next();
};
