# Editor de notificações da PCCGVIP

O editor usa duas colunas: personalização à esquerda e prévia ao vivo à direita. Em ecrãs pequenos, a prévia aparece abaixo dos campos.

Pode escrever assunto, texto de pré-visualização, nome do cabeçalho e título diretamente. As opções de saudação, texto do pedido, apoio, despedida e valor ficam recolhidas em “Opções do pedido”. “Restaurar padrão” repõe todas as escolhas.

O campo “Mensagem” aceita uma nota livre de até 800 caracteres e a prévia mostra essa nota junto dos dados verificados do pedido. “Nome no cabeçalho” também pode ser editado, mantendo PCCGVIP para identificar a loja. O artigo e os dados do pedido são preenchidos pelo servidor. O envio não inclui links de pagamento. Os botões de envio ficam desativados quando algum campo não passa pela validação.

O servidor aceita as combinações publicadas e uma nota livre sem links nem pedidos de pagamento, inclusive nos testes de envio. Mantém as verificações dos pedidos locais, pagamento aprovado, artigo do catálogo e destinatários elegíveis. Alterar campos diretamente numa requisição não permite enviar um cabeçalho sem PCCGVIP ou incluir uma ligação de pagamento na nota.

Foram aplicadas as habilidades existentes `marketing-skills`, `copywriting`, `copy-editing` e `emails` em `.claude/skills/marketing-skills/` e `.agents/skills/`. Não foi necessário instalar habilidades adicionais.

Validação local: 31 testes passaram, além da checagem de tipos e do ESLint nos ficheiros alterados.

Publicado em 8 de outubro de 2026 no deployment `dpl_C7KFbSDuxEEehjf75tHuc1fNqgmV`, com estado `READY`. Endereço fixo: https://easy-steps-quizlovableapp-drak1.vercel.app/emails.

Verificação no navegador: assunto e título alteraram a prévia imediatamente; a escolha de despedida apareceu no corpo; ocultar o valor removeu esse parágrafo; restaurar o padrão repôs a mensagem original e o valor. Nenhuma campanha foi enviada nesta verificação.
