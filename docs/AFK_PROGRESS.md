# AFK / Implementation Review Özeti

> Güncelleme: **15 Mayıs 2026** — Statik kod incelemesi + düzeltmeler + `npm run lint` / `npm run build` / `npx prisma validate`  
> Veritabanı: `npm run db:migrate` ve `npm run db:seed` bu ortamda **P1000 (kimlik doğrulama)** ile çalıştırılamadı.

---

## Çalıştırılan komutlar (bu review oturumunda)

| Komut | Sonuç |
|--------|--------|
| `npm run lint` | Başarılı, uyarı/yok |
| `npm run build` | Başarılı |
| `npx prisma validate` | Başarılı |
| `npm run db:migrate` | **Başarısız** — `P1000: Authentication failed` |
| `npm run db:seed` | **Başarısız** — aynı DB bağlantı hatası |

---

## Gerçekten “çalışma zamanı” test edildi mi?

Hayır: **entegrasyon / E2E test veya canlı PostgreSQL üzerinde çift onay senaryosu çalıştırılmadı** (DB erişimi yok). Aşağıdakiler **kod akışı + Prisma şema kısıtları** ile doğrulandı ve gerekli yerlerde kod düzeltildi.

---

## Koddan doğrulananlar (checklist)

### 1) `grantCourseAccess` iki kez

- Transaction içinde `order.updateMany({ id, status: { not: PAID } })` → ikinci eşzamanlı çağrıda `count === 0` iken **CourseAccess / snapshot / wallet tx / audit yazılmaz** (kod yolu `return`).
- `CourseAccess.orderId`, `OrderCommissionSnapshot.orderId` şemada **`@unique`** — yarış durumunda DB ikinci insert’i reddeder.
- **Yeni:** `OrderStatus.PAID` ama `CourseAccess` yoksa artık **sessiz çıkış yok** → `ServiceError` (veri tutarsızlığı görünür hale getirildi).
- **`WALLET_CREDITED`:** Yalnızca başarılı “ilk” grant dalında audit çağrılıyor; erken `return` ile ikinci kez yazılmıyor.

### 2) Payment approve

- `PENDING` ve `UNDER_REVIEW` → `grant` + ardından `APPROVED` (sıra düzeltildi).
- `APPROVED` / `REJECTED` tekrar onayda engelleniyor.
- **Düzeltme:** Eskiden önce `APPROVED` yazılıp sonra `grant` çağrılıyordu; `grant` hata verirse ödeme “onaylı” kalıyordu. Artık önce **`grant`**, başarılıysa **`payment → APPROVED`**.

### 3) Receipt upload

- `presignReceiptUpload`: `findFirst({ id: orderId, studentId })` → **başkasının siparişine presign yok** (404).
- **Yeni:** Dekont görüntüleme: **`/api/storage/receipt/[paymentId]`** → 302 imzalı URL; **storageKey URL’de taşınmaz**.
- Öğrenci: sipariş sahibi; admin: `payments.approve`. `presign-download?type=receipt&paymentId=` da aynı servis mantığını kullanır.

### 4) R2 upload

- Presign öncesi: header’daki `Content-Type` + `ContentLength` ile **sunucu tarafı limit/MIME listesi** (`validatePolicy`).
- **Yeni:** `confirm*` (thumbnail/document/video) ve dekont `setReceipt` öncesi **`HeadObject`** ile **gerçek boyut** ve R2’de kayıtlı Content-Type tekrar politikaya bağlanıyor (magic-byte yok — aşağıda risk).
- Onaylanmamış key: DB’ye yalnızca `setReceipt` / `confirm*` başarılı olunca yazılıyor; presign tek başına DB yazmıyor.
- **Public leak:** `/courses/[slug]` müfredatta `storageKey` / `meetingUrl` yok (yalnızca `getPublishedBySlugPublic`).

### 5) Live sessions

- Public sayfa: canlı URL/şifre yok (yukarıda).
- `LiveSessionJoinCard`: `upcoming` / `ended` durumunda join **butonu render edilmiyor**; yalnızca `open`’da link.
- `/learn/live-sessions`: sorgu **aktif CourseAccess** ile sınırlı.
- ICS: `hasAccess` yoksa **403**.

### 6) `/learn/courses/[slug]`

- Erişim: `learnService.getCourseForLearner` → yoksa `FORBIDDEN` → `notFound()`.
- **Yeni:** `LessonSignedMediaActions` — video/doküman için `presign-download` (öğrenci CourseAccess; admin/staff için içerik tarafında bypass ayrı maddede).

### 7) Security ek notları

- Başka eğitmenin `courseId` / `lessonId` ile presign: **FORBIDDEN**; **ADMIN/SUPER_ADMIN** `canManageCourseContent` ile **atlayabilir** (moderasyon / destek).
- STUDENT: `presign-upload` receipt dışı tiplerde servis **FORBIDDEN** döner.
- Video/doküman **signed GET**: **`ADMIN` / `SUPER_ADMIN`** CourseAccess olmadan da alabilir; öğrenci için CourseAccess şart.

### 8) UX

- Checkout: dekont sonrası **“Yüklediğim dekontu görüntüle”** (`paymentId` ile).
- `R2UploadButton`: 503/401/403 için **Türkçe** mesajlar; PUT hatası açıklaması.
- Admin ödemeler: kısa açıklama metni + boş durum metni.

---

## Bu review’da düzeltilen / eklenen dosyalar (özet)

| Konu | Dosya(lar) |
|------|------------|
| Ödeme onay sırası | `src/services/payment.service.ts` |
| PAID ama access yok | `src/services/grant-course-access.service.ts` |
| R2 HeadObject doğrulama | `src/lib/storage/r2-head.ts`, `upload.service.ts` |
| Dekont: paymentId, anahtar yok | `src/app/api/storage/receipt/[paymentId]/route.ts`, `presign-download`, admin/checkout UI |
| Admin/instructor presign & confirm | `upload.service.ts`, `presign-upload`, `upload.actions.ts` |
| Öğrenme video/doküman | `src/components/learn/lesson-signed-media-actions.tsx`, learn course page |
| Mesajlar / checkout | `checkout-receipt-form.tsx`, `r2-upload-button.tsx`, `admin/payments/page.tsx` |

---

## Kalan riskler (bilinçli)

1. **MIME “anti-spoof”**: PUT sırasında gelen Content-Type R2’ye yazılır; HeadObject aynı değeri doğrular. **Gerçek dosya imzası (magic bytes)** için ayrı iş (range GET, Lambda, vb.) yok — TODO.
2. **`payment.approve` + `grant`**: Tek bir Prisma `$transaction` içinde değiller; çok uç durumda `grant` sonrası `payment` update hatası teorik olarak mümkün (retry ile telafi: grant idempotent).
3. **Placeholder dekont (R2 kapalı)**: Yerel modda HeadObject atlanır; sahaya yakın güven için R2 zorunlu tutulmalı.
4. **DB migration**: Enum / şema değişikliği bu committe yok; review öncesi migration durumu ortamınıza bağlı.

---

## Sonraki önerilen adım

1. Geçerli `DATABASE_URL` ile `db:migrate` + `db:seed` + manuel test: çift admin onay, çapraz `orderId` presign, dekont 302.  
2. **P3**: Video oynatıcı kabuğu, ilerleme, magic-byte veya içerik tarama pipeline’ı için net TODO/Issue.  
3. İsteğe bağlı: `payment.approve` için tek transaction (veya outbox pattern) ile son yüzde tutarlılık.
