import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const SESSION_COOKIE = "meestock_session";

// Routes ที่ไม่ต้อง login
const PUBLIC_PATHS = ["/login"];

// iisnode serves over a named pipe, so Next may see paths as "//pipe/<guid>/login"
const IISNODE_PIPE_PREFIX = /^\/\/pipe\/[^/]+/;

function buildLoginUrl(request: NextRequest, redirectPath?: string): URL {
  const host = request.headers.get("x-forwarded-host") ?? request.headers.get("host");
  const proto = request.headers.get("x-forwarded-proto") ?? "https";
  const loginUrl = host ? new URL("/login", `${proto}://${host}`) : new URL("/login", request.url);
  if (redirectPath) loginUrl.searchParams.set("redirect", redirectPath);
  return loginUrl;
}

export function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname.replace(IISNODE_PIPE_PREFIX, "") || "/";

  // ถ้าเป็น public path ข้ามไป
  if (PUBLIC_PATHS.some((p) => pathname.startsWith(p))) {
    return NextResponse.next();
  }

  // ถ้าเป็น API route, static files, Next.js internals ข้ามไป
  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/api") ||
    pathname.startsWith("/favicon") ||
    pathname.includes(".")
  ) {
    return NextResponse.next();
  }

  // ตรวจสอบ session cookie
  const session = request.cookies.get(SESSION_COOKIE)?.value;
  if (!session) {
    return NextResponse.redirect(buildLoginUrl(request, pathname));
  }

  // ตรวจสอบ session ไม่หมดอายุ (basic check)
  try {
    const payload = JSON.parse(Buffer.from(session, "base64").toString("utf-8"));
    if (!payload.exp || Date.now() > payload.exp) {
      const response = NextResponse.redirect(buildLoginUrl(request, pathname));
      response.cookies.delete(SESSION_COOKIE);
      return response;
    }
  } catch {
    return NextResponse.redirect(buildLoginUrl(request));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
