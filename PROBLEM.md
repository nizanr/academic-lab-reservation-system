# Problem Tanımı

## Mevcut Durum
Akademisyenlerle birebir görüşme ve laboratuvar cihazı (3D yazıcı, GPU sunucusu, VR gözlük) kullanımı e-posta, WhatsApp ve kâğıt çizelgelerle yönetiliyor. Aynı saate birden fazla kişi randevu alabiliyor, cihazın kimde olduğu bilinmiyor ve kullanım verisi tutulmuyor.

## Görüşme Notları
1. **Öğrenci:** "Hocanın uygun saatini bilmeden mail atıyorum; cevap gelene kadar günler geçiyor. Talebimin onaylanıp onaylanmadığını görmek istiyorum."
2. **Akademisyen:** "Aynı saate iki öğrenci geliyor. Talepleri tek ekranda görüp tek tıkla onaylamak/reddetmek istiyorum."
3. **Lab sorumlusu:** "GPU sunucusu ve 3D yazıcı çakışıyor, hangi cihazın ne kadar kullanıldığını raporlayamıyoruz; yeni cihaz ve yetki yönetimi de elle yapılıyor."

## Çözümler
- Merkezi bir web platformu: öğrenciler randevu/cihaz talebi oluşturur.
- Sunucu tarafında çakışma denetimi: aktif (bekleyen/onaylı) bir rezervasyonla örtüşen talep reddedilir (HTTP 409).
- Akademisyen paneli ile onay/red; öğrenci durumu anlık görür.
- Grafiklerle cihaz kullanım oranı ve randevu istatistikleri.

## Seçilen Teknik Özellikler
- React + Vite arayüz; Node.js/Express MVC arka uç; SQLite (better-sqlite3).
- JWT + bcryptjs ile kimlik doğrulama; RBAC (STUDENT, ACADEMIC, SUPER_ADMIN).
- Atomik (transaction içinde) çakışma kontrolü ve ekleme.
- Polling ile dinamik güncelleme (5 sn).
- Chart.js ile raporlama.
