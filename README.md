# Rusça Sözlüğüm (Sürüm 1)

Yazdığın Rusça metinlerdeki her kelimeyi sözlük haline (lemma) indirip kişisel sözlüğüne ekleyen, tamamen çevrimdışı çalışan bir uygulama (PWA). Hedef: 10.000 aktif kelime.

- Windows (Chrome/Edge) ve Android (Chrome) üzerinde uygulama olarak yüklenir.
- İlk açılıştan sonra internet gerekmez: kod ve morfoloji sözlüğü service worker ile önbelleğe alınır.
- Sunucu ve hesap yok. Bütün veriler cihazdaki IndexedDB'de durur. İki cihaz arasında JSON yedeğiyle taşınır.

## Telefona ve bilgisayara yükleme

Uygulamanın adresi GitHub Pages'te: `https://<kullanıcı-adın>.github.io/<repo-adı>/`

**Android (Chrome)**
1. Adresi Chrome'da aç ve sayfa tamamen yüklenene kadar bekle (ilk açılışta ~7 MB indirilir).
2. Sağ üstteki ⋮ menüsü → **Uygulamayı yükle** (bazı sürümlerde **Ana ekrana ekle**).
3. Ana ekrandaki «Sözlüğüm» simgesiyle aç. Artık internetsiz de çalışır.

**Windows (Chrome veya Edge)**
1. Adresi aç ve sayfa yüklensin.
2. Adres çubuğunun sağındaki **yükle** simgesine (ekranlı ok) tıkla. Edge'de: ⋯ menüsü → **Uygulamalar** → **Bu siteyi uygulama olarak yükle**.
3. Başlat menüsünden ya da görev çubuğundan aç.

Ayarlar ekranının altında «✓ Çevrimdışı kullanıma hazır» yazıyorsa her şey önbellekte demektir.

**Önemli:** Veriler cihaza özeldir. Telefonda yazdıklarını bilgisayara taşımak için Ayarlar → **Tüm veriyi indir (JSON)**, dosyayı diğer cihaza gönder, orada **Yedeği geri yükle**. Geri yükleme o cihazdaki veriyi tamamen yedektekiyle değiştirir. Düzenli yedek almak, tarayıcı verisi silinirse sözlüğü kaybetmemenin de yolu.

## Kullanım

1. **Yaz:** başlık, tema, metin → **Kaydet ve çözümle**.
2. Metin renklenir:
   - yeşil: sözlüğünde zaten var
   - mavi: yeni kelime (sözlüğe eklenecek)
   - sarı: birden fazla olası lemma (ör. *стали* → стать / сталь). Dokun ve seç. Seçimin sonraki metinlerde hatırlanır. Seçmezsen en olası seçenek kullanılır.
   - kırmızı: morfoloji sözlüğünde yok (yazım hatası olabilir). Dokun: önerilerden birini seç, elle düzelt ya da «yine de ekle».
   - gri: «bu kelimeyi sözlüğe ekleme» dediklerin (ör. kişi adları).
3. Kelimeye dokununca panelde: sözlük hali, tür, bu formun etiketleri (ör. *поступил = поступить, geçmiş zaman, eril, tekil, tamamlanmış görünüş*). Yeni kelimelere isteğe bağlı Türkçe anlam eklenir (birden çok anlam olabilir).
4. **Sözlüğe yaz** → kullanım sayıları, ilk/son kullanım, temalar, formlar ve cümleler kaydedilir.
5. **Sözlük:** arama (kelime, çekimli form, örn. *людей* yazınca *человек* bulunur, ya da Türkçe anlam), türe/temaya/tarihe göre filtre, sıralama. Kelime sayfasında anlamlar, kullandığın formlar ve tüm cümleler (metne bağlantılı).
6. **Özet:** toplam kelime / 10.000, türe ve temaya göre dağılım, son 8 haftada haftalık yeni kelime.
7. **Arşiv:** eski metni aç, düzenle, sil. Düzenleme ve silmede sözlük sayıları yeniden hesaplanır.
8. **Ayarlar:** açık/koyu tema, tema listesini düzenleme, JSON yedek/geri yükleme, CSV dışa aktarma, demo modu.

**Demo modu:** Ayarlar → Demo modunu aç. Ayrı bir veritabanında 4 örnek metin hazırlanır ve «Я родился и вырос в небольшом городе на юге Турции. В итоге я поступил в колледж.» metni çözümlenmiş olarak açılır. Sarı ve kırmızı kelime örneği için Arşiv'deki «Örnek» taslağını aç. Gerçek verine dokunmaz.

## Teknik seçimler

**React + Vite + TypeScript.** Ekranlar arasında çok paylaşılan durum var (çözümleme, seçimler, panel) ve IndexedDB'den canlı sorgular (`dexie-react-hooks`) React ile en az kodla yazılıyor. TypeScript, veri modelini sonraki sürümlerde (çekim tablosu vb.) güvenle genişletmek için. Vite + `vite-plugin-pwa` service worker'ı ve manifest'i hazır üretiyor.

**Morfoloji: [Az.js](https://github.com/deNULL/Az.js) + OpenCorpora sözlüğü.**
- Az.js, pymorphy2'nin JavaScript'e çevrilmiş hali; pymorphy2'nin derlenmiş OpenCorpora sözlüğünü (DAWG) doğrudan tarayıcıda okur. Ayrı bir veri üretme adımı gerekmiyor.
- Boyut: sözlük dosyaları 11 MB (sıkıştırılmış aktarımda ~6,5 MB). İlk açılışta bir kez iner, sonra önbellekten yüklenir.
- Sözlük sürümü: OpenCorpora 0.92, revizyon 394551 (~390.000 lemma, ~5 milyon form).
- Lisans: Az.js MIT; OpenCorpora sözlüğü CC BY-SA 3.0.
- Neden pymorphy3'ün daha yeni (2022) sözlüğü değil: Az.js sözlük anahtarlarını CP1251 kodlamasında bekliyor, pymorphy3 sözlüğü UTF-8. Çevirmek için DAWG'ı yeniden derlemek gerekiyordu; 2016 ile 2022 sürümleri arasındaki fark (~2.700 lemma) Sürüm 1 için buna değmez.

Uygulamanın Az.js üstüne eklediği kurallar (`src/morph/morph.ts`):
- Lemma: fiillerde mastar (ortaç ve zarf-fiiller de mastara gider), isimlerde tekil yalın, sıfatlarda eril tekil yalın. Sıra sayıları (*третьему* → *третий*) kendi sıfat haline iner.
- ё/е farkı tolere edilir (*идет* → *идти*, *елку* → *ёлка*), büyük/küçük harf ve noktalama temizlenir, vurgu işaretleri silinir.
- Kısaltma çözümlemeleri atılır. Kişi adı/soyadı çözümlemeleri sadece kelime büyük harfle yazıldıysa kalır. Yer adları büyük harfle kaydedilir (*Турция*).
- Aynı lemmanın işlev kelimesi türleri tek kelime sayılır (*что* bağlaç da olsa zamir de olsa tek *что*). İki ayrı ana tür ise (*печь* isim / *печь* fiil) iki ayrı kelimedir.
- Sıfat karşılaştırma hallerine zarf adayı eklenir: *лучше* → хороший / хорошо (belirsiz).
- %1'in altındaki çok düşük olasılıklı adaylar (edat/bağlaç/küçük kelimede %10) elenir, böylece *и*, *на*, *было* gibi kelimeler gereksiz yere sarı olmaz. *стали* → сталь (%2) belirsiz kalır.

**Tür grupları:** Fiil (fiil, mastar, ortaç, zarf-fiil), İsim, Sıfat (kısa sıfat ve karşılaştırma dahil), Zarf (yüklem zarfları dahil: *надо, можно*), Zamir (*мой, этот, свой* gibi zamir-sıfatlar dahil), Sayı (sıra sayıları dahil), Edat, Bağlaç, Küçük kelime (parçacık ve ünlem), Diğer.

## Veri modeli

IndexedDB (Dexie), `src/db.ts`:

| Tablo | Alanlar |
| --- | --- |
| `texts` | id, title, theme, body, createdAt, updatedAt, status (`draft`/`committed`), choices (bu metindeki form → seçim) |
| `lemmas` | id = `"lemma\|tür"` (ör. `стать\|verb`), lemma, pos, meanings[], themes[], firstUsed, lastUsed, useCount, custom |
| `usages` | id, lemmaId, textId, form, grammemes[] (OpenCorpora etiketleri), sentence, tokenIndex, theme, date |
| `settings` | themes (tema listesi), formChoices (belirsiz formlar için hatırlanan seçimler) |

Lemma sayaçları (`useCount`, ilk/son kullanım, temalar) her zaman `usages` tablosundan yeniden hesaplanır. Metin düzenlenince eski kullanımları silinip yenileri yazılır, metin silinince kullanımları silinir. Böylece sayılar kaymaz. Kullanımı sıfıra düşen kelime sözlükte sayılmaz ama Türkçe anlamları saklanır; aynı kelimeyi yeniden kullanırsan geri gelir.

**Sonraki sürümler için:** Her kullanımda formun tam OpenCorpora etiketleri saklanıyor ve Az.js aynı paradigmanın bütün formlarını üretebiliyor (`Parse.inflect`). Reverso tarzı çekim tablosu bu iki bilgiden doğrudan çıkar (kullandığın formlar yeşil, diğerleri gri). Görünüş çifti ve vurgu için kaikki.org verisi `lemmas` tablosuna yeni alan olarak eklenebilir. ТРКИ-2 minimumu, 60 gündür kullanılmayanlar, sov/nesov dengesi ve Anki CSV'si mevcut tablolardan sorgu olarak hesaplanabilir.

## Geliştirme

Gerekenler: Node.js 22+.

```bash
npm install
npm run dev        # http://localhost:5173 (Az.js ve sözlükler public/az altına kopyalanır)
npm test           # morfoloji testleri
npm run build      # dist/ klasörüne üretim derlemesi
npm run preview    # derlemeyi yerelde dene (service worker dahil)
```

Morfoloji testleri (`tests/morph.test.ts`): поступил→поступить, людей→человек, лучше→хороший/хорошо (belirsiz), идёт/идет→идти, стали→стать/сталь (belirsiz), sıra sayıları, ё/е, özel isimler, bilinmeyen kelime ve yazım önerisi, cümle ayırıcı.

**Yayın:** `main` dalına her gönderimde `.github/workflows/deploy.yml` testleri çalıştırır, `BASE_PATH=/<repo-adı>/` ile derler ve GitHub Pages'e yayınlar. Repo ayarlarında Settings → Pages → Source: **GitHub Actions** seçili olmalı. Yeni sürüm yayınlanınca uygulama bir sonraki açılışta kendini günceller.

## Klasörler

```
src/morph/     morfoloji (Az.js katmanı, etiketlerin Türkçesi, kelime/cümle ayırıcı)
src/logic/     çözümleme, sözlüğe yazma, yedekleme, demo verisi
src/ui/        ekranlar (Yaz, Sözlük, Özet, Arşiv, Ayarlar) ve kelime paneli
tests/         Vitest testleri
scripts/       Az.js sözlüklerini public/az altına kopyalayan betik
```
