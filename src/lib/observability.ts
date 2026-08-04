/**
 * Observabilidade / monitoramento de erros — sem dependência de SDK.
 *
 * `reportError` faz duas coisas:
 *  1) Sempre registra o erro de forma estruturada no console → aparece nos
 *     Runtime Logs da Vercel (visibilidade imediata, sem nenhuma configuração).
 *  2) Se `SENTRY_DSN` estiver definido, encaminha o evento ao Sentry via HTTP
 *     (protocolo de "envelope") — sem o pacote @sentry/nextjs, portanto sem
 *     plugin de build e sem conflito com o Turbopack do Next 16.
 *
 * Ativação do Sentry: defina `SENTRY_DSN` na Vercel (Project → Settings →
 * Environment Variables) com o DSN do seu projeto Sentry e refaça o deploy.
 * Sem a chave, nada quebra — os erros continuam nos logs da Vercel.
 */

export type ErrorContext = {
  route?: string;
  method?: string;
  digest?: string;
  runtime?: string;
  [key: string]: unknown;
};

export async function reportError(error: unknown, context: ErrorContext = {}): Promise<void> {
  const err =
    error instanceof Error
      ? error
      : new Error(typeof error === "string" ? error : "Erro desconhecido");

  // 1) Log estruturado (Runtime Logs da Vercel).
  try {
    console.error(
      `[app-error] ${err.message}${context.route ? ` @ ${context.route}` : ""}`,
      { stack: err.stack, ...context },
    );
  } catch {
    /* logar nunca pode gerar erro */
  }

  // 2) Encaminhamento ao Sentry (best-effort; jamais propaga exceção).
  const dsn = process.env.SENTRY_DSN;
  if (dsn) {
    try {
      await sendSentryEvent(dsn, err, context);
    } catch {
      /* reportar um erro não pode, ele próprio, derrubar a requisição */
    }
  }
}

type ParsedDsn = { protocol: string; host: string; projectId: string; publicKey: string };

function parseDsn(dsn: string): ParsedDsn | null {
  try {
    const u = new URL(dsn);
    const projectId = u.pathname.replace(/^\/+/, "");
    if (!u.hostname || !u.username || !projectId) return null;
    return {
      protocol: u.protocol.replace(":", "") || "https",
      host: u.host,
      projectId,
      publicKey: u.username,
    };
  } catch {
    return null;
  }
}

function buildStacktrace(err: Error): { frames: { function: string }[] } | undefined {
  if (!err.stack) return undefined;
  // Sentry espera os frames do mais externo para o mais interno (ordem inversa da stack).
  const frames = err.stack
    .split("\n")
    .slice(1)
    .map((line) => ({ function: line.trim() }))
    .filter((f) => f.function.length > 0)
    .reverse();
  return frames.length ? { frames } : undefined;
}

async function sendSentryEvent(dsn: string, err: Error, context: ErrorContext): Promise<void> {
  const d = parseDsn(dsn);
  if (!d) return;

  const eventId = crypto.randomUUID().replace(/-/g, "");
  const nowMs = Date.now();
  const endpoint = `${d.protocol}://${d.host}/api/${d.projectId}/envelope/`;

  const event = {
    event_id: eventId,
    timestamp: nowMs / 1000,
    platform: "node",
    level: "error",
    environment: process.env.VERCEL_ENV ?? process.env.NODE_ENV ?? "production",
    release: process.env.VERCEL_GIT_COMMIT_SHA || undefined,
    server_name: "alianza",
    exception: {
      values: [{ type: err.name || "Error", value: err.message, stacktrace: buildStacktrace(err) }],
    },
    tags: { runtime: context.runtime ?? "server" },
    extra: context,
  };

  const envelope =
    JSON.stringify({ event_id: eventId, sent_at: new Date(nowMs).toISOString(), dsn }) +
    "\n" +
    JSON.stringify({ type: "event" }) +
    "\n" +
    JSON.stringify(event) +
    "\n";

  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 2500);
  try {
    await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-sentry-envelope",
        "X-Sentry-Auth": `Sentry sentry_version=7, sentry_client=alianza/1.0, sentry_key=${d.publicKey}`,
      },
      body: envelope,
      signal: ctrl.signal,
    });
  } finally {
    clearTimeout(timer);
  }
}
