import { NextResponse, type NextRequest } from "next/server";

const STUDENT_COOKIE = "va_student_key";

/**
 * Issues a lightweight, anonymous session key so investigations and profile
 * preferences can be reloaded without collecting any sensitive personal data.
 *
 * The key is also forwarded on the incoming request so the very first page
 * render and the first API call see the same value.
 */
export function proxy(request: NextRequest) {
  const existing = request.cookies.get(STUDENT_COOKIE)?.value;
  const key = existing ?? `student_${crypto.randomUUID()}`;

  const headers = new Headers(request.headers);
  if (!existing) {
    const cookieHeader = headers.get("cookie");
    headers.set("cookie", cookieHeader ? `${cookieHeader}; ${STUDENT_COOKIE}=${key}` : `${STUDENT_COOKIE}=${key}`);
  }

  const response = NextResponse.next({ request: { headers } });
  if (!existing) {
    response.cookies.set(STUDENT_COOKIE, key, {
      httpOnly: true,
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 180,
    });
  }
  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
