import Link from "next/link";
import type { SessionUser } from "@/lib/auth/session";
import { LogoutButton } from "@/components/layout/logout-button";

type NavItem = { href: string; label: string };

type DashboardShellProps = {
  user: SessionUser;
  title: string;
  nav: NavItem[];
  children: React.ReactNode;
};

export function DashboardShell({
  user,
  title,
  nav,
  children,
}: DashboardShellProps) {
  return (
    <div className="flex min-h-screen">
      <aside className="relative hidden w-64 shrink-0 border-r border-border bg-card md:block">
        <div className="flex h-16 items-center border-b px-6">
          <Link href="/" className="font-display text-lg font-semibold text-primary">
            Yılmazer
          </Link>
        </div>
        <nav className="space-y-1 p-4">
          {nav.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="block rounded-md px-3 py-2 text-sm text-muted-foreground hover:bg-muted hover:text-foreground"
            >
              {item.label}
            </Link>
          ))}
        </nav>
        <div className="absolute bottom-0 w-full border-t p-4 text-xs text-muted-foreground">
          {user.email}
        </div>
      </aside>
      <div className="flex flex-1 flex-col">
        <header className="flex h-16 items-center justify-between border-b px-6">
          <h1 className="font-display text-xl font-semibold">{title}</h1>
          <LogoutButton />
        </header>
        <main className="flex-1 p-6">{children}</main>
      </div>
    </div>
  );
}
