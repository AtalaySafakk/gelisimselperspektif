import { requireAuth } from "@/lib/auth/guards";
import { accessRoleService } from "@/services/access-role.service";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AccessRoleApplyForm } from "@/components/access/access-role-apply-form";
import { AccessApplicationDocUpload } from "@/components/access/access-application-doc-upload";
import { AccessRoleApplicationStatus } from "@prisma/client";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function LearnAccessRolesPage() {
  const user = await requireAuth();
  const [catalog, applications, grants] = await Promise.all([
    accessRoleService.listActiveCatalog(),
    accessRoleService.listApplicationsForUser(user.id),
    accessRoleService.listUserGrants(user.id),
  ]);

  const roleOptions = catalog.map((r) => ({ id: r.id, name: r.name, slug: r.slug }));

  return (
    <div className="space-y-8">
      <div>
        <h2 className="font-display text-2xl font-semibold">Uygunluk başvuruları</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Buradaki onaylar, belirli eğitimleri satın alabilmeniz için gereken uygunluk etiketleridir.
          Panel giriş rolünüzden ayrıdır.
        </p>
        <p className="mt-1 text-sm text-muted-foreground">
          <Link href="/courses" className="text-primary underline">
            Eğitimlere dön
          </Link>
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Onaylı uygunluklarım</CardTitle>
        </CardHeader>
        <CardContent>
          {grants.length === 0 ? (
            <p className="text-sm text-muted-foreground">Henüz atanmış uygunluk yok.</p>
          ) : (
            <ul className="list-inside list-disc text-sm">
              {grants.map((g) => (
                <li key={g.id} className="mb-2">
                  <span className="font-medium">{g.accessRole.name}</span>{" "}
                  <span className="text-muted-foreground">
                    ({g.approvedAt.toLocaleDateString("tr-TR")})
                  </span>
                  {g.approvedBy && (
                    <span className="ml-1 text-xs text-muted-foreground">
                      · Onaylayan:{" "}
                      {g.approvedBy.profile?.displayName ?? g.approvedBy.email}
                    </span>
                  )}
                  {g.manualGrantNote && (
                    <p className="mt-0.5 text-xs text-muted-foreground">{g.manualGrantNote}</p>
                  )}
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <AccessRoleApplyForm roles={roleOptions} />

      <Card>
        <CardHeader>
          <CardTitle>Başvuru geçmişi</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {applications.length === 0 ? (
            <p className="text-sm text-muted-foreground">Başvuru yok.</p>
          ) : (
            applications.map((app) => (
              <div key={app.id} className="border-b pb-4 last:border-0">
                <p className="font-medium">{app.accessRole.name}</p>
                <p className="text-xs text-muted-foreground">
                  Durum: {app.status} · {app.createdAt.toLocaleString("tr-TR")}
                </p>
                {app.status !== AccessRoleApplicationStatus.PENDING && app.reviewedAt && (
                  <p className="mt-1 text-xs text-muted-foreground">
                    {app.status === AccessRoleApplicationStatus.APPROVED ? "Onaylayan" : "Reddeden"}:{" "}
                    {app.reviewedBy?.profile?.displayName ?? app.reviewedBy?.email ?? "—"} ·{" "}
                    {app.reviewedAt.toLocaleString("tr-TR")}
                  </p>
                )}
                {app.note && <p className="mt-1 text-sm">Başvuru notunuz: {app.note}</p>}
                {app.status === AccessRoleApplicationStatus.REJECTED && app.reviewNote && (
                  <p className="mt-1 text-sm text-destructive">Gerekçe: {app.reviewNote}</p>
                )}
                {app.documents.length > 0 && (
                  <ul className="mt-2 text-sm">
                    {app.documents.map((d) => (
                      <li key={d.id}>
                        <a
                          href={`/api/storage/access-application-doc/${d.id}`}
                          className="text-primary underline"
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          {d.fileName}
                        </a>
                      </li>
                    ))}
                  </ul>
                )}
                {app.status === AccessRoleApplicationStatus.PENDING && (
                  <div className="mt-3">
                    <p className="mb-1 text-xs text-muted-foreground">
                      Kanıt belgesi yükleyin (PDF veya görsel)
                    </p>
                    <AccessApplicationDocUpload applicationId={app.id} />
                  </div>
                )}
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}
