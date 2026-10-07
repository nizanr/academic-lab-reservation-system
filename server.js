require('dotenv').config();
if (!process.env.JWT_SECRET) throw new Error('JWT_SECRET environment variable is required.');
const path = require('path');
const fs = require('fs');
const express = require('express');
const cors = require('cors');
require('./config/db');

const app = express();
app.use(cors());
app.use(express.json());

app.get('/api/health', (req, res) => res.json({ status: 'ok' }));
app.use('/api/auth', require('./routes/authRoutes'));
app.use('/api/reservations', require('./routes/reservationRoutes'));
app.use('/api', (req, res) => res.status(404).json({ error: 'Bulunamadı.' }));

const dist = path.join(__dirname, 'dist');
if (fs.existsSync(dist)) {
  app.use(express.static(dist));
  app.get('*', (req, res) => res.sendFile(path.join(dist, 'index.html')));
}

app.use((err, req, res, next) => {
  console.error(err);
  const status = err.status || err.statusCode;
  const clientError = status >= 400 && status < 500;
  res.status(clientError ? status : 500).json({ error: clientError ? 'Geçersiz istek.' : 'Sunucu hatası.' });
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => console.log(`Sunucu http://localhost:${PORT} adresinde çalışıyor`));
