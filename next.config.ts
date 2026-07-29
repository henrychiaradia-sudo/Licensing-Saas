import type { NextConfig } from "next";

/**
 * Headers de segurança aplicados a todas as respostas.
 * - frame-ancestors 'none' + X-Frame-Options: proteção contra clickjacking.
 * - X-Content-Type-Options: impede MIME sniffing.
 * - Referrer-Policy / Permissions-Policy: reduz vazamento e superfície.
 * - HSTS: força HTTPS (seguro na Vercel).
 * (CSP mínima: só frame-ancestors, para não quebrar scripts/estilos inline do Next/Tailwind.)
 */
const securityHeaders = [
  { key: "Content-Security-Policy", value: "frame-ancestors 'none'; base-uri 'self'" },
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
