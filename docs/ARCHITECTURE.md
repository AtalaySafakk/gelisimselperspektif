# Psikolog Eğitim Platformu — Sistem Mimarisi (v1.1)

> **Durum:** Adım 1 — Revize edildi, onay bekleniyor  
> **Hedef:** Production-grade, ölçeklenebilir online eğitim platformu  
> **Model:** Single Platform · Multi Instructor *(multi-tenant yok — ileride eklenebilir)*

---

## Revizyon Özeti (v1.0 → v1.1)

| # | Değişiklik |
|---|------------|
| 1 | Multi-tenant kaldırıldı → tek platform, çok eğitmen |
| 2 | Redis / queue / BullMQ MVP dışı |
| 3 | UploadThing → **Cloudflare R2** (S3-compatible) |
| 4 | Auth.js → **Custom JWT auth** (httpOnly cookie + refresh) |
| 5 | VideoProvider pattern **korundu** |
| 6 | LiveSession → `joinAvailableAt` eklendi |
| 7 | Ödeme + `grantCourseAccess()` **korundu** |
| 8 | **Komisyon / payout** modeli eklendi |
| 9 | Analytics sadeleştirildi (3 metrik) |

---

## 1. Executive Summary

Platform; **tek bir marka altında** birden fazla psikologun (INSTRUCTOR) eğitim sattığı, öğrencilerin (STUDENT) satın alıp eriştiği bir B2C eğitim platformudur.

```
Single Platform
  └── Multi Instructor (her biri kendi kursunu yükler, satar)
  └── Admin moderasyon + ödeme onayı + komisyon yönetimi
```

**Multi-tenant (her psikoloğa ayrı subdomain/mini site) MVP kapsamında yok.** İleride ihtiyaç olursa `tenantId` kolonu ve route prefix ile genişletilebilir; şimdilik gereksiz karmaşıklık.

**Temel mimari ilkeler:**

| İlke | Uygulama |
|------|----------|
| Clean Architecture | Domain → Services → Actions → UI |
| Provider Pattern | Video + ödeme sağlayıcıları değiştirilebilir |
| Phase-ready Payments | Manuel (Faz 1) → iyzico/PayTR (Faz 2), tek access yolu |
| Secure Media | VideoProvider + signed URL + watermark hook |
| RBAC | Rol + izin, middleware + server-side |
| Komisyon-first | Her satışta platform payı + eğitmen bakiyesi kaydı |
| SEO-first | Metadata, OG, sitemap, course pages |
| MVP simplicity | Redis/queue yok; basit aggregations |

---

## 2. Teknoloji Yığını

```
┌─────────────────────────────────────────────────────────────┐
│  Presentation (Next.js App Router + RSC + Client Islands) │
├─────────────────────────────────────────────────────────────┤
│  State: Zustand (UI light) + Server state (RSC)             │
├─────────────────────────────────────────────────────────────┤
│  Application: Server Actions + Route Handlers (webhooks)    │
├─────────────────────────────────────────────────────────────┤
│  Domain Services (services/)                                │
├─────────────────────────────────────────────────────────────┤
│  Infrastructure: Prisma → PostgreSQL                      │
│  Auth: Custom JWT (httpOnly cookie + refresh)               │
│  Storage: Cloudflare R2 (S3-compatible API)                 │
│  Validation: Zod + React Hook Form                          │
│  UI: Tailwind + shadcn/ui                                   │
└─────────────────────────────────────────────────────────────┘
```

| Katman | Teknoloji | Not |
|--------|-----------|-----|
| Framework | Next.js (App Router) | RSC öncelikli |
| ORM | Prisma | Migrations, type-safe |
| DB | PostgreSQL | Tek veritabanı, tek platform |
| Auth | **Custom JWT** | Access + refresh, httpOnly secure cookies |
| Email | Resend / Nodemailer | Sync gönderim MVP’de yeterli |
| File / Video storage | **Cloudflare R2** | S3 API; egress ücreti yok; vendor lock az |

### MVP’de bilinçli olarak YOK

| Teknoloji | Ne zaman? |
|-----------|-----------|
| Redis | 10k+ kullanıcı, yüksek trafik |
| BullMQ / Inngest queue | Toplu mail, ağır background job |
| Upstash rate limit | İlk sürüm: basit in-memory / route throttle |
| Materialized views | Analytics karmaşıklaşınca |
| Multi-tenant routing | Ayrı mini platform ihtiyacı olunca |

---

## 3. Klasör Mimarisi (Hedef Yapı)

```
src/
├── app/
│   ├── (marketing)/
│   ├── (auth)/
│   ├── (dashboard)/
│   │   ├── admin/
│   │   ├── instructor/
│   │   └── student/
│   ├── courses/
│   ├── api/
│   │   ├── auth/                 # login, refresh, logout
│   │   └── webhooks/             # payment (Faz 2)
│   ├── sitemap.ts
│   └── robots.ts
├── components/
├── lib/
│   ├── auth/                     # JWT sign/verify, cookies, password hash
│   ├── db/
│   ├── rbac/
│   ├── storage/                  # R2 client, presigned URLs
│   ├── providers/
│   │   ├── video/
│   │   └── payment/
│   ├── seo/
│   └── utils/
├── actions/
├── services/
├── hooks/
├── types/
├── validators/
├── store/
└── middleware.ts

prisma/
docs/
```

**Bağımlılık kuralı:** `app → actions → services → lib/db` — components asla doğrudan Prisma çağırmaz.

---

## 4. Katmanlı Mimari

### 4.1 Server Actions vs Route Handlers

| Kullanım | Mekanizma |
|----------|-----------|
| Form mutations | Server Actions |
| Login / refresh / logout | Route Handlers `POST /api/auth/*` |
| Payment webhooks (Faz 2) | Route Handlers |
| R2 presigned upload URL | Server Action veya Route Handler |
| Video signed playback URL | Server Action (kısa TTL) |

---

## 5. Kimlik Doğrulama (Custom JWT)

> **ADR-001 (revize):** Auth.js yerine custom auth — tam kontrol, callback/adapter drama yok.

### 5.1 Token stratejisi

```
Access Token  → JWT, kısa ömür (15 dk), payload: userId, role, emailVerified
Refresh Token → JWT veya opaque ID, uzun ömür (7–30 gün), DB’de revoke edilebilir

Cookie:
  access_token  → httpOnly, secure, sameSite=lax, path=/
  refresh_token → httpOnly, secure, sameSite=strict, path=/api/auth/refresh
```

### 5.2 Akışlar

```
Register → verification email (token DB) → verify → Login
Login → set cookies → middleware reads access token
Access expired → POST /api/auth/refresh → yeni access cookie
Forgot → reset token (expiry) → POST reset → invalidate sessions
Logout → clear cookies + revoke refresh token
```

### 5.3 Session / güvenlik

- Şifre: `bcrypt` veya `argon2`
- Refresh token rotation (her refresh’te yeni token)
- `Session` veya `RefreshToken` tablosu: cihaz, IP, revokedAt
- Email verification zorunlu (içerik satın alma öncesi)

### 5.4 RBAC

**Roller:** `SUPER_ADMIN | ADMIN | INSTRUCTOR | STUDENT`

| Permission | SUPER_ADMIN | ADMIN | INSTRUCTOR | STUDENT |
|------------|:-----------:|:-----:|:----------:|:-------:|
| users.manage | ✓ | ✓ | — | — |
| payments.approve | ✓ | ✓ | — | — |
| payouts.manage | ✓ | ✓ | — | — |
| courses.moderate | ✓ | ✓ | — | — |
| courses.own.write | ✓ | ✓ | ✓ | — |
| courses.purchase | ✓ | ✓ | ✓ | ✓ |
| content.watch | ✓ | ✓ | ✓ | ✓* |
| live.join | ✓ | ✓ | ✓ | ✓* |
| wallet.view_own | ✓ | ✓ | ✓ | — |

\* `CourseAccess` aktif + canlı için `joinAvailableAt <= now <= endsAt`

### 5.5 Koruma katmanları

```
middleware.ts  → JWT verify + role + route prefix
layout.tsx     → getCurrentUser() server-side
Server Actions → requireAuth() + requirePermission()
Services       → instructorId === user.id (kendi içeriği)
```

---

## 6. Veri Modeli — Kavramsal ER (Özet)

```
User 1──1 Profile
User 1──1 InstructorProfile
User 1──1 WalletBalance (instructor)
User 1──* Course
User 1──* Order
User 1──* CourseAccess
User 1──* RefreshToken / Session

Course *──1 CourseCategory
Course 1──* Module 1──* Lesson
Lesson → Video | LiveSession | DocumentAsset

Order 1──* Payment
Order 1──1 OrderCommissionSnapshot (satış anındaki oranlar)
Order 1──0..1 CourseAccess

CommissionRule (global veya instructor override)
InstructorPayout (çekim talepleri)
WalletBalance + WalletTransaction (ledger)
```

**Soft delete:** User, Course, Module, Lesson, Video  
**Indexes:** slug, instructorId, order status, payout status, wallet userId

*(Tam Prisma şeması Adım 2’de)*

---

## 7. Komisyon ve Eğitmen Kazanç Sistemi

> MVP’de muhasebe cehennemini önlemek için her **onaylanan ödemede** ledger kaydı zorunlu.

### 7.1 Örnek hesap

```
Kurs fiyatı (gross):     3.000 TL
Platform komisyonu %20:    600 TL
Eğitmen net kazancı:     2.400 TL
```

### 7.2 Modeller

**CommissionRule**

| Alan | Açıklama |
|------|----------|
| `scope` | GLOBAL \| INSTRUCTOR \| COURSE |
| `instructorId?` | Override için |
| `courseId?` | Kurs bazlı override |
| `percent` | Platform payı (örn. 20) |
| `effectiveFrom` | Geçerlilik başlangıcı |
| `isActive` | Aktif kural |

Öncelik: `COURSE` > `INSTRUCTOR` > `GLOBAL`

**OrderCommissionSnapshot** (immutable, satış anı)

```
orderId, grossAmount, platformFeePercent, platformFeeAmount,
instructorNetAmount, currency
```

**WalletBalance** (instructor başına)

```
availableBalance, pendingBalance, totalEarned, totalWithdrawn
```

**WalletTransaction** (ledger — append-only)

```
type: SALE_CREDIT | PAYOUT_DEBIT | REFUND_DEBIT | ADJUSTMENT
amount, balanceAfter, orderId?, payoutId?, note
```

**InstructorPayout** (çekim talebi)

```
status: PENDING | APPROVED | PAID | REJECTED
amount, bankDetails (encrypted/json), processedBy, paidAt
```

### 7.3 Akış (ödeme onayı ile)

```
grantCourseAccess(orderId)
  → Order.status = PAID
  → CourseAccess oluştur
  → CommissionService.calculate(order) → snapshot kaydet
  → WalletService.credit(instructorId, instructorNetAmount, PENDING|AVAILABLE)
```

Manuel ve otomatik ödeme **aynı** `grantCourseAccess` + komisyon hook’unu çağırır.

İade: `REFUND_DEBIT` + access revoke + snapshot referansı.

---

## 8. Kurs ve İçerik Sistemi

### 8.1 Yayın durumu

```
DRAFT → PENDING_REVIEW → PUBLISHED → ARCHIVED
              ↓
           REJECTED
```

### 8.2 Ders tipleri

```ts
enum LessonType { VIDEO | LIVE | DOCUMENT }
```

### 8.3 İlerleme

`LessonProgress` + aggregate `CourseProgress` — Server Actions ile persist.

---

## 9. Video Sistemi — Provider Abstraction (değişmedi)

```ts
interface VideoProvider {
  readonly name: 'manual' | 'r2' | 'bunny' | 'mux'

  registerAsset(input: RegisterVideoInput): Promise<VideoAssetRef>
  getPlaybackUrl(input: PlaybackUrlInput): Promise<SignedPlaybackUrl>
  getWatermarkedPlaybackUrl?(input: WatermarkedPlaybackInput): Promise<SignedPlaybackUrl>
  deleteAsset?(assetId: string): Promise<void>
}
```

### 9.1 Faz 1: Manual + R2

- Dosya **Cloudflare R2**’de (`storageKey`)
- DB: `provider: 'manual' | 'r2'`, `externalId`
- Oynatma: presigned GET (R2 S3 API) — `R2VideoProvider` veya `ManualVideoProvider` wrapper

### 9.2 Geçiş yolu

```
manuel upload (R2) → Bunny Stream → Mux
```

Factory: `getVideoProvider(env.VIDEO_PROVIDER)` — sistem çöpe gitmez.

### 9.3 Watermark (placeholder)

`WatermarkConfig` + `getWatermarkedPlaybackUrl?` — ileride Mux/Bunny native; R2/manual’da overlay veya transcode job.

### 9.4 Stream koruması

| Katman | Önlem |
|--------|-------|
| URL | TTL 1–4 saat presigned |
| Access | CourseAccess her istekte |
| MVP rate limit | Basit: route başına throttle (bellek veya DB sayaç) |

---

## 10. Canlı Oturum Sistemi

### 10.1 LiveSession alanları

| Alan | Açıklama |
|------|----------|
| `platform` | ZOOM \| TEAMS |
| `meetingUrl` | Katılım linki |
| `meetingPassword` | Şifreli saklama (opsiyonel) |
| `startsAt` | Başlangıç |
| **`joinAvailableAt`** | **Erken giriş kapısı (örn. startsAt - 15 dk)** |
| `durationMinutes` | Süre |
| `timezone` | IANA timezone |
| `lessonId` | 1:1 |

### 10.2 Katılım kontrolü

```ts
canJoin = CourseAccess.active
  && now >= joinAvailableAt
  && now <= startsAt + duration
```

UI: `joinAvailableAt` öncesi “Henüz açılmadı” + geri sayım.

### 10.3 Takvim

ICS export: `DTSTART`, `DTEND`, `LOCATION` (meetingUrl), `DESCRIPTION`.

### 10.4 Hatırlatma

MVP: in-app `Notification` kaydı; email sync (queue yok).  
İleride: mail queue ile T-24h / T-1h.

---

## 11. Ödeme Sistemi — Provider Pattern (değişmedi)

### 11.1 PaymentProvider

```ts
interface PaymentProvider {
  readonly name: 'manual' | 'iyzico' | 'paytr'
  createCheckout(input: CreateCheckoutInput): Promise<CheckoutResult>
  verifyWebhook?(payload, signature): Promise<WebhookResult>
  refund?(paymentId, amount?): Promise<RefundResult>
}
```

### 11.2 Faz 1: Manuel

Dekont → R2 upload → admin onay → **`grantCourseAccess(orderId)`** + komisyon ledger.

### 11.3 Faz 2: Otomatik

Webhook → `handleWebhook` → **aynı** `grantCourseAccess` + komisyon.

### 11.4 Kupon

`OrderService.applyCoupon()` — Faz 1 ve 2 ortak; komisyon **indirim sonrası net** üzerinden.

---

## 12. Depolama — Cloudflare R2

```
lib/storage/r2-client.ts    → @aws-sdk/client-s3 (R2 endpoint)
lib/storage/presign.ts      → upload + download signed URLs
```

| Asset | Bucket path örneği | Max |
|-------|-------------------|-----|
| receipt | `receipts/{orderId}/` | 5MB |
| thumbnail | `courses/{courseId}/` | 2MB |
| document | `lessons/{lessonId}/` | 20MB |
| video | `videos/{videoId}/` | büyük dosya, multipart |

**Neden R2:** ucuz, egress yok, S3 uyumlu, Mux/Bunny’ye geçişte metadata aynı kalır.

Upload akışı: Client → presigned PUT URL (Server Action) → confirm → DB `storageKey`.

---

## 13. Admin Panel

### 13.1 Modüller

Users · Courses · Payments · **Payouts / Komisyon** · Live Sessions · Reviews · Coupons · Notifications · Certificates · Settings

### 13.2 Dashboard analytics (MVP — sade)

| Metrik | Sorgu özeti |
|--------|-------------|
| **Top courses** | Son 30 gün / tüm zaman — satış adedi veya gelir, LIMIT 5 |
| **Revenue** | `SUM(order.total)` WHERE `status = PAID` |
| **Student count** | `COUNT(DISTINCT userId)` FROM `course_access` WHERE active |

Hepsi Prisma aggregation + `Promise.all` — **materialized view yok**, grafik kütüphanesi opsiyonel (tek kart yeter).

İleride: aylık breakdown, funnel, retention.

---

## 14. Öğrenci Paneli ("My Learning")

Satın alınan kurslar · devam et · ilerleme · canlı (joinAvailableAt ile) · sertifikalar.

Route: `/learn`, `/learn/courses/[slug]`, `/learn/courses/[slug]/lessons/[lessonId]`

---

## 15. UI/UX

Psychology-friendly premium: soft neutral, sage primary, generous spacing, Masterclass + modern therapy hissi — generic LMS değil.

---

## 16. SEO

`generateMetadata`, OG, Twitter, `sitemap.ts`, `robots.ts`, Course JSON-LD, canonical URL.

---

## 17. Güvenlik (MVP)

| Tehdit | Önlem |
|--------|-------|
| Unauthorized | RBAC + CourseAccess |
| XSS | React + Zod |
| CSRF | Server Actions; API routes SameSite cookies |
| Auth | httpOnly, secure, refresh rotation |
| Rate limit | Basit route throttle (Redis yok) |
| Upload | MIME whitelist, max size, R2 private bucket |
| IDOR | Service ownership |
| Video | Short TTL presigned |

---

## 18. Bildirimler (MVP)

- **In-app:** `Notification` tablosu + Zustand badge
- **Email:** sync gönderim (Resend) — sipariş onayı, verify, reset
- Queue: **yok** (10k+ kullanıcı / yüksek hacimde eklenir)

---

## 19. API ve Entegrasyon Haritası

```
Browser → Next.js App → PostgreSQL
              ├── Custom Auth (JWT cookies)
              ├── Cloudflare R2 (S3 API)
              ├── Email (Resend)
              └── (Faz 2) iyzico/PayTR webhook
              └── (Faz 2) Bunny/Mux video API
```

---

## 20. Ortam Değişkenleri

```env
NEXT_PUBLIC_APP_URL=
DATABASE_URL=

# Auth
JWT_ACCESS_SECRET=
JWT_REFRESH_SECRET=
JWT_ACCESS_EXPIRES=15m
JWT_REFRESH_EXPIRES=30d

# Email
RESEND_API_KEY=
EMAIL_FROM=

# Cloudflare R2
R2_ACCOUNT_ID=
R2_ACCESS_KEY_ID=
R2_SECRET_ACCESS_KEY=
R2_BUCKET_NAME=
R2_PUBLIC_URL=          # opsiyonel CDN
R2_ENDPOINT=            # https://<account>.r2.cloudflarestorage.com

# Video / Payment providers
VIDEO_PROVIDER=manual     # manual | r2 | bunny | mux
PAYMENT_PROVIDER=manual

# Platform default commission (override DB'de)
DEFAULT_PLATFORM_FEE_PERCENT=20

ENCRYPTION_KEY=         # meeting password, bank details
```

---

## 21. Deployment

| Aşama | Altyapı |
|-------|---------|
| MVP | Vercel + PostgreSQL (Neon/Supabase) + R2 |
| Growth | CDN, connection pooling, read replica |
| Scale | Redis, job queue, video CDN — ihtiyaç halinde |

Stateless Next.js; idempotent webhooks; PgBouncer / Prisma Accelerate isteğe bağlı.

---

## 22. Uygulama Yol Haritası

| Adım | Çıktı | Durum |
|------|-------|-------|
| 1 | Mimari (v1.1) | ✅ Revize — onay bekleniyor |
| 2 | Prisma schema (+ komisyon modelleri) | ✅ Tamamlandı |
| 3 | Klasör + boilerplate | ✅ Tamamlandı |
| 4 | Custom auth | ✅ Tamamlandı |
| 5 | Admin dashboard (3 metrik) | ✅ Başlandı |
| 6 | Kurs sistemi | Bekliyor |
| 7 | Ödeme + komisyon ledger | Bekliyor |
| 8 | Canlı oturum + joinAvailableAt | Bekliyor |
| 9 | Video provider + R2 | Bekliyor |

---

## 23. Karar Kayıtları (ADR)

| # | Karar | Gerekçe |
|---|-------|---------|
| ADR-001 | **Custom JWT auth** | Kontrol, az magic, cookie-session alışkanlığı |
| ADR-002 | Provider pattern (video, payment) | Sağlayıcı değişimi rewrite gerektirmez |
| ADR-003 | Server Actions öncelikli | Type-safe, CSRF |
| ADR-004 | Tek `grantCourseAccess` | Manuel/otomatik + komisyon tek yol |
| ADR-005 | Soft delete | Audit, recovery |
| ADR-006 | Lesson polymorphism | Video/Live/PDF tek ağaç |
| ADR-007 | **Single platform, multi instructor** | MVP basitliği |
| ADR-008 | **Cloudflare R2** | Maliyet, S3 API, egress yok |
| ADR-009 | **Komisyon ledger MVP’de** | Muhasebe ve payout hazır |
| ADR-010 | **Redis/queue MVP dışı** | Maliyet ve debug yükü |

---

## 24. Sonraki Adım

**Adım 2:** Prisma schema — tüm modeller + `CommissionRule`, `OrderCommissionSnapshot`, `WalletBalance`, `WalletTransaction`, `InstructorPayout`, `joinAvailableAt`, custom auth tabloları (`RefreshToken` / `Session`).

---

*Onay: “Adım 2’ye geç” — Prisma şemasını üretirim.*
