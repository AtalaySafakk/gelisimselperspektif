import { requirePermission } from "@/lib/auth/guards";
import { accessRoleService } from "@/services/access-role.service";
import { prisma } from "@/lib/db/prisma";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { adminGrantAccessRoleByEmailAction, adminRevokeUserAccessRoleAction } from "@/actions/access-role.actions";

export const dynamic = "force-dynamic";

export default async function AdminUserAccessPage() {
  await requirePermission("users.manage");

  const [catalog, recent] = await Promise.all([
    accessRoleService.listActiveCatalog(),
    prisma.userAccessRole.findMany({
      take: 40,
      orderBy: { approvedAt: "desc" },
      include: {
        accessRole: true,
        user: { include: { profile: true } },
        approvedBy: { include: { profile: true } },
      },
    }),
  ]);

  return (
    <div className="space-y-8">
      <h2 className="font-display text-2xl font-semibold">Kullanıcı uygunluk yönetimi</h2>

      <Card className="max-w-lg">
        <CardHeader>
          <CardTitle className="text-base">E-posta ile manuel rol ata</CardTitle>
        </CardHeader>
        <CardContent>
          <form
            action={adminGrantAccessRoleByEmailAction as unknown as (fd: FormData) => Promise<void>}
            className="space-y-3"
          >
            <div className="space-y-1">
              <Label htmlFor="email">E-posta</Label>
              <Input id="email" name="email" type="email" required placeholder="user@ornek.com" />
            </div>
            <div className="space-y-1">
              <Label htmlFor="accessRoleId">Uygunluk rolü</Label>
              <select
                id="accessRoleId"
                name="accessRoleId"
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                required
              >
                {catalog.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1">
              <Label htmlFor="grantNote">
                Atama notu <span className="font-normal text-muted-foreground">(en az 5 karakter)</span>
              </Label>
              <p className="text-xs text-muted-foreground">
                Audit ve ileride hatırlama için kısa gerekçe zorunludur; “ok”, “.” gibi notlar kabul
                edilmez.
              </p>
              <textarea
                id="grantNote"
                name="grantNote"
                rows={3}
                required
                minLength={5}
                maxLength={4000}
                className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                placeholder="Örn. Belgeler WhatsApp üzerinden kontrol edildi, USTA başvurusu onaylandı."
              />
            </div>
            <Button type="submit">Rolü ata</Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Son atamalar</CardTitle>
        </CardHeader>
        <CardContent>
          {recent.length === 0 ? (
            <p className="text-sm text-muted-foreground">Kayıt yok.</p>
          ) : (
            <ul className="space-y-3 text-sm">
              {recent.map((row) => (
                <li key={row.id} className="space-y-1 border-b pb-3">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <span>
                        {row.user.profile?.displayName ?? row.user.email} —{" "}
                        <strong>{row.accessRole.name}</strong>
                      </span>
                      <p className="text-xs text-muted-foreground">
                        {row.approvedAt.toLocaleString("tr-TR")}
                        {row.approvedBy &&
                          ` · Atayan: ${
                            row.approvedBy.profile?.displayName ?? row.approvedBy.email
                          }`}
                      </p>
                      {row.manualGrantNote && (
                        <p className="mt-1 text-xs text-muted-foreground">
                          Not: {row.manualGrantNote}
                        </p>
                      )}
                    </div>
                    <form
                      action={adminRevokeUserAccessRoleAction as unknown as (fd: FormData) => Promise<void>}
                    >
                      <input type="hidden" name="userId" value={row.userId} />
                      <input type="hidden" name="accessRoleId" value={row.accessRoleId} />
                      <Button type="submit" variant="outline" size="sm">
                        Kaldır
                      </Button>
                    </form>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
