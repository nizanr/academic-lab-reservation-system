# 📚 Akademik Birebir Danışmanlık ve Lab Cihazı Rezerve Sistemi

**Proje Adı:** Academic Lab Reservation System  
**Açıklama:** Öğrencilerin akademisyenlerden çakışmasız randevu almasını ve 3D yazıcı/GPU sunucusu gibi lab cihazlarını rezerve etmesini sağlayan web uygulaması.

## 🎯 Proje Özellikleri

### Temel Özellikler
- ✅ **Çakışmasız Randevu Sistemi** - Aynı akademisyen, aynı saat için çift randevu önlenir
- ✅ **Lab Cihazı Rezervasyonu** - 3D yazıcı, GPU sunucusu vb. cihazları saatlik rezerve etme
- ✅ **Onay/Red Mekanizması** - Akademisyen talepte bulunmuş öğrenci başvurularını yönetebilir
- ✅ **Rol Tabanlı Yetkilendirme (RBAC)** - Öğrenci, Akademisyen, Yönetici rolleri
- ✅ **Raporlama & Grafikler** - Cihaz kullanım oranları ve randevu istatistikleri
- ✅ **Responsive Design** - Mobil, tablet ve masaüstü cihazlarda çalışır

## 🛠️ Teknik Stack

| Bileşen | Teknoloji | Versiyon |
|---------|-----------|---------|
| **Frontend** | React.js + Vite | ^18.0 |
| **Styling** | Tailwind CSS | ^3.0 |
| **Backend** | Node.js + Express.js | ^18.0 |
| **Veritabanı** | SQLite | latest |
| **Kimlik Doğrulama** | JWT + bcryptjs | - |
| **Grafikler** | Chart.js + React-ChartJS-2 | ^4.0 |
| **HTTP Client** | Axios | ^1.0 |
| **Routing** | React Router | ^6.0 |

## 📦 Kurulum Adımları

### Ön Gereksinimler
- Node.js (v16 veya üzeri)
- npm veya yarn
- Git

### 1️⃣ Backend Kurulumu

```bash
# Repository'yi klonla
git clone https://github.com/nizanr/academic-lab-reservation-system.git
cd academic-lab-reservation-system

# Bağımlılıkları yükle
npm install

# .env dosyasını oluştur
cp .env.example .env

# Server'ı başlat
npm run dev
```

**Sunucu Adresi:** `http://localhost:5000`

### 2️⃣ Frontend Kurulumu (Yeni Terminal Penceresi)

```bash
# Frontend dizinine git
cd client

# Bağımlılıkları yükle
npm install

# Development sunucusunu başlat
npm run dev
```

**Uygulama Adresi:** `http://localhost:5173`

## 👤 Test Kullanıcıları

Sistem otomatik olarak aşağıdaki test kullanıcılarıyla veritabanını başlatır:

### 1. Öğrenci Hesabı
```
📧 Email: student@example.com
🔐 Şifre: password123
🎓 Rol: STUDENT
```

### 2. Akademisyen Hesabı
```
📧 Email: academic@example.com
🔐 Şifre: password123
👨‍🏫 Rol: ACADEMIC
```

### 3. Yönetici Hesabı
```
📧 Email: admin@example.com
🔐 Şifre: password123
⚙️ Rol: SUPER_ADMIN
```

## 🎬 Kullanım Rehberi

### Öğrenci Akışı (Student)
1. Login sayfasından student hesabıyla giriş yapın
2. **Randevu Talepleri** sekmesinden:
   - Akademisyen seçin
   - Tarih ve saat aralığı belirleyin
   - Danışmak istediğiniz konuyu yazın
   - "Talep Gönder" butonuna tıklayın
3. **Cihaz Rezervasyonları** sekmesinden:
   - Cihaz seçin
   - Rezervasyon tarihi ve saatini belirleyin
   - Cihazı kullanma amacını yazın
   - "Talep Gönder" butonuna tıklayın

### Akademisyen Akışı (Academic)
1. Login sayfasından academic hesabıyla giriş yapın
2. **Randevu Talepleri** sekmesinde:
   - Beklemede olan randevu taleplerini görebilirsiniz
   - Her talep için "✅ Onayla" veya "❌ Reddet" butonuna tıklayın
3. **Cihaz Talepleri** sekmesinde:
   - Beklemede olan cihaz rezervasyon taleplerini görebilirsiniz
4. **İstatistikler** sekmesinde:
   - Randevu ve cihaz kullanım istatistiklerini görebilirsiniz

### Yönetici Akışı (Admin)
- Tüm akademisyen yetkilerine sahip
- Ek olarak tüm kullanıcı ve sistem yönetimi yapabilir

## 📊 API Endpoint'leri

### Kimlik Doğrulama
```
POST   /api/auth/register        # Yeni kullanıcı kaydı
POST   /api/auth/login           # Giriş
GET    /api/auth/profile         # Profil bilgisi (Korumalı)
PUT    /api/auth/profile         # Profil güncelle (Korumalı)
```

### Randevu Yönetimi
```
POST   /api/reservations/appointments/request           # Randevu talep et
GET    /api/reservations/appointments                   # Kendi randevularım
PUT    /api/reservations/appointments/:id/approve       # Randevu onayla
PUT    /api/reservations/appointments/:id/reject        # Randevu reddet
```

### Cihaz Rezervasyonu
```
POST   /api/reservations/reservations/request           # Cihaz talep et
GET    /api/reservations/reservations                   # Kendi rezervasyonlarım
GET    /api/reservations/reservations/pending           # Beklemede (Admin)
PUT    /api/reservations/reservations/:id/approve       # Cihaz onayı
PUT    /api/reservations/reservations/:id/reject        # Cihaz red
```

### Kullanılabilir Kaynaklar
```
GET    /api/reservations/academics/available           # Uygun akademisyenler
GET    /api/reservations/devices/available             # Uygun cihazlar
```

### İstatistikler
```
GET    /api/reservations/statistics                    # Kullanıcı istatistikleri
GET    /api/reservations/devices/usage/stats           # Cihaz istatistikleri
```

## 🔐 Güvenlik Özellikleri

- ✅ **JWT Authentication** - Stateless token-based auth
- ✅ **Password Hashing** - bcryptjs ile şifreler hashlenir
- ✅ **CORS Protection** - Cross-origin istekleri kontrol altında
- ✅ **Role-Based Access Control** - Kullanıcı rolüne göre erişim kontrolü
- ✅ **SQL Injection Prevention** - Parametreli sorgular kullanılır
- ✅ **Database Constraints** - UNIQUE constraint'lerle çakışma önlenir

## 📁 Proje Yapısı

```
academic-lab-reservation-system/
├── server.js                          # Ana sunucu girdisi
├── package.json                       # Node.js bağımlılıkları
├── .env.example                       # Çevre değişkenleri template
├── .gitignore                         # Git ignore kuralları
├── README.md                          # Bu dosya
├── PROBLEM.md                         # Teknik tasarım belgesi
├── AI_LOG.md                          # Değişiklik kaydı
│
├── config/
│   └── db.js                          # SQLite veritabanı kurulumu
│
├── middleware/
│   └── authMiddleware.js              # JWT ve RBAC kontrol
│
├── controllers/
│   ├── authController.js              # Kimlik doğrulama işlemleri
│   └── reservationController.js       # Rezervasyon işlemleri
│
├── routes/
│   ├── authRoutes.js                  # Auth endpoint'leri
│   └── reservationRoutes.js           # Rezervasyon endpoint'leri
│
├── data/
│   └── app.db                         # SQLite veritabanı (otomatik oluşturulur)
│
└── client/                            # React/Vite Frontend
    ├── package.json
    ├── vite.config.js
    ├── tailwind.config.js
    ├── postcss.config.js
    ├── index.html
    │
    └── src/
        ├── main.jsx                   # React giriş noktası
        ├── App.jsx                    # Routing ve layout
        ├── index.css                  # Global stiller
        │
        ├── contexts/
        │   └── AuthContext.jsx        # Auth state yönetimi
        │
        ├── pages/
        │   ├── Login.jsx              # Login sayfası
        │   ├── Register.jsx           # Kayıt sayfası
        │   ├── StudentDashboard.jsx   # Öğrenci paneli
        │   └── AcademicDashboard.jsx  # Akademisyen paneli
        │
        ├── components/
        │   └── Navbar.jsx             # Navigasyon çubuğu
        │
        └── utils/
            └── api.js                 # API istek yardımcıları
```

## 🚀 Deployment (Dağıtım)

### Vercel'e (Frontend)
```bash
cd client
npm run build
# Derlenen `dist` klasörünü Vercel'e deploy edin
```

### Heroku'ya (Backend)
```bash
# Heroku CLI yükleyin ve login yapın
heroku login

# Yeni uygulamayı oluşturun
heroku create your-app-name

# Environment değişkenlerini ayarlayın
heroku config:set JWT_SECRET=your-secret-key
heroku config:set DB_PATH=/tmp/app.db

# Deploy edin
git push heroku main
```

## 📝 Çevre Değişkenleri (.env)

```env
# Server Konfigürasyonu
PORT=5000
NODE_ENV=development

# JWT Konfigürasyonu
JWT_SECRET=your_super_secret_jwt_key_change_in_production
JWT_EXPIRE=7d

# Veritabanı
DB_PATH=./data/app.db

# CORS
CORS_ORIGIN=http://localhost:5173
```

## 🐛 Yaygın Sorunlar ve Çözümler

### Problem: "ENOENT: no such file or directory, open './data/app.db'"
**Çözüm:** Backend sunucusunun `data` dizinini oluşturmak için izni olması gerekir.
```bash
mkdir -p ./data
```

### Problem: CORS Hatası
**Çözüm:** `.env` dosyasında `CORS_ORIGIN` değerini kontrol edin. Frontend'in adresi olmalıdır.
```env
CORS_ORIGIN=http://localhost:5173
```

### Problem: "Port 5000 already in use"
**Çözüm:** `.env` dosyasında PORT değerini değiştirin veya diğer uygulamayı kapatın.
```bash
# Port 3000'da çalıştır
PORT=3000 npm run dev
```

## 📞 İletişim

- **Kurucular:** Zeynep Ulusoy, Nisa Nur Çakır
- **Repository:** https://github.com/nizanr/academic-lab-reservation-system

## 📄 Lisans

MIT Lisansı altında yayımlanmıştır.

---

**Sürüm:** 1.0.0  
**Son Güncelleme:** 2026-10-07  
**Durum:** ✅ Production-Ready
