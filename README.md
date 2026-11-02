# Beşiktaş Sokak – Akıllı İhbar Portalı

Vatandaşların sokaktaki sorunları (bozuk asfalt, kırık kaldırım, kaçak çöp, bozuk sokak lambası, bakımsız park) haritadan işaretleyip fotoğrafla bildirdiği; belediyenin de bu ihbarları ilgili müdürlüğe yönlendirip çözüm sürecini uçtan uca takip ettiği bir web portalı.

İhbarın açılmasından vatandaşın "çözüldü" onayına kadar tüm döngü tek bir yerde yönetilir.

## Özellikler

- **Harita tabanlı ihbar:** Leaflet + OpenStreetMap üzerinde konum seçme, durum renkli pinler, ısı haritası
- **Fotoğraflı ihbar:** Fotoğraf tarayıcıda küçültülüp yüklenir, öncesi/sonrası fotoğrafı gösterilir
- **Otomatik yönlendirme:** Kategoriye göre müdürlük ve SLA süresi atanır (örn. Kaçak Çöp → Temizlik İşleri, 12 saat)
- **Öncelik skoru:** Destekçi sayısı, SLA'ya yaklaşma ve kategori ağırlığına göre
- **Mükerrer ihbar tespiti:** Aynı kategoride yaklaşık 50 m ve 48 saat içindeki ihbara destek verme önerisi
- **Çözüm onayı:** Vatandaş çözümü onaylar (+50 puan) ya da ihbarı yeniden açar
- **Vatandaş katılımı:** Oy, yorum, takip, puan, liderlik tablosu, mahalle aboneliği ve bildirimler
- **Amir komuta paneli:** KPI'lar, müdürlük/mahalle dağılımı, 7 günlük trend, ortalama çözüm süresi, SLA uyumu, CSV dışa aktarma
- **Canlı güncelleme:** Supabase Realtime ile sayfa yenilemeden güncellenir
- **Çevrimdışı mod:** İnternet yokken ihbar cihazda saklanır, bağlantı gelince eşitlenir
- **Erişilebilirlik ve dil:** Türkçe, İngilizce, Arapça (sağdan sola yazım dahil); yüksek kontrast ve büyük yazı

## Roller

| Rol | `profiles.role` | Yetkiler |
|---|---|---|
| Vatandaş | `citizen` | İhbar açar, oy verir, yorum yazar, çözümü onaylar |
| Saha | `field` | Ekip yönlendirir, yanıt yazar, çözüm fotoğrafı ekler |
| Amir | `supervisor` | Komuta paneli, moderasyon, CSV çıktısı |

## Teknolojiler

| Katman | Teknoloji |
|---|---|
| Arayüz | Next.js 14, React 18, TypeScript |
| Stil | Tailwind CSS |
| Harita | Leaflet, OpenStreetMap |
| Arka uç | Supabase (PostgreSQL, Auth, Storage, Realtime) |
| Grafikler | Recharts |
| Animasyon ve ikonlar | Framer Motion, Lucide |

Ayrı bir sunucu kodu yoktur: arayüz doğrudan Supabase'e bağlanır. Yetkiler satır düzeyi güvenlik politikaları (RLS) ile, puan/bildirim/sayaç gibi kurallar SQL tetikleyicileri ile veritabanında uygulanır.

## Proje yapısı

```
app/            Sayfa ve düzen (page.tsx ana uygulama)
components/     Harita, ihbar formu, ihbar detayı, komuta paneli, giriş ekranı vb.
lib/            Veri tipleri, öncelik skoru, istatistikler, çoklu dil, Supabase istemcisi
supabase/       migration.sql (tablolar, politikalar, tetikleyiciler)
```

## Kurulum

1. Bir [Supabase](https://supabase.com) projesi oluşturun.
2. Proje kök dizininde `.env.local` dosyası oluşturun:

   ```
   NEXT_PUBLIC_SUPABASE_URL=...
   NEXT_PUBLIC_SUPABASE_ANON_KEY=...
   ```

3. Supabase → SQL Editor'de `supabase/migration.sql` dosyasını **bir kez** çalıştırın (yalnızca ekleme yapar).
4. Bağımlılıkları kurup geliştirme sunucusunu başlatın:

   ```bash
   npm install
   npm run dev
   ```

Uygulama `http://localhost:3000` adresinde açılır. Fotoğraflar için Supabase Storage'da `report-photos` adında bir bucket gerekir.

## Mevcut durum ve bilinen sınırlar

Bu proje bir prototiptir. Canlıya çıkmadan önce şunlar ele alınmalıdır:

- Kategori önerisi anahtar kelime eşleştirmesidir; fotoğraf analizi simülasyondur (güven oranı gerçek bir model çıktısı değildir).
- Ekip aracının haritadaki hareketi gerçek GPS verisi değil, canlandırmadır.
- Gizli (`hidden`) ihbarlar şu an istemcide filtrelenir. Sıkı güvenlik için `reports` select politikasına `hidden = false or bs_is_sup()` eklenmelidir.
- Mahalle sınırları yaklaşıktır; örnek ihbarlar test verisidir.
- Kişisel veri (KVKK) açısından inceleme yapılmalıdır.

## Benzer projelerden farkı

[FixMyStreet](https://www.fixmystreet.com/) gibi platformlar vatandaşın sorunu işaretleyip ilgili belediyeye iletmesine odaklanır. Beşiktaş Sokak ise belediyenin kendi sistemi olarak ihbarın müdürlüğe atanmasını, SLA takibini, saha ekibinin çalışmasını, çözüm fotoğrafını ve vatandaş onayını tek döngüde yönetir.
