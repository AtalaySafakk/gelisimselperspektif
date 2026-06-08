# Seed Stratejisi

## Amaç

Geliştirme ve staging ortamlarında tutarlı demo verisi; production'da **seed çalıştırılmaz** (yalnızca migration).

## Komutlar

```bash
# Migration + seed (ilk kurulum)
npx prisma migrate dev
npm run db:seed

# Sadece seed (DB dolu, seed idempotent)
npm run db:seed

# Şemayı sıfırla (DEV ONLY)
npx prisma migrate reset
```

## Idempotency

Seed `upsert` ve `findFirst` kullanır:

- Kullanıcılar: `email` unique
- Kategori / kurs / kupon: `slug` veya `code` unique
- Global komisyon: sabit `id: seed-global-commission`
- Modül: `courseId + title` ile tekrar oluşturulmaz

## Üretilen veri

| Varlık | Açıklama |
|--------|----------|
| 4 kullanıcı | SUPER_ADMIN, ADMIN, INSTRUCTOR, STUDENT |
| CommissionRule | %20 global |
| SystemSetting | platform adı, varsayılan komisyon |
| CourseCategory | Klinik Psikoloji |
| Course | EMDR Temel (PUBLISHED) |
| Module + 3 Lesson | VIDEO (R2), LIVE (joinAvailableAt), DOCUMENT |
| Coupon | HOSGELDIN10 (%10) |
| WalletBalance | Eğitmen için boş cüzdan |

**Şifre (tüm demo hesaplar):** `ChangeMe123!`

## Production

1. `prisma migrate deploy`
2. İlk SUPER_ADMIN: tek seferlik CLI script veya güvenli env tabanlı bootstrap
3. Komisyon kuralı: admin panel veya migration SQL ile

## Test senaryoları (manuel)

| Senaryo | Seed sonrası adım |
|---------|-------------------|
| Manuel ödeme | STUDENT ile sipariş → dekont → ADMIN onay |
| Komisyon | Onay sonrası `OrderCommissionSnapshot` + `WalletTransaction` |
| Canlı giriş | `joinAvailableAt` öncesi/sonrası kontrol |
| Audit | Kritik aksiyonlarda `AuditLog.create` (uygulama katmanı) |

## Ortam değişkenleri

```env
DATABASE_URL=postgresql://...
```

Seed ek env gerektirmez.
