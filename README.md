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
cp .env.example .env   # JWT_SECRET değerini güçlü, rastgele bir değerle değiştirin
```
SQLite veritabanı ilk çalıştırmada otomatik oluşur. Demo kullanıcıları ve cihazları yalnızca `.env` dosyasında `SEED_DEMO_DATA=true` ayarlandığında oluşturulur; seed yalnızca kullanıcı tablosu boşsa çalışır. Üretimde bunu kapalı tutun ve ilk `SUPER_ADMIN` hesabını güvenli, tek seferlik bir veritabanı bootstrap işlemiyle oluşturun.

## Çalıştırma
- Geliştirme (sunucu + istemci birlikte): `npm run dev` → arayüz http://localhost:5173, API http://localhost:3001
- Üretim: `npm start` (istemciyi derler ve Express ile http://localhost:3001 üzerinden sunar)

## Demo Kullanıcıları (aşağıdaki tablo yalnızca `.env` içinde `SEED_DEMO_DATA=true` ayarlıysa geçerlidir)
| Rol | E-posta | Şifre |
|---|---|---|
| SUPER_ADMIN | admin@uni.edu | Admin123! |
| ACADEMIC | academic@uni.edu | Academic123! |
| ACADEMIC | academic2@uni.edu | Academic123! |
| STUDENT | student@uni.edu | Student123! |

Öğrenciler `/register` sayfasından ad, e-posta, 5–20 rakamlık öğrenci numarası ve 10–128 karakterlik parolayla kayıt olabilir (rol her zaman STUDENT). Önceden oluşturulmuş hesaplar korunur.

Veritabanı migration sürümleri `schema_migrations` tablosunda izlenir. Sunucu açılışında eksik migration transaction içinde uygulanır; mevcut veritabanını silmeniz gerekmez. `/api/auth/logout` hesabın tüm token'larını geçersiz kılar. Pasif hesaplar giriş ve korumalı uçlara erişemez. Beş başarısız giriş denemesi sonrası 15 dakikalık pencere dolana kadar geçici engel uygulanır (tek süreçlik demo koruması).

Son teknoloji kararı: React + kendi CSS'i, Node.js/Express ve SQLite. Belgelerle uygulama farkları ve kalan işler: [uygulama durumu](docs/implementation-status.md).

## API Özeti
- `POST /api/auth/register`, `POST /api/auth/login`
- `POST /api/reservations` (STUDENT; çakışma varsa 409), `GET /api/reservations/mine`
- `GET /api/reservations/incoming`, `PATCH /api/reservations/:id/status` (ACADEMIC/SUPER_ADMIN)
- `GET /api/reservations/stats/devices`, `GET /api/reservations/stats/status`
- `/api/reservations/admin/*` (SUPER_ADMIN: rol ve cihaz yönetimi)
- Token yoksa 401, rol yetersizse 403 döner. Arayüz verileri türüne göre 5 sn'de (rezervasyonlar ve dolu aralıklar), 10 sn'de (istatistikler), 15 sn'de (kullanıcılar) veya 30 sn'de (kaynaklar) yeniler.

## Grup Üyeleri ve İş Bölümü
- **[Zeynep Ulusoy]:** Backend & Veritabanı Mimarısı, Rol Yetkilendirme
- **[Nisa Nur Çakır]:** Frontend Arayüz Tasarımı, Test & Raporlama

## Proje Durumu
- [x] Repo oluşturuldu ve mimari planlandı.
- [ ] Veritabanı şeması ve yetkilendirme (RBAC) kurulumu.
- [ ] Kullanıcı ve Admin panellerinin geliştirilmesi.
- [ ] Test senaryolarının (100 Hata) yürütülmesi ve canlı demo.

## İlk iyileştirme aşaması
- Kaynak ve öğrenci çakışması aynı BEGIN IMMEDIATE transaction içinde denetlenir.
- Akademisyenler yalnızca kendi randevuları ve device_managers ile atanmış cihaz taleplerini görür ve değerlendirir.
- Admin panelindeki Cihaz Sorumlusu Ata formu mevcut cihazlara sorumlu atar. Var olan cihazlara otomatik sorumlu atanmaz. Yeni demo verisinde cihazlar ilk akademisyene atanır.
- Her kimlik doğrulanmış istekte güncel kullanıcı rolü veritabanından alınır.
- Test: `npm test`; üretim derlemesi: `npm run build`.

Bu aşama tüm proje gereksinimlerini tamamlamaz. Eğitim, uygunluk, süre dolumu, bildirim, asistan rolü, son sorumlu koruması ve personel istatistiklerinin kaynak bazında sınırlandırılması sonraki aşamalardadır.
