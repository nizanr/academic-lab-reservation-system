# Tasarım ve uygulama karşılaştırması

12 Ekim 2026. Son kabul edilen teknoloji React, kendi CSS dosyaları, Node.js/Express ve SQLite'tır. Önceki belge paketindeki Flask, Jinja, SQLAlchemy ve Bootstrap teknik önerisi yerine bu karar geçerlidir. Bu güncelleme çalışan repository için uygulama kaydıdır; eski Word dosyasının güncellendiği anlamına gelmez.

## Tamamlanan temel
- İlk PR: öğrenci ve kaynak çakışması için atomik transaction; cihaz sorumlusu ataması; kayıt sahipliği ve güncel rol denetimi.
- Bu aşama: sürümlü ve tekrarlanabilir eklemeli migration; öğrenci numarası ve benzersizliği; yeni kayıtta 10–128 karakter parola; e-posta normalizasyonu; pasif kullanıcı denetimi; çıkışta hesabın tüm token'larını geçersiz kılma; 15 dakikada beş başarısız giriş sonrası geçici engel.
- Arayüz açılışta ve 15 saniyede bir /auth/me ile rolü doğrular; öğrenci formu numara ve yeni parola sınırını içerir.
- Mevcut hesap ve parolalar korunur. Önceden öğrenci numarası olmayan hesaplar giriş yapabilir; yeni kayıtlar numara girmek zorundadır. Numara gerçek okul kaydıyla doğrulanmaz.

## Teknik uygulama kararları
Bearer JWT başlıkla gönderilir; cookie tabanlı oturum kullanılmadığından eski Flask form-CSRF yaklaşımı doğrudan taşınmaz. JWT mevcut uygulamayla uyumlu biçimde localStorage'da tutulur; üretime geçişte HttpOnly cookie ve CSRF tasarımı ayrı değerlendirilecek. Çıkış isteği ağ nedeniyle sunucuya ulaşmazsa yerel oturum temizlenir, token sunucuda süresi dolana kadar geçerli kalabilir. Rate limiter tek süreç belleğindedir; yeniden başlatmada sıfırlanır. Yeni parolalar SHA-256 ile ön özetlenip bcrypt ile saklanır; eski bcrypt kayıtları doğrulanabilir.

## Sonraki iş paketleri
WP04: haftalık uygunluk, kapalı aralıklar, sabit danışmanlık süresi, 15 dakika adımı, onay/ret gerekçesi, iptal sınırı ve süre dolumu. WP05: cihaz eğitim yetkisi, bakım ve süre sınırları. WP06: bildirim, işlem izi, asistan rolü, kullanıcı pasifleştirme arayüzü, son sorumlu ve son admin koruması. İstatistiklerin personelin kendi kaynaklarıyla sınırlandırılması da tamamlanmalı.

Bu aşama tüm P0 gereksinimlerinin tamamlandığı iddiasını taşımaz. Yeni auth testleri gerçek entegrasyon testleridir; belgelerdeki 100 test senaryosunun tamamı çalıştırılmış değildir. Ana dala birleştirme kullanıcı incelemesinden sonra yapılır.
