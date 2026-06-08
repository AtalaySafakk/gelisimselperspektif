import Link from "next/link";
import { Button } from "@/components/ui/button";
import { getSession } from "@/lib/auth/guards";
import { getPanelPathForRole } from "@/lib/auth/redirects";
import { LogoutButton } from "@/components/layout/logout-button";

export async function MarketingHeader() {
  const session = await getSession();

  return (
    <header className="sticky top-0 z-50 border-b border-border/60 bg-background/80 backdrop-blur-md">
      <div className="container mx-auto flex h-16 max-w-6xl items-center justify-between px-4">
        <Link href="/" className="font-display text-xl font-semibold text-primary">
          Yılmazer Akademi
        </Link>
        <nav className="hidden items-center gap-8 text-sm text-muted-foreground md:flex">
          <Link href="/courses" className="hover:text-foreground">
            Eğitimler
          </Link>
          <Link href="/about" className="hover:text-foreground">
            Hakkımızda
          </Link>
        </nav>
        <div className="flex items-center gap-2">
          {session ? (
            <>
              <Button asChild size="sm">
                <Link href={getPanelPathForRole(session.role)}>Panel</Link>
              </Button>
              <LogoutButton />
            </>
          ) : (
            <>
              <Button asChild variant="ghost" size="sm">
                <Link href="/login">Giriş</Link>
              </Button>
              <Button asChild size="sm">
                <Link href="/register">Kayıt Ol</Link>
              </Button>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
