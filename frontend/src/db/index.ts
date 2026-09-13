import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";

/**
 * Optional Postgres access for the *internal engine*.
 *
 * The deployed app does not need this: when `BACKEND_URL` is set, the FastAPI
 * service owns accounts, history, evidence and reports, and the frontend stays
 * stateless (one less thing to provision on Vercel). This module therefore must
 * never throw at import time — a missing DATABASE_URL used to crash every page
 * that transitively imported it, including /investigate and /history.
 *
 * `db` is a lazy proxy: connecting (and failing) happens on first *use*, and
 * `databaseConfigured()` lets callers pick the static/fallback path instead.
 */
const databaseUrl = process.env.DATABASE_URL?.trim();

export class DatabaseNotConfiguredError extends Error {
  constructor() {
    super(
      "DATABASE_URL is not set. The internal engine needs a Postgres database; " +
        "deploy the FastAPI backend and set BACKEND_URL instead.",
    );
    this.name = "DatabaseNotConfiguredError";
  }
}

export function databaseConfigured(): boolean {
  return Boolean(databaseUrl);
}

const globalForDb = globalThis as typeof globalThis & {
  __arenaNextJsPostgresqlPool?: Pool;
};

let pool: Pool | null = null;

export function getPool(): Pool {
  if (!databaseUrl) throw new DatabaseNotConfiguredError();
  if (!pool) {
    pool = new Pool({
      connectionString: databaseUrl,
      max: 5,
      // Vercel serverless functions do not reuse idle clients; keep the pool tiny
      // and let connections die quickly rather than exhausting Supabase/Neon.
      idleTimeoutMillis: 5_000,
      connectionTimeoutMillis: 10_000,
      allowExitOnIdle: true,
    });
    if (process.env.NODE_ENV !== "production") {
      globalForDb.__arenaNextJsPostgresqlPool = pool;
    }
  }
  return pool;
}

if (process.env.NODE_ENV !== "production" && globalForDb.__arenaNextJsPostgresqlPool) {
  pool = globalForDb.__arenaNextJsPostgresqlPool;
}

let client: ReturnType<typeof drizzle> | null = null;

/** Drizzle handle. Throws DatabaseNotConfiguredError only when actually used. */
export const db = new Proxy({} as ReturnType<typeof drizzle>, {
  get(_target, property, receiver) {
    if (!client) {
      client = drizzle(getPool() as never);
    }
    const value = Reflect.get(client as object, property, receiver);
    return typeof value === "function" ? (value as Function).bind(client) : value;
  },
});
