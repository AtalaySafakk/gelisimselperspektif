import { requireRole } from "@/lib/auth/guards";
import { Role } from "@prisma/client";
import { DashboardShell } from "@/components/layout/dashboard-shell";

const nav = [
  { href: "/instructor", label: "Dashboard" },
  { href: "/instructor/courses", label: "Kurslarım" },
  { href: "/instructor/live", label: "Canlı Oturumlar" },
  { href: "/instructor/students", label: "Öğrenciler" },
  { href: "/instructor/wallet", label: "Cüzdan" },
];

export default async function InstructorLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requireRole([Role.INSTRUCTOR, Role.ADMIN, Role.SUPER_ADMIN]);
  return (
    <DashboardShell user={user} title="Eğitmen" nav={nav}>
      {children}
    </DashboardShell>
  );
}
