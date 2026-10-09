# Checkout abaixo da mensagem do comunicado

Publicado em produção em 9 de outubro de 2026, após autorização explícita do usuário. Versão final: `dpl_9kjp4q7r5WCtdvnzswigvzdjiuRd`, estado READY. Domínios existentes vinculados: suaempresact.site, www.suaempresact.site, suaempresacto.site e www.suaempresacto.site.

Nos públicos Todos os clientes e Pedidos pagos, os campos Texto do botão, Link do botão e Texto do link alternativo aparecem diretamente abaixo de Mensagem do comunicado. Preencher o campo mantém o público selecionado. A prévia inclui a mensagem personalizada e o botão vermelho com o texto escolhido. O mesmo endereço é usado para todos os destinatários, no lote e no teste.

A implementação aceita URLs HTTP e HTTPS escolhidas pelo usuário, incluindo outros domínios, parâmetros e fragmentos, sem exigir verificação de catálogo. URLs incompletas, esquemas executáveis, credenciais e variáveis de pedido no endereço são rejeitados. A identidade da loja e a indicação de link opcional permanecem no comunicado. Após identificar campanhas anteriores com falsa identidade dos Correios e cobrança de liberação, o usuário autorizou explicitamente bloquear também os links /pagar/ dos domínios da loja nesses comunicados. Checkouts de produtos e páginas permanecem disponíveis. Mantém a validação de conteúdo, bloqueios, descadastros, deduplicação e proteção contra disparos duplicados. Remover o link volta ao comunicado sem botão. O histórico preserva o texto e o endereço usados no envio.

O código foi recuperado da cópia local `../recovered-from-vercel` porque a pasta de trabalho estava sem src, public, tests e as instruções de marketing. A cópia de origem foi preservada.

Validação: 88 testes em sete arquivos passaram, incluindo interação do formulário real para os dois públicos, texto do botão personalizado, URL externa com parâmetros no teste e no lote, remoção do link e rejeição de URLs inseguras. A proteção adicional foi validada em 37 testes relevantes após a alteração. TypeScript, ESLint e compilação passaram. Os envios dos testes são simulados; nenhum e-mail real foi enviado.

No navegador autenticado, a versão final mostrou Texto do botão, Link do botão e Texto do link alternativo para Todos os clientes e Pedidos pagos. Uma URL demonstrativa externa com parâmetro apareceu no botão vermelho e no link alternativo da prévia. O endereço /pagar/ foi rejeitado, com mensagem no formulário e envio desabilitado. A página foi deixada em Todos os clientes, com o link demonstrativo removido. Nenhum envio ou teste real por e-mail foi executado.

Comprovante visual: `outputs/todos-clientes-botao-publicado.png`. Registro do deploy final: `outputs/notice-link-guard-release.json`. O processo preservou todos os outros arquivos de produção e alterou apenas os módulos revisados de e-mail.

Skills aplicadas: marketing-skills e emails, recuperadas em `.claude/skills/marketing-skills` e `.agents/skills/emails`, além das boas práticas de React. O contexto de produto existente foi reutilizado.

Prévia demonstrativa: `outputs/comunicado-checkout-preview.html`. Produto, preço e destinatário da prévia são fictícios.
