import { NextResponse, type NextRequest } from "next/server";
import { verifyAccessTokenEdge } from "@/lib/auth/jwt-edge";
import {
  ACCESS_TOKEN_COOKIE,
  REFRESH_TOKEN_COOKIE,
} from "@/lib/auth/cookie-names";
import { sanitizeCallbackUrl } from "@/lib/auth/callback-url";

const AUTH_ROUTES = [
  "/login",
  "/register",
  "/forgot-password",
  "/reset-password",
  "/verify-email",
];

const PUBLIC_PREFIXES = ["/", "/courses", "/about", "/verify"];

function getRoleHome(role: string): string {
  if (role === "SUPER_ADMIN" || role === "ADMIN") return "/admin";
  if (role === "INSTRUCTOR") return "/instructor";
  return "/learn";
}

function isPublicPath(pathname: string): boolean {
  if (pathname === "/") return true;
  return PUBLIC_PREFIXES.some(
    (p) => p !== "/" && (pathname === p || pathname.startsWith(`${p}/`)),
  );
}

function getRequiredRoles(pathname: string): string[] | null {
  if (pathname.startsWith("/super-admin")) return ["SUPER_ADMIN"];
  if (pathname.startsWith("/admin")) return ["ADMIN", "SUPER_ADMIN"];
  if (pathname.startsWith("/instructor"))
    return ["INSTRUCTOR", "ADMIN", "SUPER_ADMIN"];
  if (pathname.startsWith("/learn"))
    return ["STUDENT", "INSTRUCTOR", "ADMIN", "SUPER_ADMIN"];
  return null;
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const token = request.cookies.get(ACCESS_TOKEN_COOKIE)?.value;
  const refreshCookie = request.cookies.get(REFRESH_TOKEN_COOKIE)?.value;

  let session: { role: string; emailVerified: boolean; sub?: string } | null =
    null;

  if (token) {
    try {
      const payload = await verifyAccessTokenEdge(token);
      session = {
        role: payload.role,
        emailVerified: payload.emailVerified,
        sub: payload.sub,
      };
    } catch {
      session = null;
    }
  }

  if (
    !session &&
    refreshCookie &&
    getRequiredRoles(pathname) &&
    !pathname.startsWith("/api/auth/refresh")
  ) {
    const refreshUrl = new URL("/api/auth/refresh", request.url);
    refreshUrl.searchParams.set(
      "callbackUrl",
      sanitizeCallbackUrl(pathname),
    );
    return NextResponse.redirect(refreshUrl);
  }

  if (session && AUTH_ROUTES.some((r) => pathname.startsWith(r))) {
    return NextResponse.redirect(new URL("/", request.url));
  }

  const requiredRoles = getRequiredRoles(pathname);
  if (requiredRoles) {
    if (!session) {
      const login = new URL("/login", request.url);
      login.searchParams.set("callbackUrl", pathname);
      return NextResponse.redirect(login);
    }
    if (!requiredRoles.includes(session.role)) {
      return NextResponse.redirect(new URL(getRoleHome(session.role), request.url));
    }
    if (pathname.startsWith("/learn") && !session.emailVerified) {
      return NextResponse.redirect(new URL("/verify-email?pending=1", request.url));
    }
  }

  if (
    !isPublicPath(pathname) &&
    !requiredRoles &&
    !session &&
    pathname.startsWith("/api/") &&
    !pathname.startsWith("/api/auth")
  ) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
