import type { Instrumentation } from "next";
import { reportError } from "@/lib/observability";

/**
 * Hook nativo do Next (App Router): chamado para TODO erro de servidor —
 * renderização SSR/RSC, route handlers e Server Actions. Encaminha ao
 * `reportError` (logs da Vercel + Sentry se configurado). Sem SDK/plugin.
 */
export const onRequestError: Instrumentation.onRequestError = async (err, request, context) => {
  await reportError(err, {
    route: request.path,
    method: request.method,
    runtime: "server",
    routeType: context.routeType,
    routePath: context.routePath,
  });
};
