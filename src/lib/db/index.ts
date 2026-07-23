import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

const connectionString = process.env.DATABASE_URL ?? "";

const globalForDb = globalThis as unknown as { pg?: ReturnType<typeof postgres> };

// postgres.js conecta de forma preguiçosa (só na primeira query), então instanciar
// no build/import é seguro. `prepare: false` é recomendado com o pooler do Supabase.
const client = globalForDb.pg ?? postgres(connectionString, { prepare: false });
if (process.env.NODE_ENV !== "production") globalForDb.pg = client;

export const db = drizzle(client, { schema });
export { schema };
