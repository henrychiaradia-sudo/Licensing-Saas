import type { Metadata } from "next";
import { headers } from "next/headers";
import { GeistSans } from "geist/font/sans";
import "./globals.css";
import { CookieConsent } from "@/components/cookie-consent";

export const metadata: Metadata = {
  title: "ALIANZA — Brand Licensing Platform",
  description: "The Operating System for Brand Licensing",
};

const themeScript = `try{var t=localStorage.getItem('theme');if(t==='dark'||(!t&&window.matchMedia('(prefers-color-scheme:dark)').matches)){document.documentElement.classList.add('dark')}}catch(e){}`;

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  // Nonce da CSP (definido pelo middleware) para autorizar o script inline de tema.
  const nonce = (await headers()).get("x-nonce") ?? undefined;
  return (
    <html lang="pt-BR" className={GeistSans.variable} suppressHydrationWarning>
      <head>
        <script nonce={nonce} dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className="bg-slate-50 text-slate-900 antialiased dark:bg-[#081221] dark:text-slate-100">
        {children}
        <CookieConsent />
      </body>
    </html>
  );
}
