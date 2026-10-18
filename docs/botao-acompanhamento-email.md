# Botão de acompanhamento nos e-mails

Implementado em 18 de outubro de 2026.

Na aba Emails, o editor de comunicados oferece **Incluir botão de acompanhamento do pedido**. Ao ativar, aparece o campo **Texto do botão de acompanhamento**, com o padrão “Acompanhar pedido”. Exemplos de personalização: “Ver o meu pedido” e “Acompanhar encomenda”. O modo de oferta fica separado do acompanhamento.

O endereço não é preenchido manualmente. No envio, o servidor consulta o pedido do próprio destinatário, confirma o pagamento aprovado em produção, a ligação ao artigo do catálogo e a ausência de importação, arquivamento, reembolso ou chargeback. Contactos sem um pedido elegível ficam excluídos. O público Sem pedidos não oferece acompanhamento.

Cada botão aponta para `/acompanhar/<token>`, com um token individual assinado e validade de 30 dias. A página apresenta as informações do pedido e não solicita novo pagamento. O texto do botão e o conteúdo continuam sujeitos às validações da loja; URLs livres, checkouts e textos de cobrança não são aceites neste modo.

A prévia usa dados demonstrativos e um endereço reservado em `example.invalid`, sem expor o pedido de um cliente. O histórico também utiliza uma prévia demonstrativa. Mensagens de teste não recebem links de pedidos reais.

Os testes de envio utilizam mocks do provedor. Nenhum e-mail real foi enviado durante o desenvolvimento ou a verificação.
