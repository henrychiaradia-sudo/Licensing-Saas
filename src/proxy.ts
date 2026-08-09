import { NextResponse, type NextRequest } from "next/server";
import { jwtVerify } from "jose";

// Next.js 16: o antigo `middleware.ts` passou a se chamar `proxy.ts`.
// Faz duas coisas por requisição:
//  1) Checagem otimista de sessão (só lê o cookie — sem acesso a banco aqui).
//  2) Content-Security-Policy baseada em nonce (proteção contra XSS/clickjacking).

const SECRET = new TextEncoder().encode(process.env.AUTH_SECRET || "dev-secret-change-me-in-prod");
const PUBLIC_PATHS = ["/login", "/cadastro", "/verificar"];

/**
 * CSP por requisição. O nonce autoriza os <script> do Next e o script inline de tema.
 * `strict-dynamic` deixa o loader confiável do Next carregar os chunks.
 * `style-src 'unsafe-inline'`: exigido pelos estilos inline do React/Next (nonce não
 * cobre atributo `style`). `img-src ... https:`: imagens de produto vêm de host externo.
 */
function buildCsp(nonce: string): string {
  return [
    `default-src 'self'`,
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'`,
    `style-src 'self' 'unsafe-inline'`,
    `img-src 'self' data: blob: https:`,
    `font-src 'self'`,
    `connect-src 'self'`,
    `object-src 'none'`,
    `base-uri 'self'`,
    `form-action 'self'`,
    `frame-ancestors 'none'`,
    `upgrade-insecure-requests`,
  ].join("; ");
}

/** Segue o fluxo propagando o nonce ao Next (header da requisição) e aplicando a CSP. */
function nextWithCsp(req: NextRequest, nonce: string, csp: string): NextResponse {
  const requestHeaders = new Headers(req.headers);
  requestHeaders.set("x-nonce", nonce);
  requestHeaders.set("Content-Security-Policy", csp);
  const res = NextResponse.next({ request: { headers: requestHeaders } });
  res.headers.set("Content-Security-Policy", csp);
  return res;
}

export default async function proxy(req: NextRequest) {
  const nonce = btoa(crypto.randomUUID());
  const csp = buildCsp(nonce);
  const { pathname } = req.nextUrl;

  const loginUrl = req.nextUrl.clone();
  loginUrl.pathname = "/login";
  const redirectToLogin = () => {
    const res = NextResponse.redirect(loginUrl);
    res.headers.set("Content-Security-Policy", csp);
    return res;
  };

  // Capa de entrada (raiz) e rotas públicas não exigem sessão.
  if (pathname === "/" || PUBLIC_PATHS.some((p) => pathname.startsWith(p))) {
    return nextWithCsp(req, nonce, csp);
  }

  const token = req.cookies.get("alc_session")?.value;
  if (!token) return redirectToLogin();
  try {
    await jwtVerify(token, SECRET, { algorithms: ["HS256"] });
    return nextWithCsp(req, nonce, csp);
  } catch {
    return redirectToLogin();
  }
}

export const config = {
  // Pula assets estáticos, API e requisições de prefetch (evita nonce obsoleto em RSC cacheado).
  matcher: [
    {
      source: "/((?!api|_next/static|_next/image|favicon.ico).*)",
      missing: [
        { type: "header", key: "next-router-prefetch" },
        { type: "header", key: "purpose", value: "prefetch" },
      ],
    },
  ],
};
