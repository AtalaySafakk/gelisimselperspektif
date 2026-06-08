import { requireAuth } from "@/lib/auth/guards";
import { DashboardShell } from "@/components/layout/dashboard-shell";

const nav = [
  { href: "/learn", label: "Öğrenimim" },
  { href: "/learn/live-sessions", label: "Canlı Dersler" },
  { href: "/learn/course-applications", label: "Eğitim başvurularım" },
  { href: "/learn/access-roles", label: "Uygunluk başvuruları" },
];

export default async function LearnLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requireAuth();
  return (
    <DashboardShell user={user} title="Öğrenimim" nav={nav}>
      {children}
    </DashboardShell>
  );
}
