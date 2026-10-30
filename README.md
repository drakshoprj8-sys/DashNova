# Infinity — Central de vendas online

Plataforma de gestão de vendas: checkout, loja, landing pages, pagamentos
(MB WAY / Multibanco), carrinhos abandonados, clientes, campanhas de e-mail,
pixels, analytics em tempo real e financeiro.

> Nome provisório — altere em `src/lib/brand.ts` para renomear a marca em toda a aplicação.

## Stack

- Next.js 16 (App Router) · React 19 · TypeScript strict · Tailwind CSS 4
- Supabase (PostgreSQL, Auth, Storage, Realtime, RLS) · Drizzle ORM
- Radix UI (estilo shadcn/ui) · Recharts · Zod · Monaco Editor
- Broski (pagamentos) · Resend (e-mail) · Upstash Redis · Vercel

> **Atenção:** o Next.js 16 tem breaking changes (`params`/`cookies()` assíncronos,
> `src/proxy.ts` no lugar de `middleware.ts`, sem `next lint`). Veja
> [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) e `node_modules/next/dist/docs/`.

## Começando

Requisitos: **Node.js 24.x** (definido em `engines`).

```bash
npm install
cp .env.example .env.local   # preencha as credenciais (ver docs/DEPLOY.md)
npm run dev                  # http://localhost:3000
```

### Modo demonstração

Para explorar o painel sem Supabase, deixe as variáveis do Supabase vazias e
defina `ALLOW_DEMO_MODE=true` em `.env.local`. O painel abre com banner
permanente e dados fictícios rotulados (`src/features/dashboard/demo-snapshot.ts`).

Sem essa flag — e **sempre em produção** — o painel exige login. Nada finge
estar conectado: integrações sem credenciais aparecem como "Desconectado".

## Variáveis de ambiente

A lista completa está em [.env.example](.env.example); o passo a passo em
[docs/DEPLOY.md](docs/DEPLOY.md).

| Grupo | Variáveis | Obrigatório |
|---|---|---|
| Aplicação | `NEXT_PUBLIC_APP_URL`, `PANEL_HOST`, `OWNER_EMAILS` | Sim (`OWNER_EMAILS` é a allowlist de quem entra no painel) |
| Identidade legal | `NEXT_PUBLIC_COMPANY_*` | Sim, para liberar vendas |
| Supabase | `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `DATABASE_URL`, `DIRECT_URL` | Sim |
| Segurança | `ENCRYPTION_KEY` (`openssl rand -base64 32`), `CRON_SECRET`, `UPSTASH_REDIS_*` | Sim |
| Pagamentos | `BROSKI_API_KEY`, `BROSKI_WEBHOOK_SECRET` | Para receber pagamentos |
| E-mail | `RESEND_API_KEY`, `RESEND_FROM_EMAIL`, `RESEND_WEBHOOK_SECRET` | Para enviar e-mails |
| Opcionais | `VERCEL_TOKEN`/`VERCEL_TEAM_ID` (landings externas), `MILLUNI_*`, `META_GRAPH_API_VERSION` | Não |

Nunca faça commit de `.env.local`.

## Scripts

| Comando | Descrição |
|---|---|
| `npm run dev` | Servidor de desenvolvimento (Turbopack) |
| `npm run build` / `npm start` | Build e servidor de produção |
| `npm run lint` | ESLint em `src` |
| `npm run typecheck` | `next typegen` + `tsc --noEmit` |
| `npm run format` / `format:check` | Prettier |
| `npm test` / `npm run test:watch` | Testes Vitest |
| `npm run db:generate` | Gerar migrations a partir do schema Drizzle |
| `npm run db:migrate` | Aplicar migrations no banco |
| `npm run db:studio` | Abrir o Drizzle Studio |

Os comandos `db:*` instalam o `drizzle-kit` isoladamente em `tools/drizzle`
na primeira execução e usam `DIRECT_URL`.

### Antes de abrir um PR / fazer deploy

```bash
npm run lint && npm run typecheck && npm test && npm run build
```

## Testes

- `tests/unit/` — testes unitários (jsdom), rodam em qualquer máquina.
- `tests/integration/` — leem o banco real; só correm se `DATABASE_URL` ou
  `DIRECT_URL` estiver definido, caso contrário são ignorados. Não escrevem dados.

## Estrutura

```
src/
  app/
    (auth)/            # login, cadastro, recuperação de senha
    (painel)/          # painel privado: dashboard, pedidos, clientes, campanhas,
                       # e-mails, carrinhos, catálogo, financeiro, pixel, editor…
    checkout/[slug]    # checkout público
    p/, lp/, pagar/    # páginas de produto, landing pages e links de pagamento
    obrigado/, acompanhar/[token]   # pós-compra e rastreio do pedido
    legal/             # termos, privacidade, devoluções, envios, cookies
    api/               # route handlers (webhooks, cron, APIs internas e públicas)
  features/            # lógica de negócio por domínio
  payment-providers/   # interface PaymentProvider + adapter Broski
  database/            # schema Drizzle e migrations
  components/, lib/, validations/
  proxy.ts             # proteção de rotas e separação painel/loja por host
landing-sites/         # landings estáticas hospedadas fora do painel
scripts/               # scripts pontuais de manutenção
tests/                 # Vitest (unit + integration)
```

## Integrações e tarefas agendadas

| O quê | Onde |
|---|---|
| Webhook de pagamentos Broski | `POST /api/webhooks/broski` — ver [docs/PAYMENTS.md](docs/PAYMENTS.md) |
| Webhook de eventos Resend | `POST /api/webhooks/resend` — ver [docs/DEPLOY.md](docs/DEPLOY.md) |
| Cron UTMify (diário, 03:00 UTC) | `/api/cron/utmify`, agendado em `vercel.json` |
| Sincronização de clientes Milluni (a cada 5 min) | `/api/cron/milluni-customers`, disparado por `.github/workflows/milluni-customers-sync.yml` — ver [docs/MILLUNI.md](docs/MILLUNI.md) |

As rotas de cron exigem `Authorization: Bearer $CRON_SECRET`.

## Deploy

Deploy na Vercel com banco no Supabase. Siga [docs/DEPLOY.md](docs/DEPLOY.md):
criar o projeto Supabase, configurar variáveis na Vercel, aplicar migrations
(`npm run db:migrate`), configurar webhooks e definir `PANEL_HOST` antes de
apontar domínios de loja.

## Documentação

| Documento | Conteúdo |
|---|---|
| [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) | Arquitetura, princípios e particularidades do Next.js 16 |
| [docs/DATABASE.md](docs/DATABASE.md) | Schema e migrations |
| [docs/DEPLOY.md](docs/DEPLOY.md) | Deploy Vercel + Supabase, domínios, Resend |
| [docs/PAYMENTS.md](docs/PAYMENTS.md) | Gateway Broski, webhooks e reconciliação |
| [docs/PAYMENT-AND-EMAIL-FIX.md](docs/PAYMENT-AND-EMAIL-FIX.md) | Verificação da correção de pagamentos e e-mail |
| [docs/MILLUNI.md](docs/MILLUNI.md) | Sincronização de clientes Milluni |
| [docs/PROGRESS.md](docs/PROGRESS.md) | Status do desenvolvimento por fase |
| [landing-sites/README.md](landing-sites/README.md) | Landings estáticas com projeto próprio na Vercel |

## Princípios do projeto

- Toda integração passa por um adapter (`PaymentProvider`, provedor de e-mail etc.).
- Toda entidade de negócio tem `workspace_id`; o isolamento é garantido por RLS.
- Dinheiro em centavos (`bigint`) + `currency`; formatação só na UI (`src/lib/format.ts`).
- Webhooks e pagamentos são idempotentes (deduplicação por id de evento externo).
- Credenciais criptografadas com `ENCRYPTION_KEY`; segredos nunca vão para o frontend.
