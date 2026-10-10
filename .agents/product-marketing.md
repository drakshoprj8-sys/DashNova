# Product marketing context

_Versão 1 — 2026-10-03_

## Produto

Infinity é a identidade da plataforma administrativa. A marca pública de cada loja pertence ao comerciante e deve sempre vir da configuração do workspace ou do snapshot publicado da landing page.

O produto reúne operação de vendas, catálogo, pedidos, clientes, pagamentos, relatórios e páginas públicas para operadores de ecommerce em português. Hoje, o fluxo de pagamentos confirmado no código usa MB WAY e Multibanco por meio da Broski.

## Estado real

- A arquitetura contém workspaces, mas partes relevantes ainda usam um workspace padrão. Não afirmar isolamento multi-tenant até que todos os acessos sejam protegidos por membership e testados.
- “Live view” usa polling; não chamar de Supabase Realtime.
- Dados de demonstração precisam ser explicitamente fictícios e nunca podem aparecer como faturação real.
- Funcionalidades placeholder devem permanecer fora da navegação até estarem operacionais.

## Público e proposta de valor

Público principal: donos e operadores de ecommerce que precisam acompanhar vendas e executar tarefas diárias com rapidez. A interface deve priorizar leitura imediata, confiança nos números e ações operacionais claras.

## Voz e regras de conteúdo

- Direta, sóbria, operacional e honesta.
- Não inventar prova social, escassez, avaliações, integrações, estados de pagamento ou benefícios.
- Não publicar dados legais incompletos nem aceitar encomendas quando a identificação do comerciante estiver ausente.
- Não usar marcas, logotipos ou ativos de terceiros como fallback.
- Separar com clareza identidade da plataforma e identidade da loja.

## Evidência e lacunas

Contexto derivado do código e da auditoria técnica do projeto em 2026-10-03. Razão social, identificação fiscal, endereço comercial, mercado alvo definitivo e posicionamento comercial ainda precisam ser fornecidos pelo proprietário antes de uma loja pública real entrar em produção.
