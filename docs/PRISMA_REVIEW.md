# Prisma Schema Review (Pre–Step 3)

**Tarih:** Adım 2 final review  
**Sonuç:** 10/10 geçti (düzeltmeler uygulandı)

| # | Kontrol | Durum | Not |
|---|---------|-------|-----|
| 1 | RefreshToken hash + meta | ✅ | `tokenHash` (SHA-256), `revokedAt`, `expiresAt`, `ipAddress`, `userAgent` |
| 2 | CourseAccess unique + status | ✅ | `@@unique([userId, courseId])`, `CourseAccessStatus` |
| 3 | WalletTransaction append-only | ✅ | Şemada `updatedAt` yok; `wallet-transaction.repository.ts` |
| 4 | Manuel dekont | ✅ | `Payment.receiptStorageKey`, `receiptUploadedAt`, `MANUAL` provider |
| 5 | AuditLog nullable actor | ✅ | `actorId String?`, `onDelete: SetNull` |
| 6 | Lesson order unique/module | ✅ | `@@unique([moduleId, order])` — DB column `sort_order` |
| 7 | Module order unique/course | ✅ | `@@unique([courseId, order])` |
| 8 | LiveSession timing | ✅ | `joinAvailableAt`, `startsAt`, `durationMinutes` |
| 9 | Video provider fields | ✅ | `provider`, `storageKey`, `externalId`, `durationSeconds` |
| 10 | Decimal para alanları | ✅ | Tüm tutarlar `Decimal`; Float yok |

## Soft delete + sıra unique

`@@unique([moduleId, order])` aktif kayıtlar için çakışmayı önler. Soft delete sırasında servis katmanı `order` değerini serbest bırakmalı (ör. negatif veya `900000 + timestamp`).

İleride opsiyonel PostgreSQL partial index:

```sql
CREATE UNIQUE INDEX lessons_module_order_active_idx
  ON lessons (module_id, sort_order)
  WHERE deleted_at IS NULL;
```

## Para alanları (Decimal)

`Course.price`, `Order.*`, `Payment.amount`, `Wallet*`, `Coupon.value`, `CommissionRule.percent`, `InstructorPayout.amount`, `OrderCommissionSnapshot.*`

## Manuel ödeme akışı (şema)

```
Order PENDING → Payment PENDING
  → receipt upload → receiptStorageKey + UNDER_REVIEW + Order AWAITING_APPROVAL
  → admin APPROVED → grantCourseAccess + commission snapshot + wallet credit
```
