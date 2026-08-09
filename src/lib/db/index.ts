import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { AsyncLocalStorage } from "node:async_hooks";
import * as schema from "./schema";

// Interruptor da RLS na aplicação. Enquanto `false` (padrão), o comportamento é
// IDÊNTICO ao histórico: o cliente é usado direto, sem crachá e sem transação extra.
// Só ligamos na virada (RLS_ENFORCED=true + DATABASE_URL_RLS) — e é reversível:
// basta desligar RLS_ENFORCED que o app volta a usar o DATABASE_URL original.
const RLS_ENFORCED = process.env.RLS_ENFORCED === "true";

// Quando a RLS está ligada, conecta pelo papel SEM bypass via DATABASE_URL_RLS,
// mantendo o DATABASE_URL original intocado (reversão instantânea = desligar o flag).
const connectionString =
  (RLS_ENFORCED && process.env.DATABASE_URL_RLS) || process.env.DATABASE_URL || "";

const globalForDb = globalThis as unknown as { pg?: ReturnType<typeof postgres> };

// postgres.js conecta de forma preguiçosa (só na primeira query), então instanciar
// no build/import é seguro. `prepare: false` é recomendado com o pooler do Supabase.
const realClient = globalForDb.pg ?? postgres(connectionString, { prepare: false });
if (process.env.NODE_ENV !== "production") globalForDb.pg = realClient;

/* --------------------------------------------------------------------------
 * Contexto de tenant por requisição (o "crachá").
 * Guardado por AsyncLocalStorage: cada requisição carrega o seu tenantId, e o
 * motor abaixo injeta `set_config('app.tenant_id', ...)` em cada query, dentro
 * de uma transação, para as políticas de RLS (que leem app_current_tenant())
 * valerem. Fora de um contexto (login, verificação pública), nenhum crachá é
 * enviado — esses casos usam funções SECURITY DEFINER dedicadas.
 * ------------------------------------------------------------------------ */
type TenantCtx = { tenantId: string };
const tenantStore = new AsyncLocalStorage<TenantCtx>();

/** Define o tenant atual para o restante desta requisição (usar em requireSession). */
export function setTenantContext(tenantId: string): void {
  tenantStore.enterWith({ tenantId });
}

/** Roda `fn` com um tenant específico (login pós-auth, jobs de sistema). */
export function withTenant<T>(tenantId: string, fn: () => Promise<T>): Promise<T> {
  return tenantStore.run({ tenantId }, fn);
}

/** tenantId atual, se houver. */
export function getTenantContext(): string | null {
  return tenantStore.getStore()?.tenantId ?? null;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnySql = any;

async function setGuc(tx: AnySql, tenantId: string): Promise<void> {
  await tx.unsafe("select set_config('app.tenant_id', $1, true)", [tenantId]);
}

/**
 * Envolve o cliente postgres.js. Cada query (`unsafe`) e cada transação (`begin`)
 * do drizzle passa a rodar dentro de uma transação onde o crachá é definido antes.
 * Só é ativado quando RLS_ENFORCED=true.
 */
function makeClient(): ReturnType<typeof postgres> {
  if (!RLS_ENFORCED) return realClient;

  return new Proxy(realClient, {
    apply: (target, thisArg, args) => Reflect.apply(target as AnySql, thisArg, args),
    get(target, prop, receiver) {
      if (prop === "unsafe") {
        return (query: string, params?: unknown[]) => {
          const tid = getTenantContext();
          if (!tid) return (realClient as AnySql).unsafe(query, params);
          const rows = () => realClient.begin(async (tx: AnySql) => { await setGuc(tx, tid); return tx.unsafe(query, params); });
          const vals = () => realClient.begin(async (tx: AnySql) => { await setGuc(tx, tid); return tx.unsafe(query, params).values(); });
          return {
            then: (res: AnySql, rej: AnySql) => rows().then(res, rej),
            catch: (rej: AnySql) => rows().catch(rej),
            finally: (f: AnySql) => rows().finally(f),
            values: () => ({ then: (res: AnySql, rej: AnySql) => vals().then(res, rej), catch: (rej: AnySql) => vals().catch(rej) }),
          };
        };
      }
      if (prop === "begin") {
        return (arg1: AnySql, arg2: AnySql) => {
          const tid = getTenantContext();
          const cb = typeof arg1 === "function" ? arg1 : arg2;
          const opts = typeof arg1 === "function" ? undefined : arg1;
          const wrapped = async (tx: AnySql) => { if (tid) await setGuc(tx, tid); return cb(tx); };
          return opts !== undefined ? (realClient as AnySql).begin(opts, wrapped) : realClient.begin(wrapped);
        };
      }
      const value = Reflect.get(target, prop, receiver);
      return typeof value === "function" ? value.bind(target) : value;
    },
  }) as ReturnType<typeof postgres>;
}

const client = makeClient();

export const db = drizzle(client, { schema });
export { schema };
