import type { NextConfig } from "next";

/**
 * Headers de segurança estáticos aplicados a todas as respostas.
 * - X-Frame-Options: anti-clickjacking (a CSP `frame-ancestors 'none'` reforça em navegadores modernos).
 * - X-Content-Type-Options: impede MIME sniffing.
 * - Referrer-Policy / Permissions-Policy: reduz vazamento e superfície.
 * - HSTS: força HTTPS (seguro na Vercel).
 * A Content-Security-Policy (baseada em nonce) é definida por requisição no middleware,
 * portanto NÃO fica aqui — evitando um header CSP duplicado/conflitante.
 */
const securityHeaders = [
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
];

const nextConfig: NextConfig = {
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
};

export default nextConfig;
