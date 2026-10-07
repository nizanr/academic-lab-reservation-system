# academic-lab-reservation-system

# Akademik Birebir Danışmanlık ve Lab Cihazı Rezerve Sistemi

## Hakkında
Bu proje, üniversite bünyesindeki öğrencilerin akademisyenlerden birebir danışmanlık randevusu almasını ve laboratuvarda bulunan özel cihazları (3D Yazıcı, VR Gözlük, GPU Sunucuları vb.) çakışmasız bir şekilde saatlik rezerve edebilmesini sağlayan interaktif bir web uygulamasıdır.

## Teknik Özellikler & Mimari
- **Rol Tabanlı Yetkilendirme (RBAC):** Öğrenci, Akademisyen/Lab Görevlisi, Süper Admin.
- **Dinamik Takvim & Çakışma Önleme:** Aynı zaman dilimine çift randevu oluşmasını engelleyen veritabanı kontrolü.
- **Onay / Red Mekanizması:** Akademisyen ve lab yöneticileri için talep yönetim paneli.

## Canlı URL
> https://CANLI-URL-BURAYA (yayınlandığında güncellenecek)

## Kurulum
```bash
git clone https://github.com/nizanr/academic-lab-reservation-system.git
cd academic-lab-reservation-system
npm install
cp .env.example .env   # PORT, JWT_SECRET, DB_PATH değerlerini düzenleyin
```
**`JWT_SECRET` zorunludur**; tanımlı değilse sunucu hata vererek başlamaz. Güvenli bir değer üretmek için:
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```
Çıktıyı `.env` dosyasındaki `JWT_SECRET=` satırına yazın.
SQLite veritabanı ve örnek veriler ilk çalıştırmada otomatik oluşur.

## Çalıştırma
- Not: Aşağıdaki komutlar için `JWT_SECRET` içeren bir `.env` dosyası gereklidir.
- Geliştirme (sunucu + istemci birlikte): `npm run dev` → arayüz http://localhost:5173, API http://localhost:3001
- Üretim: `npm start` (istemciyi derler ve Express ile http://localhost:3001 üzerinden sunar)

## Test Kullanıcıları (seed)
| Rol | E-posta | Şifre |
|---|---|---|
| SUPER_ADMIN | admin@uni.edu | Admin123! |
| ACADEMIC | academic@uni.edu | Academic123! |
| ACADEMIC | academic2@uni.edu | Academic123! |
| STUDENT | student@uni.edu | Student123! |

Öğrenciler `/register` sayfasından kayıt olabilir (rol her zaman STUDENT).

## API Özeti
- `POST /api/auth/register`, `POST /api/auth/login`
- `POST /api/reservations` (STUDENT; çakışma varsa 409), `GET /api/reservations/mine`
- `GET /api/reservations/incoming`, `PATCH /api/reservations/:id/status` (ACADEMIC/SUPER_ADMIN)
- `GET /api/reservations/stats/devices`, `GET /api/reservations/stats/status`
- `/api/reservations/admin/*` (SUPER_ADMIN: rol ve cihaz yönetimi)
- Token yoksa 401, rol yetersizse 403 döner. Arayüz verileri 5 sn'lik polling ile yeniler.

## Grup Üyeleri ve İş Bölümü
- **[Zeynep Ulusoy]:** Backend & Veritabanı Mimarısı, Rol Yetkilendirme
- **[Nisa Nur Çakır]:** Frontend Arayüz Tasarımı, Test & Raporlama

## Proje Durumu
- [x] Repo oluşturuldu ve mimari planlandı.
- [ ] Veritabanı şeması ve yetkilendirme (RBAC) kurulumu.
- [ ] Kullanıcı ve Admin panellerinin geliştirilmesi.
- [ ] Test senaryolarının (100 Hata) yürütülmesi ve canlı demo.
