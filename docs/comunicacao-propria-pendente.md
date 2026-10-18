# Comunicação da própria loja

Rascunho preparado em 17 de outubro de 2026. Não publicado e não enviado.

## Estado verificado nesta sessão

- O link `/pagar/pedidopt`, que apresentava uma cobrança de 6,99 € para permitir a entrega, foi pausado no painel.
- Após a pausa, o painel mostrou zero links ativos. A página pública apresentou a mensagem de que a cobrança foi desativada.
- A consulta do Resend com os estados Scheduled e Queued, no período Last 15 days, não retornou resultados. Essa consulta não comprova a ausência de envios fora desse período nem em outras contas.
- O novo domínio da Hostinger não foi vinculado ao Resend, e o remetente de produção não foi alterado.
- Não foram enviados testes nem campanhas durante estes ajustes.

Evidência da pausa: `../../references/integration-proof/link-pausado.jpg`.

## Identidade pendente

Nome comercial informado: **notificaçoes.encomendasvip.site**. A indicação desse nome não confirma registro, propriedade ou configuração de um domínio DNS.

Antes de publicar a identidade do vendedor, ainda é necessário fornecer a razão social ou nome legal, a morada comercial completa com código postal e localidade e o endereço de suporte da própria empresa. Os dados fiscais também precisam ser confirmados pelo responsável. Não preencher esses campos com dados presumidos.

## Modelo informativo

Este modelo é uma proposta de conteúdo. Os campos de identificação entre colchetes são pendências editoriais, não variáveis implementadas no envio.

**Remetente:** [nome da loja confirmado] <[endereço de envio confirmado]>

**Responder para:** [endereço de suporte confirmado]

**Assunto:** Informações do pedido {{PEDIDO}}

**Pré-visualização:** Dados registados no seu pedido à [nome da loja confirmado].

**Mensagem:**

Olá {{PRIMEIRO_NOME}},

Esta mensagem apresenta os dados do pedido {{PEDIDO}} realizado na [nome da loja confirmado].

Artigo: {{PRODUTO}}

Valor do pedido: {{VALOR}}

Estado registado: {{STATUS}}

Para esclarecer alguma informação, contacte [endereço de suporte confirmado] e indique a referência do pedido. Se não reconhece esta compra, confirme a origem da mensagem através de um contacto da loja que já conheça.

[razão social ou nome legal confirmado]

[identificação fiscal confirmada]

[morada comercial completa confirmada]

## Uso previsto

O modelo informa o estado real de uma compra identificada do destinatário. Não inclui botão de pagamento, taxa de entrega, alegação de retenção ou identidade da Worten ou dos CTT. Cada variável do pedido deve vir do registo real correspondente; uma lista importada marcada como paga não comprova, por si só, essa compra.

A configuração técnica do novo remetente permanece pendente. Este documento não altera modelos publicados, dados históricos, DNS, credenciais ou a infraestrutura de envio.
