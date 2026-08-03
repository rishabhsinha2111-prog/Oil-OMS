import { NextRequest, NextResponse } from "next/server";

const ROLE_HOME: Record<string, string> = {
  admin: "/pending",
  purchase: "/purchase",
  sales: "/sales",
};

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  if (pathname.startsWith("/api") || pathname.startsWith("/_next") || pathname === "/login") {
    return NextResponse.next();
  }

  const raw = req.cookies.get("sauda_session")?.value;
  if (!raw) {
    return NextResponse.redirect(new URL("/login", req.url));
  }

  try {
    const user = JSON.parse(raw);

    if (pathname.startsWith("/purchase") && user.role !== "purchase" && user.role !== "admin") {
      return NextResponse.redirect(new URL(ROLE_HOME[user.role] ?? "/login", req.url));
    }
    if (pathname.startsWith("/dispatch-upload") && user.role !== "purchase" && user.role !== "admin") {
      return NextResponse.redirect(new URL(ROLE_HOME[user.role] ?? "/login", req.url));
    }
    if (pathname.startsWith("/sales") && user.role !== "sales" && user.role !== "admin") {
      return NextResponse.redirect(new URL(ROLE_HOME[user.role] ?? "/login", req.url));
    }
    if (pathname.startsWith("/pending") && user.role !== "admin") {
      return NextResponse.redirect(new URL(ROLE_HOME[user.role] ?? "/login", req.url));
    }
  } catch {
    return NextResponse.redirect(new URL("/login", req.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
