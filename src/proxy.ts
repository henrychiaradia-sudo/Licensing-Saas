import { NextResponse, type NextRequest } from "next/server";
import { jwtVerify } from "jose";

// Next.js 16: o antigo `middleware.ts` passou a se chamar `proxy.ts`.
// Checagem otimista de sessão (só lê o cookie — sem acesso a banco aqui).

const SECRET = new TextEncoder().encode(process.env.AUTH_SECRET || "dev-secret-change-me-in-prod");
const PUBLIC_PATHS = ["/login"];

export default async function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;
  // Capa de entrada (raiz) e rotas públicas não exigem sessão.
  if (pathname === "/" || PUBLIC_PATHS.some((p) => pathname.startsWith(p))) {
    return NextResponse.next();
  }

  const token = req.cookies.get("alc_session")?.value;
  const loginUrl = req.nextUrl.clone();
  loginUrl.pathname = "/login";

  if (!token) return NextResponse.redirect(loginUrl);
  try {
    await jwtVerify(token, SECRET);
    return NextResponse.next();
  } catch {
    return NextResponse.redirect(loginUrl);
  }
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
};
