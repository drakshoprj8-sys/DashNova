# Deploy — Infinity

Guia para colocar a plataforma em produção (Vercel + Supabase).

## 1. Criar projeto Supabase

1. Acesse https://supabase.com e crie um projeto.
2. Anote: `Project URL`, `anon key`, `service_role key` (Settings → API).
3. Em Settings → Database, copie as connection strings:
   - **Transaction pooler** (porta 6543) → `DATABASE_URL` (adicione `?pgbouncer=true`)
   - **Direct connection** (porta 5432) → `DIRECT_URL`

## 2. Configurar variáveis locais

```bash
cp .env.example .env.local
```

Preencha ao menos:

```
NEXT_PUBLIC_APP_URL=http://localhost:3000
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...
DATABASE_URL=...
DIRECT_URL=...
ENCRYPTION_KEY=...   # 32 bytes base64: openssl rand -base64 32
PANEL_HOST=painelinfinitydash.online   # ver secção 9
OWNER_EMAILS=dono@exemplo.com          # ver secção 2.1
NEXT_PUBLIC_COMPANY_LEGAL_NAME=...      # ver secção 2.2
NEXT_PUBLIC_COMPANY_TAX_ID=123456789
NEXT_PUBLIC_COMPANY_ADDRESS=...
NEXT_PUBLIC_COMPANY_POSTAL_CODE=1000-001
NEXT_PUBLIC_COMPANY_CITY=Lisboa
NEXT_PUBLIC_COMPANY_EMAIL=apoio@exemplo.pt
```

### 2.1 Restringir o acesso ao painel

O painel é de uso privado. Duas variáveis controlam quem entra:

```
OWNER_EMAILS=dono@exemplo.com,segundo@exemplo.com
ALLOW_DEMO_MODE=
```

`OWNER_EMAILS` é a allowlist obrigatória de donos. A `anon key` do Supabase é pública por
natureza (vai no bundle do browser), então qualquer pessoa pode criar conta
direto na API do Supabase mesmo com o cadastro desativado aqui. Sem allowlist,
essa conta entraria no painel. Com ela, só os e-mails listados recebem sessão —
os demais são recusados no login com "Esta conta não tem acesso ao painel".

Em produção, uma lista vazia nega o acesso ao painel. Defina ao menos um e-mail
antes do deploy; em desenvolvimento a ausência da variável permanece permissiva
somente para facilitar a configuração inicial.

> ⚠️ O e-mail precisa ser o mesmo cadastrado em _Authentication → Users_ do
> Supabase — que **não** é o e-mail da sua conta do site supabase.com. Se não
> baterem, você tranca a si mesmo para fora.

`ALLOW_DEMO_MODE=true` abre o painel **sem login** somente fora de produção,
quando o Supabase não está configurado. A flag é ignorada em produção.

### 2.2 Publicar a identidade legal do vendedor

Preencha todas as variáveis `NEXT_PUBLIC_COMPANY_*` do `.env.example`. São
dados deliberadamente públicos, exibidos nos termos e políticas da loja. O
comércio permanece bloqueado enquanto denominação, NIF/NIPC de 9 dígitos,
morada, código postal português, localidade e e-mail válido estiverem ausentes
ou inválidos. Rascunhos do painel continuam editáveis durante a configuração.

## 3. Executar migrations

Em banco existente, faça backup e valide primeiro em uma branch/staging do
Supabase. A migration `0021_secure_public_schema` também remove os grants da
Data API (`anon`, `authenticated` e `service_role`) sobre o schema `public`;
isso é intencional porque esta aplicação consulta as tabelas pelo servidor.

```bash
npm run db:generate
npm run db:migrate
```

`0022_sync_integration_schema_metadata` é apenas um checkpoint de metadados:
a `0021` é SQL customizado e idempotente, portanto o checkpoint atualiza o
snapshot do Drizzle sem repetir as alterações físicas.

`0023_quarantine_legacy_sample_store` despublica de forma reversível a antiga
vitrine de demonstração e as páginas, checkout e domínio ligados a ela. Não
apaga pedidos nem dados históricos.

> O registro `drizzle.__drizzle_migrations` do banco já está sincronizado com
> os arquivos em `src/database/migrations/`, então `db:migrate` aplica apenas
> o que falta. Se algum dia voltar a divergir, `db:migrate` tenta reaplicar
> migrations antigas e aborta — nesse caso, confira quais estão realmente
> registradas antes de forçar qualquer coisa.

## 4. Configurar autenticação (Supabase)

1. Authentication → Providers → Email: habilitado.
2. Authentication → URL Configuration:
   - Site URL: `https://seu-dominio.com`
   - Redirect URLs: `https://seu-dominio.com/auth/**`
3. Recomendado: manter "Confirm email" ativado.

## 5. Storage

Criar buckets (privados): `product-files`, `product-images` (público), `attachments`, `avatars`.

## 6. Realtime e RLS

- A `0021` habilita RLS em todas as 78 tabelas da aplicação e deixa a Data API
  fechada. Só conceda acesso client-side depois de criar policies explícitas e
  mínimas para a funcionalidade correspondente.
- O Live View atual consulta o servidor; não habilite Realtime por padrão.
- Se o Advisor sinalizar `pg_trgm` no schema `public`, não tente mover a
  extensão pela migration: no Supabase ela pode pertencer a `supabase_admin`.
  Faça essa manutenção somente pelo proprietário da extensão/Suporte do
  Supabase e depois de verificar dependências.
- RLS e grants são mantidos por SQL customizado e não aparecem no snapshot do
  Drizzle. Use migrations; não use `drizzle-kit push` neste projeto.

## 7. Projeto na Vercel

1. Suba o repositório para o GitHub.
2. Importe na Vercel (framework: Next.js — detectado automaticamente).
3. Adicione TODAS as variáveis do `.env.example` com os valores reais.
4. Deploy.

## 8. Pós-deploy

- Configurar domínio próprio na Vercel.
- Configurar webhooks dos gateways apontando para `https://seu-dominio.com/api/webhooks/<gateway>` (rotas criadas na Fase 4).
- Definir `PANEL_HOST` (secção 9) antes de apontar qualquer domínio de loja.
- Configurar Resend:
  1. Verificar o domínio de envio no painel do Resend.
  2. Definir `RESEND_API_KEY` e `RESEND_FROM_EMAIL` na Vercel.
  3. Criar um webhook para `https://seu-dominio.com/api/webhooks/resend`.
  4. Selecionar os eventos `email.sent`, `email.delivered`, `email.opened`,
     `email.clicked`, `email.bounced`, `email.complained`, `email.failed`,
     `email.suppressed` e `email.delivery_delayed`.
  5. Copiar o segredo de assinatura para `RESEND_WEBHOOK_SECRET` na Vercel.
- Validar: login, criação de produto, checkout sandbox (fases correspondentes).

## 9. Domínios próprios das lojas

O painel e as lojas ficam em domínios separados: um bloqueio na loja não
derruba o painel, e nenhum anúncio expõe o endereço administrativo.

1. Defina `PANEL_HOST` com o domínio do painel (sem `https://` e
   sem `www.`). Qualquer outro domínio apontado para a aplicação passa a ser
   tratado como domínio de loja: serve só as rotas públicas (`/`, `/p/`,
   `/checkout/`, `/legal/`, `/api/public`), e o painel redireciona para a raiz.
   **Em branco, tudo se comporta como painel** — nada quebra, mas os domínios
   de loja não funcionam.
2. Na Vercel: projeto → Settings → Domains → Add, com o domínio e o `www`.
3. No registrador do domínio, crie os registros de DNS:

   | Tipo  | Nome  | Valor                                  |
   | ----- | ----- | -------------------------------------- |
   | A     | `@`   | `216.198.79.1`                         |
   | CNAME | `www` | `3d4970c7b04bd998.vercel-dns-017.com.` |

4. No painel, em **Landing pages → Domínios**, cadastre o domínio, escolha o
   produto que ele serve na raiz e clique em **Verificar** — a verificação
   chama `https://<domínio>/api/public/domain-check` e só marca como
   verificado se a própria aplicação responder.

Enquanto o domínio não estiver verificado, `/p/[slug]` continua servindo a
página no domínio do painel. Depois de verificado, esse endereço passa a
redirecionar permanentemente (308) para o domínio da loja.

## Checklist de validação de produção

- [ ] `npm run typecheck` sem erros
- [ ] `npm run lint` sem erros
- [ ] `npm run test` verde
- [ ] `npm run build` concluído
- [ ] Login real funcionando (Supabase configurado)
- [ ] Banner de modo demonstração AUSENTE em produção
