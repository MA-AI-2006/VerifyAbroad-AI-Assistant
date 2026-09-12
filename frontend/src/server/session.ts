import { cookies } from "next/headers";

export const STUDENT_COOKIE = "va_student_key";
/** Set by /api/auth/login and /api/auth/signup when a student signs in. */
export const AUTH_COOKIE = "va_auth";

/**
 * Returns the key that owns the current investigations. A signed-in account
 * always takes priority over the anonymous browser session.
 */
export async function getStudentKey(): Promise<string> {
  const store = await cookies();
  return (
    store.get(AUTH_COOKIE)?.value ?? store.get(STUDENT_COOKIE)?.value ?? "guest_student"
  );
}

export async function setAuthCookie(key: string) {
  const store = await cookies();
  store.set(AUTH_COOKIE, key, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });
}

export async function clearAuthCookie() {
  const store = await cookies();
  store.delete(AUTH_COOKIE);
}
