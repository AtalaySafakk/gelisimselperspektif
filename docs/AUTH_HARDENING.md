# Auth Hardening Review (Adım 4.5)

| # | Kontrol | Durum | Uygulama |
|---|---------|-------|----------|
| 1 | Refresh ham token DB'de yok | ✅ | Yalnızca `hashRefreshToken()` → `tokenHash` |
| 2 | Rotation'da eski token revoke | ✅ | `refreshSession` → `revokedAt` güncelle, yeni token oluştur |
| 3 | Reused/revoked refresh → family revoke | ✅ | `revokedAt !== null` → `revokeRefreshTokenFamily` + audit |
| 4 | Reset password → tüm refresh revoke | ✅ | `revokeAllRefreshTokens(userId)` |
| 5 | Verify/reset token tek kullanımlık | ✅ | `updateMany` + `usedAt`, count === 0 kontrolü |
| 6 | Cookie `secure` production | ✅ | `NODE_ENV === "production"` |
| 7 | SameSite | ✅ | access: `lax`, refresh: `strict`, path `/api/auth` |
| 8 | Middleware redirect loop | ✅ | `sanitizeCallbackUrl`, `/api/auth/refresh` hariç |
| 9 | Enumeration yok | ✅ | login: tek mesaj; register: aynı success; forgot: aynı mesaj |
| 10 | AuditLog `actorId` null | ✅ | reuse event `actorId: null` |

## Refresh reuse (boss move)

```
Çalınmış token tekrar gelir
  → DB'de tokenHash bulunur, revokedAt dolu
  → familyId altındaki TÜM aktif tokenlar revoke
  → REFRESH_TOKEN_REUSE_DETECTED audit (actorId: null)
  → Generic hata, cookie temizlenir
```
