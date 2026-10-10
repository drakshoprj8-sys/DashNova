# Notificações de pedidos — PCCGVIP

Modelo padrão publicado em 8 de outubro de 2026. A página de notificações está disponível em https://easy-steps-quizlovableapp-drak1.vercel.app/emails e exige login. O editor permite combinar opções de texto da PCCGVIP com prévia ao vivo; veja [editor-notificacoes.md](editor-notificacoes.md). Nenhuma campanha foi enviada durante a publicação.

## Identificação

- Nome da loja: PCCGVIP
- Remetente: PCCGVIP <notificacoes@encomendapgcvip.site>

As variáveis entre chaves são preenchidas pelo servidor com dados do pedido. O cabeçalho identifica a PCCGVIP; assunto, pré-visualização, título, saudação, texto do pedido, apoio e despedida têm opções publicadas. A caixa Mensagem mostra o resultado dessas escolhas e não aceita texto livre. O modelo não inclui botão nem site.

## Mensagem

Assunto: PCCGVIP — informações do pedido {{PEDIDO}}

Pré-visualização: Referência, artigo e valor registados no seu pedido à PCCGVIP.

Nome no cabeçalho: PCCGVIP

Título: Informações do pedido na PCCGVIP

Texto:

Olá {{PRIMEIRO_NOME}},

Somos a equipa da PCCGVIP. Esta mensagem apresenta os dados registados no seu pedido {{PEDIDO}}.

Valor do pedido: {{VALOR}}.

Se precisa de informações, contacte o apoio da nossa loja com a referência do pedido. Se não reconhece a PCCGVIP ou este pedido, desconsidere esta mensagem.

## Uso

O servidor inclui apenas pedidos não importados, não arquivados, sem reembolso ou chargeback, com pagamento aprovado no gateway de produção, valor e moeda correspondentes, data de pagamento e artigo vinculado ao catálogo. Clientes bloqueados ou descadastrados continuam excluídos. A mera classificação de uma planilha como “pago” não autoriza o envio.

Mensagens fora das combinações publicadas e links de pagamento são recusados antes de contactar o provedor, inclusive no modo de teste. O remetente de produção deve ser o endereço indicado acima, sozinho ou com o nome PCCGVIP. Histórico antigo não foi apagado; ele não é reutilizado como modelo de envio nesta versão.
