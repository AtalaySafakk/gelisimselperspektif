import { requireRole } from "@/lib/auth/guards";
import { Role } from "@prisma/client";
import { DashboardShell } from "@/components/layout/dashboard-shell";

const nav = [
  { href: "/admin", label: "Dashboard" },
  { href: "/admin/users", label: "Kullanıcılar" },
  { href: "/admin/courses", label: "Kurslar" },
  { href: "/admin/hero-slides", label: "Anasayfa slider" },
  { href: "/admin/access-applications", label: "Uygunluk başvuruları" },
  { href: "/admin/course-applications", label: "Eğitim başvuruları" },
  { href: "/admin/user-access", label: "Uygunluk atamaları" },
  { href: "/admin/payments", label: "Ödemeler" },
  { href: "/admin/live-sessions", label: "Canlı Oturumlar" },
  { href: "/admin/payouts", label: "Payout" },
];

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requireRole([Role.ADMIN, Role.SUPER_ADMIN]);
  return (
    <DashboardShell user={user} title="Admin" nav={nav}>
      {children}
    </DashboardShell>
  );
}
