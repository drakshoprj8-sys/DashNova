# E-mail de confirmação de pedido

Modelo honesto de atualização/confirmação de pedido para o editor de
notificações (`src/features/emails/notification-editor.tsx`). Usa a mesma
infraestrutura e as mesmas travas já existentes; nenhuma proteção foi removida.

## O que foi adicionado

- **Variações de estado** em `notification-content.ts`
  (`MESSAGE_OPTIONS.introduction`), todas verídicas, mantendo a identificação
  obrigatória da loja e sem links, cobrança ou alegação de retenção:
  - "Confirmação do pedido" — pedido confirmado.
  - "Estado do pedido" — usa `{{STATUS}}` (estado real do pedido).
  - "Pedido em preparação", "Pedido enviado", "Pedido entregue".
- **Status de envio real**: nova variável `{{STATUS}}` em `template.ts`,
  preenchida pelo servidor a partir do estado do pedido verificado
  (`actions.ts` → `templateVars`, usando `STATUS_LABEL` de
  `orders/status.ts`). Não pode ser forjada pelo editor. Também disponível
  como chip clicável no editor.
- **Visual do e-mail verdadeiro** melhorado em `buildCampaignHtml`: card com
  cantos arredondados e sombra, tipografia do sistema, selo de estado (pill),
  caixa de dados do pedido com borda e botão com raio e espaçamento maiores —
  mantendo HTML compatível com clientes de e-mail (tabelas + CSS inline) e o
  acento vermelho (`#cc0000`).
- Sugestões de **assunto** ("PCCGVIP — pedido {{PEDIDO}} confirmado") e
  **título** ("Confirmação do seu pedido na PCCGVIP") em `NOTIFICATION_OPTIONS`.
- **Preset padrão de atualização de pedido** (`ORDER_UPDATE_PREFERENCES`): o
  editor de notificação de pedido já abre com a introdução "Estado do pedido"
  selecionada e o botão "Acompanhar o meu pedido" preenchido
  (`campaign-form.tsx`). "Restaurar padrão" volta ao modelo base original.
- Prévia renderizada com a função real de envio (`buildCampaignHtml`) em
  `outputs/confirmacao-pedido-preview.html` (dados fictícios, estado "Enviado").

## Botão de redirecionamento

O botão usa `{{CHECKOUT_URL}}`, que o servidor substitui por destinatário
(`actions.ts` → `templateVars`):

- **Pedidos pagos**: resolve para a página real de acompanhamento do pedido,
  `/acompanhar/<token>` (token HMAC assinado, expira em 30 dias) — status do
  pedido, sem pagamento.
- **Pedidos pendentes reais**: resolve para o checkout verificado que
  corresponde ao pedido daquele cliente; um link `/checkout/` ou `/pagar/`
  colado só é aceito se corresponder ao pedido pendente real do destinatário
  (`checkout-url-constraint.ts`).

O texto do botão (`ctaLabel`) é livre, até 60 caracteres, desde que fale em
ver/acompanhar o pedido e não contenha cobrança ou link. Ex.: "Acompanhar o
meu pedido".

## Travas preservadas

- Corpo restrito às mensagens compostas da loja (`SUPPORTED_NOTIFICATION_BODIES`),
  com a nota livre validada sem links, cobrança ("pagar/pagamento/taxa") nem
  retenção ("retido/retida/bloqueado/suspenso/libertar").
- Assunto, pré-visualização, título, cabeçalho e texto alternativo não aceitam
  links nem "Correios/CTT".
- Remetente fixo `notificacoes@encomendapgcvip.site`; envio só para pedidos
  verificados (pagamento aprovado no gateway de produção, artigo do catálogo,
  destinatário elegível), com deduplicação e proteção contra disparo duplicado.
- O cabeçalho é texto livre para o nome da loja/equipe, mas continua bloqueando
  "Correios/CTT" e links.

## Verificação

- `vitest run`: 552 testes passaram, 11 ignorados (integração que exige banco).
  Inclui 127 testes de e-mail/notificação/template e dois testes novos de
  política (confirmação aceita com botão de acompanhamento; recusa ao
  transformar a confirmação em pedido de pagamento ou alegação de retenção).
- `tsc --noEmit` e `eslint` dos arquivos alterados: sem erros.
- Não foi executado `next build` de produção nem envio real de e-mail.
