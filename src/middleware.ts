import { NextResponse, type NextRequest } from "next/server";

const PROTECTED_ROUTES = [
  "/dashboard",
  "/workout",
  "/programs",
  "/history",
  "/exercises",
  "/progress",
  "/profile",
  "/onboarding",
];

const AUTH_ROUTES = ["/login", "/signup"];

export async function middleware(request: NextRequest) {
  const hasSession = request.cookies.has("arcus_session");

  const isProtectedRoute = PROTECTED_ROUTES.some((route) =>
    request.nextUrl.pathname.startsWith(route)
  );
  const isAuthRoute = AUTH_ROUTES.some((route) =>
    request.nextUrl.pathname.startsWith(route)
  );

  if (isProtectedRoute && !hasSession) {
    return NextResponse.redirect(new URL("/login", request.url));
  }
  if (isAuthRoute && hasSession) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * Feel free to modify this pattern to include more paths.
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
