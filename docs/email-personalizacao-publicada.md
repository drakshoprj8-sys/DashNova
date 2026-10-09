# Personalização de e-mail publicada

Publicação verificada em 9 de outubro de 2026: `dpl_DaZdzx3M2TmQCp7zxwWvuikiY9Fr`, estado `READY`.

Os endereços https://easy-steps-quizlovableapp-drak1.vercel.app/emails e https://suaempresacto.site/emails apontam para a mesma versão. Os quatro domínios personalizados já existentes foram preservados e vinculados à publicação.

O editor mantém assunto, prévia, cabeçalho, título, mensagem, texto do botão e checkout. O campo de checkout começa vazio para usar o endereço individual automaticamente. Pode ser preenchido com um checkout publicado que corresponda ao pedido pendente; o servidor valida os pedidos e usa o endereço verificado. Artigo e demais dados reais são preenchidos por destinatário. O novo campo Texto do link alternativo atualiza a prévia e o envio; rejeita links e texto de cobrança. As oito variáveis aparecem no editor. O botão do e-mail é vermelho (`#cc0000`) e o botão de disparo da dashboard também é vermelho.

Verificação: 45 testes de editor, template, validação, ações de envio e checkout passaram; TypeScript e ESLint passaram; compilação de produção concluída pela Vercel. Nos dois endereços, os campos foram conferidos no navegador. Alterações de título e texto alternativo atualizaram a prévia. O padrão foi restaurado após a verificação.

Resend: domínio `encomendapgcvip.site` consta como verified. O teste anterior `01a11e8f-036b-7920-ab97-7d09134c84cf`, remetente `notificacoes@encomendapgcvip.site`, consta como Delivered. Nenhum novo teste ou disparo foi enviado nesta tarefa. No momento da verificação, a dashboard exibia um pedido pendente elegível. A existência de um teste entregue não garante entrega de todas as campanhas nem disponibilidade de cota futura.

As mensagens continuam identificadas como PCCGVIP. As restrições contra identidade de terceiros, afirmações de retenção e cobrança de pedidos já pagos foram preservadas.

Orientações aplicadas: habilidades existentes marketing-skills e emails, incluindo o contexto de produto em `.agents/product-marketing.md`. Não foram instaladas novas habilidades.

Registro visual: `outputs/email-personalizacao-final.jpg`.

## Botão com link editável para novas ofertas

Atualização de 9 de outubro de 2026: `dpl_3BFwqScg7ghssWdVr9MkTGRuZQeU`, estado READY, publicada nos cinco endereços existentes. Esta versão acrescenta o modo de compra opcional aos públicos Todos os clientes e Pedidos pagos.

Selecione o público, marque Incluir botão de nova oferta (compra opcional), preencha Link do botão (nova oferta) e clique Verificar oferta. O link pode ser alterado para outro checkout publicado de produto ativo da loja. Produto, variante padrão, preço e vendedor são resolvidos no servidor e aparecem na prévia. Alterar a URL mantém o público escolhido e exige nova verificação antes do envio. O botão do e-mail é vermelho. A oferta informa que a compra é opcional e independente de pedidos anteriores.

O servidor verifica novamente o checkout e a correspondência do conteúdo ao produto, preço e vendedor no momento do teste ou envio. São aceitos somente os checkouts de catálogo publicados nos domínios existentes da loja, sem parâmetros, fragmentos ou credenciais. Links externos e links de taxas em /pagar/ não fazem parte deste modo. O histórico guarda a oferta verificada separadamente dos comunicados e das notificações de pedido.

A publicação altera seis arquivos de produção: store-offer.ts, store-offer-actions.ts, store-offer-editor.tsx, campaign-form.tsx, actions.ts e campaigns.ts, todos em src/features/emails. Verificação: 87 testes em nove arquivos, TypeScript, ESLint e compilação de produção passaram. No navegador, o checkout Samsung Galaxy A55 5G, variante 256 GB, apresentou 39,99 €, botão vermelho e link correspondente. Todos os clientes exibiu 2.585 destinatários elegíveis; Pedidos pagos exibiu 2.578. Ambos mantiveram a URL e habilitaram o envio após a verificação. Nenhum teste por e-mail ou disparo real foi enviado.

Acesse https://www.suaempresact.site/emails?segment=all. Registro visual: outputs/nova-oferta-link-editavel.jpg. Registro da publicação: outputs/optional-store-offer-deployment.json.

## Todos os clientes — comunicado informativo

Atualização de 9 de outubro de 2026: `dpl_GPzp3q4H3z83H9XkXsbJbfikfawD`, estado READY, publicada nos cinco endereços existentes. Acesse `/emails?segment=all` para selecionar Todos os clientes.

Este público usa os contatos elegíveis da aba Clientes, incluindo pessoas sem pedidos, com deduplicação por e-mail. Bloqueados, descadastrados, suprimidos e endereços inválidos são excluídos. Na conferência do navegador, havia 3.083 clientes na base e 2.585 elegíveis selecionados.

O editor permite preparar um comunicado informativo identificado como PCCGVIP, com assunto, prévia, cabeçalho, título e mensagem. O modelo não inclui checkout, cobrança nem dados de compra. O servidor aplica a mesma validação ao envio normal e ao teste, e as prévias do histórico reconhecem esse modelo.

Verificação: 61 testes em sete arquivos passaram; TypeScript e ESLint passaram; a compilação de produção ficou READY. No navegador, uma mensagem personalizada apareceu na prévia e o botão vermelho exibiu Enviar para 2.585 clientes. O padrão foi restaurado depois da conferência. A dashboard exibia Resend conectado. Nenhum teste ou disparo real foi enviado nesta atualização.

Registro visual: `outputs/todos-clientes-comunicado.jpg`.

## Clientes pagantes e verificação real do Resend

Atualização de 9 de outubro de 2026: `dpl_28E9sz4yNEn4ToArR1QT6o8LPURc`, estado READY, vinculada aos cinco endereços existentes, incluindo `www.suaempresact.site`.

O público Pedidos pagos agora usa o comunicado informativo da PCCGVIP. Antes, a contagem incluía clientes importados classificados como pagos, mas a ação de envio exigia pedido local e pagamento aprovado no gateway. Para comunicados, esses contatos passam a ser resolvidos sem contexto de pedido; o servidor elimina dados de compra e checkout. As notificações de pedidos selecionadas manualmente continuam exigindo pedidos verificados. Não foram ampliadas cobranças para clientes já pagos nem modelos que se apresentam como Correios e alegam retenção de encomendas.

O novo botão Verificar Resend consulta os domínios usando a chave de produção e confirma especificamente o domínio do remetente. O indicador inicial mostra Resend configurado, para não confundir variáveis presentes com conexão efetivamente validada. A consulta em produção retornou: Conexão validada; domínio encomendapgcvip.site verificado. Nenhum e-mail foi enviado.

No navegador, Pedidos pagos exibiu 2.578 destinatários e Todos os clientes exibiu 2.585, com ambos os botões habilitados. A mensagem personalizada de clientes pagantes apareceu na prévia, sem informações de pedido ou checkout. Os registros antigos de lote no Resend exibiam erro 403 de domínio não verificado; os testes individuais posteriores tiveram resposta 200. Não foi repetida nenhuma campanha antiga.

Verificação: 73 testes em oito arquivos, TypeScript, ESLint e compilação de produção passaram. Nenhum teste por e-mail ou disparo real foi enviado nesta atualização. Registros visuais: `outputs/resend-conexao-validada.jpg` e `outputs/todos-clientes-resend-validado.jpg`. Os testes locais simulam o provedor; a consulta de conexão não comprova entrega futura ou cota para o lote inteiro.

## Campo de URL editável

Atualização de 9 de outubro de 2026: `dpl_8gUz5YBAmzZ7kZeV2nPvPKXxS7Ay`, estado READY, vinculada aos mesmos cinco endereços. O campo Link individual do pedido, que mostrava `{{CHECKOUT_URL}}`, agora aceita edição. Ao colar uma URL, o formulário muda para checkout e seleciona o público pendente; em uma seleção manual, preserva os selecionados e muda apenas o modo. Voltar ao acompanhamento de pedidos pagos limpa a URL de checkout. O servidor continua exigindo correspondência com os pedidos pendentes e usa o endereço verificado.

Verificação: 38 testes passaram, TypeScript e ESLint passaram. No navegador, o campo no modo de pedidos pagos apresentou `readOnly: false`; colar a URL do checkout selecionou Pagamento pendente e manteve o endereço preenchido. A prévia mostrou o mesmo checkout no botão. Nenhum e-mail foi enviado. Registro: `outputs/link-email-editavel.jpg`.
