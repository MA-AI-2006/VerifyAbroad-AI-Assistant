import { randomBytes, scryptSync, timingSafeEqual } from "node:crypto";

/**
 * Password hashing for the internal engine's account store.
 *
 * The deployed architecture uses the FastAPI backend (which has its own
 * PBKDF2 hashing); this stays for local/internal-engine use so both paths
 * verify and store credentials the same way instead of duplicating the
 * algorithm across route handlers.
 */
const KEY_LENGTH = 64;

export function hashSecret(password: string): string {
  const salt = randomBytes(16).toString("hex");
  const derived = scryptSync(password, salt, KEY_LENGTH).toString("hex");
  return `${salt}:${derived}`;
}

export function verifySecret(password: string, stored: string | null | undefined): boolean {
  if (!stored) return false;
  const [salt, digest] = stored.split(":");
  if (!salt || !digest) return false;
  try {
    const derived = scryptSync(password, salt, KEY_LENGTH);
    const expected = Buffer.from(digest, "hex");
    return derived.length === expected.length && timingSafeEqual(derived, expected);
  } catch {
    return false;
  }
}
