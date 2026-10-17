# Remetente e ligação com o Resend

Verificação realizada em 17 de outubro de 2026.

## Configuração existente confirmada

- Remetente da aba Emails: `notificacoes@encomendapgcvip.site`.
- O diagnóstico autenticado da dashboard confirmou que a chave respondeu e que `encomendapgcvip.site` está verificado na conta Resend correspondente. Nenhum e-mail foi enviado nessa verificação.
- A zona DNS desse domínio na Hostinger contém `resend._domainkey` e os registos `rsend` e `send` relacionados ao Resend. Nenhum registo DNS foi alterado.
- A ligação existente foi preservada. O domínio que contém Worten não foi ativado como remetente.

## Alteração na dashboard

Configurações passa a mostrar o endereço usado nos envios e o botão Verificar Resend. O contacto de suporte da loja é apresentado como uma configuração diferente: editar o suporte não altera o remetente do provedor. A chave de API continua no servidor.

Os novos comunicados informativos deixam de oferecer campos para links arbitrários. O servidor rejeita também os pedidos antigos ou adulterados com `campaignKind=notice-link`, antes de enviar mensagens ou criar registos de campanha. O histórico já gravado continua disponível.

A validação também rejeita a identidade da Worten nos textos dos comunicados e nos cabeçalhos das notificações de pedido. O remetente autorizado existente, o consentimento, os descadastros, os limites de frequência e as verificações de pedidos reais permanecem em vigor.

O link de cobrança `/pagar/pedidopt` foi pausado durante a revisão. A identificação legal do vendedor continua pendente dos dados reais do responsável; este ajuste não preenche nem presume esses dados.

## Validação

- Suite completa: 564 testes passaram e 11 testes de integração foram ignorados.
- Após a limpeza final do código, os 40 testes dos dois módulos alterados de envio/formulário passaram novamente.
- ESLint, geração de tipos, TypeScript e build de produção concluídos com sucesso.
- Os envios nos testes são simulados. Nenhuma campanha ou mensagem de teste real foi enviada.

Skills aplicadas: marketing-skills, emails, React best practices e Vercel deployments, usando as instalações locais existentes.
