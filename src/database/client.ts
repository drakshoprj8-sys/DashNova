import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";

import * as schema from "./schema";

/**
 * Cliente do banco (lazy singleton).
 * Em serverless (Vercel), usar o pooler do Supabase (porta 6543) em
 * DATABASE_URL com `prepare: false`. DIRECT_URL (porta 5432) é usada apenas
 * pelo drizzle-kit para migrations.
 */
let _db: ReturnType<typeof createDb> | null = null;

/**
 * URL do banco. Usa DATABASE_URL; se não existir, cai para POSTGRES_URL,
 * que a integração oficial Supabase ↔ Vercel cria automaticamente (pooler,
 * porta 6543). Parâmetros que não são do Postgres (`supa`, `pgbouncer`)
 * são removidos — o postgres.js os enviaria ao servidor como parâmetros de
 * conexão e o pooler recusaria.
 */
function resolveDatabaseUrl(): string | undefined {
  const raw = process.env.DATABASE_URL || process.env.POSTGRES_URL;
  if (!raw) return undefined;
  try {
    const parsed = new URL(raw);
    parsed.searchParams.delete("supa");
    parsed.searchParams.delete("pgbouncer");
    return parsed.toString();
  } catch {
    return raw;
  }
}

function createDb() {
  const url = resolveDatabaseUrl();
  if (!url) {
    throw new Error(
      "DATABASE_URL não configurada. Configure o Supabase para acessar o banco (ver docs/DEPLOY.md).",
    );
  }
  const client = postgres(url, { prepare: false });
  return drizzle(client, { schema });
}

export function getDb() {
  if (!_db) _db = createDb();
  return _db;
}

export function isDatabaseConfigured(): boolean {
  return Boolean(resolveDatabaseUrl());
}

export type Database = ReturnType<typeof getDb>;
