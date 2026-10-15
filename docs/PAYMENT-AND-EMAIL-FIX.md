# Pagamentos Broski e editor de emails

Alteração de 13 de outubro de 2026. Base de clientes atual preservada por solicitação do proprietário.

- O painel atualiza a leitura a cada 10 segundos; Carrinhos, a cada 15 segundos. Dashboard, Carrinhos e Live View consultam pagamentos pendentes na Broski em lotes, a cada minuto enquanto a página está visível.
- A consulta usa a conta que criou cada pagamento e confere ID, referência externa, método, moeda e valor antes de aplicar a resposta. Uma confirmação não pode voltar a pendente por evento atrasado.
- Webhooks assinados e consultas autenticadas usam o mesmo processamento, com deduplicação e bloqueio transacional. Estoque, livro-caixa e notificações são processados após confirmar o pedido, sem atrasar a resposta ao gateway.
- Receita usa a data do pagamento e inclui pedidos em preparação. Pedidos criados continuam contados pela data de criação.
- O editor permite assunto e cabeçalho personalizados. O email usa o layout da referência, com bloco de produto quando o cadastro contém essa informação. Encomenda e cobrança dependem de pedido real verificado.

Verificação: build Next.js e TypeScript concluídos; 91 testes relacionados passaram. O webhook Broski foi configurado para `https://www.suaempresact.site/api/webhooks/broski`, com o segredo existente alinhado na Vercel, sem criar ou rotacionar chaves.

Não houve envio de campanha em massa durante a implementação. O MCP do Resend foi registrado em Codex; sua autenticação OAuth é independente da integração Resend já utilizada pelo site.
