# Aurora Licensing Cloud — Plataforma de Brand Licensing

Aplicação **Next.js (App Router)** das **Fases 1–2** da plataforma de Licenciamento, Procurement & Commercial Operations. Ligada ao **Supabase (PostgreSQL)** via **Drizzle ORM**.

> Fictício e genérico, padrão enterprise. Nenhum dado real de empresas.

## Stack

- **Next.js 16** (App Router, Server Actions) + **React 19** + **TypeScript**
- **Tailwind CSS v4**
- **Drizzle ORM** + **postgres.js** → **Supabase (PostgreSQL)**
- **Auth**: sessão JWT via `jose` + `bcryptjs` (proxy de proteção de rotas) — trocável por Auth.js/Clerk
- **Zod** + **React Hook Form** (validação de formulários)
- **lucide-react** (ícones)

## O que está entregue (Fases 1–2)

- Autenticação (login/logout) com sessão assinada e proteção de rotas (`src/proxy.ts`).
- **Multi-tenant** — todo dado é escopado por `tenant_id`.
- **RBAC/ABAC** — papéis e permissões vindos do banco; permissões carregadas na sessão.
- **Layout enterprise** — sidebar por módulos, topbar, **modo claro/escuro**, responsivo.
- **Licenciados** — listar, buscar, **criar** e **editar**, gravando no Supabase.
- **Marcas & IP** — listar, **criar** e **editar** propriedades intelectuais.
- **Aprovação de Produtos** — lista com progresso e detalhe com **workflow de 8 alçadas** + ação de aprovar a etapa atual.
- **Biblioteca Digital (DAM)** — grid de ativos com **registro de download** (trilha `asset_download`).
- **Dashboard** com indicadores lidos do banco.

## Rodando localmente

1. Instale as dependências:
   ```bash
   npm install
   ```
2. Configure o ambiente — copie `.env.example` para `.env.local` e preencha:
   ```bash
   cp .env.example .env.local
   ```
   - `DATABASE_URL` / `DIRECT_URL`: painel do Supabase → **Settings → Database** (use o pooler, porta 6543, e coloque a senha do banco).
   - `AUTH_SECRET`: `openssl rand -base64 32`.
3. Suba a aplicação:
   ```bash
   npm run dev
   ```
4. Acesse `http://localhost:3000` e faça login:
   - **admin@novasport.com** / **aurora123**

## Banco de dados

O schema (núcleo + Fase 2) já está aplicado no Supabase do projeto. O schema Drizzle
correspondente ao que a app usa está em `src/lib/db/schema.ts`. Para sincronizar novas
tabelas conforme as próximas fases:

```bash
npm run db:pull     # introspecta o banco e atualiza o schema Drizzle
npm run db:studio   # abre o Drizzle Studio
```

## Scripts

| Script | O que faz |
|---|---|
| `npm run dev` | Ambiente de desenvolvimento |
| `npm run build` | Build de produção |
| `npm run start` | Sobe o build |
| `npm run lint` | ESLint |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run db:pull` / `db:push` / `db:studio` | Drizzle Kit |

## Estrutura

```
src/
  proxy.ts                 # proteção de rotas (Next 16: era middleware.ts)
  app/
    login/                 # tela e ação de login
    (app)/                 # área autenticada (layout com sidebar/topbar)
      dashboard/
      licenciados/         # lista, novo, [id] (editar), actions, schema, form
  components/
    ui.tsx                 # Button, Input, Card, Badge, Select...
    shell/                 # sidebar, topbar, theme-toggle
  lib/
    db/                    # client Drizzle (index.ts) + schema (schema.ts)
    data/                  # camada de acesso a dados (licensees.ts)
    auth.ts, session.ts    # autenticação e sessão
    rbac.ts, utils.ts
```

## Enviando para o GitHub

Dentro da pasta do projeto:

```bash
git init
git add .
git commit -m "feat: Fase 1 — fundação (auth, multi-tenant, RBAC, Licenciados)"
git branch -M main
git remote add origin https://github.com/<sua-conta>/<seu-repo>.git
git push -u origin main
```

> `.env` / `.env.local` estão no `.gitignore` — suas credenciais não vão para o repositório.

## Deploy (Vercel)

Importe o repositório na Vercel, configure as mesmas variáveis de ambiente
(`DATABASE_URL`, `DIRECT_URL`, `AUTH_SECRET`) e faça o deploy. O build (`next build`)
já foi validado.

## Próximas fases

Fase 3 — Contratos, Royalties, Financeiro · Fase 4 — Procurement & Sourcing ·
Fase 5+ — Compliance, Auditoria, BI. O modelo de dados dessas fases já existe no
banco; cada fase adiciona as telas e a camada Drizzle correspondente.
