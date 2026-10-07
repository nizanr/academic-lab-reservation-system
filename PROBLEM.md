# PROBLEM.md - Akademik Birebir Danışmanlık ve Lab Cihazı Rezerve Sistemi

## 🎯 Proje Özeti

**Proje Adı:** Akademik Birebir Danışmanlık & Lab Cihazı Rezerve Sistemi  
**Amaç:** Öğrencilerin akademisyenlerden çakışmasız randevu almasını ve 3D yazıcı/GPU sunucusu gibi lab cihazlarını rezerve etmesini sağlayan bir web platformu.

## 📋 Mevcut Durum & Gereksinimler

### Problem Tasviri
- Üniversitede öğrenciler, akademisyenlerin müsait zamanlarında randevu almakta zorlanmaktadırlar
- Lab cihazlarının (3D yazıcı, GPU sunucusu vb.) paylaşılmasında çakışmalar yaşanmaktadır
- Başvuruların onaylanması/reddedilmesi için merkezi bir sistem yoktur

### İş Gereksinimleri
1. Öğrenciler randevu talep edebilir ve cihaz rezerve edebilir
2. Akademisyenler talepleri onaylayabilir/reddedebilir
3. Sistem otomatik olarak çakışmaları önlemeli
4. Admin tüm sistemi yönetebilmelidir
5. Raporlama ve istatistikler sağlanmalıdır

## 🛠️ Teknik Mimari & Seçilen Teknolojiler

### Frontend Stack
- **Framework:** React.js (Vite yapısında)
- **Styling:** Tailwind CSS (responsive design)
- **Grafik:** Chart.js (istatistikler ve raporlama)
- **State Yönetimi:** React Context API
- **Routing:** React Router v6

### Backend Stack
- **Runtime:** Node.js
- **Framework:** Express.js
- **Mimari:** Modüler MVC yapısı
- **Veritabanı:** SQLite (sıfır yapılandırma)
- **Kimlik Doğrulama:** JWT (JSON Web Token)
- **Şifreleme:** bcryptjs

### Veritabanı Şeması

```sql
-- Kullanıcılar Tablosu
CREATE TABLE users (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  password TEXT NOT NULL,
  role TEXT CHECK(role IN ('STUDENT', 'ACADEMIC', 'SUPER_ADMIN')),
  department TEXT,
  phone TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Akademisyen Müsait Zamanları
CREATE TABLE academic_availability (
  id TEXT PRIMARY KEY,
  academic_id TEXT NOT NULL,
  day_of_week INTEGER CHECK(day_of_week BETWEEN 0 AND 6),
  start_time TEXT NOT NULL,
  end_time TEXT NOT NULL,
  slot_duration_minutes INTEGER DEFAULT 30,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (academic_id) REFERENCES users(id)
);

-- Danışmanlık Randevuları
CREATE TABLE consultation_appointments (
  id TEXT PRIMARY KEY,
  student_id TEXT NOT NULL,
  academic_id TEXT NOT NULL,
  scheduled_date DATE NOT NULL,
  start_time TEXT NOT NULL,
  end_time TEXT NOT NULL,
  status TEXT CHECK(status IN ('PENDING', 'APPROVED', 'REJECTED', 'COMPLETED', 'CANCELLED')),
  topic TEXT,
  notes TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (student_id) REFERENCES users(id),
  FOREIGN KEY (academic_id) REFERENCES users(id),
  UNIQUE(academic_id, scheduled_date, start_time)
);

-- Lab Cihazları
CREATE TABLE lab_devices (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  category TEXT CHECK(category IN ('3D_PRINTER', 'GPU_SERVER', 'VR_EQUIPMENT', 'OTHER')),
  location TEXT,
  status TEXT CHECK(status IN ('AVAILABLE', 'MAINTENANCE', 'RETIRED')),
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Cihaz Rezervasyonları
CREATE TABLE device_reservations (
  id TEXT PRIMARY KEY,
  student_id TEXT NOT NULL,
  device_id TEXT NOT NULL,
  reserved_date DATE NOT NULL,
  start_time TEXT NOT NULL,
  end_time TEXT NOT NULL,
  duration_minutes INTEGER NOT NULL,
  purpose TEXT,
  status TEXT CHECK(status IN ('PENDING', 'APPROVED', 'REJECTED', 'ACTIVE', 'COMPLETED', 'CANCELLED')),
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (student_id) REFERENCES users(id),
  FOREIGN KEY (device_id) REFERENCES lab_devices(id),
  UNIQUE(device_id, reserved_date, start_time)
);

-- Aktivite Kaydı (Audit Log)
CREATE TABLE activity_logs (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  action TEXT NOT NULL,
  resource_type TEXT,
  resource_id TEXT,
  details TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id)
);
```

## 🔐 Rol Tabanlı Yetkilendirme (RBAC)

| Rol | İzinler |
|-----|---------|
| **STUDENT** | Randevu talep et, Cihaz rezerve et, Kendi rezervasyonlarını görüntüle |
| **ACADEMIC** | Randevuları onayla/reddet, Kendi müsaitliğini yönet, Istatistikleri görüntüle |
| **SUPER_ADMIN** | Tüm işlemler, Kullanıcı yönetimi, Cihaz yönetimi, Sistem ayarları |

## 📊 Dinamik Çakışma Kontrol Mekanizması

1. **Randevu Çakışması Kontrolü:**
   - Akademisyen aynı saatte başka randevu alamaz
   - Her randevu bir zaman aralığı kaplar
   - Veritabanı seviyesinde UNIQUE constraint uygulanır

2. **Cihaz Çakışması Kontrolü:**
   - Her cihaz aynı anda sadece bir kişiye verilebilir
   - Zaman aralıkları birebir gelememeli
   - Sistem otomatik olarak müsait saatleri filtreler

3. **Onay İş Akışı:**
   - Talepler varsayılan olarak PENDING durumunda oluşturulur
   - Akademisyen/Admin APPROVED veya REJECTED seçebilir
   - Onaylandıktan sonra zamanı kilitli kalır

## 📈 Raporlama & Grafik Özellikleri

### Öğrenci Panelinde
- Kendi randevu geçmişi
- Kendi cihaz rezervasyonları
- Başvuru durumları (onay bekleyen, onaylı, reddedilen)

### Akademisyen Panelinde
- Gelen randevu talepleri (beklemede, onaylı)
- Müsaitlik yönetimi
- Randevu istatistikleri (görüntülenme sayıları, onay oranları)

### Admin Panelinde
- Sistem geneli istatistikleri
- Cihaz kullanım oranları
- Öğrenci-Akademisyen ilişkileri
- Aktivite günlükleri

## ✅ Seçilen Çözümler

1. **Veritabanı:** SQLite tercih edildi (kurulum kolaylığı, sıfır konfigürasyon)
2. **Kimlik Doğrulama:** JWT seçildi (stateless, scalable)
3. **Frontend:** React + Vite (hızlı geliştirme, modern tools)
4. **Stil:** Tailwind CSS (rapid prototyping, responsive design)
5. **Çakışma Önleme:** UNIQUE constraint + aplikasyon seviyesi validasyon

## 📁 Proje Dosya Yapısı

```
academic-lab-reservation-system/
├── server.js                          # Ana sunucu girdisi
├── package.json                       # Proje bağımlılıkları
├── .env.example                       # Çevre değişkenleri template
├── .gitignore                         # Git ignore kuralları
├── README.md                          # Kurulum ve kullanım rehberi
├── PROBLEM.md                         # Bu dosya
├── AI_LOG.md                          # Yapılan değişiklik kaydı
│
├── config/
│   └── db.js                          # SQLite konfigürasyonu ve DB kurulumu
│
├── middleware/
│   └── authMiddleware.js              # JWT doğrulama ve RBAC
│
├── controllers/
│   ├── authController.js              # Kimlik doğrulama işlemleri
│   └── reservationController.js       # Rezervasyon işlemleri ve istatistikler
│
├── routes/
│   ├── authRoutes.js                  # Auth endpoint'leri
│   └── reservationRoutes.js           # Rezervasyon endpoint'leri
│
├── data/
│   └── app.db                         # SQLite veritabanı dosyası (gitignore)
│
└── client/                            # React/Vite frontend
    ├── package.json
    ├── vite.config.js
    ├── src/
    │   ├── App.jsx                    # Ana uygulama bileşeni ve routing
    │   ├── main.jsx                   # Giriş noktası
    │   ├── index.css                  # Global stiller
    │   ├── contexts/
    │   │   └── AuthContext.jsx        # Auth state yönetimi
    │   ├── pages/
    │   │   ├── Login.jsx              # Login sayfası
    │   │   ├── Register.jsx           # Kayıt sayfası
    │   │   ├── StudentDashboard.jsx   # Öğrenci paneli
    │   │   └── AcademicDashboard.jsx  # Akademisyen paneli
    │   ├── components/
    │   │   └── Navbar.jsx             # Navigasyon çubuğu
    │   ├── utils/
    │   │   ├── api.js                 # API çağrıları
    │   │   └── auth.js                # Auth yardımcıları
    │   └── assets/
    └── index.html
```

## 🚀 Dağıtım Hazırlığı (Production)

- [ ] `.env` dosyasının güvenli şekilde ayarlanması
- [ ] JWT_SECRET güvenli bir değer olmalı
- [ ] Veritabanı yedeği alınmalı
- [ ] CORS ayarları doğru ayarlanmalı
- [ ] SSL/TLS sertifikası kurulmalı (HTTPS)
- [ ] Dosya yüklemesi limitleri ayarlanmalı
- [ ] Rate limiting aktif olmalı
