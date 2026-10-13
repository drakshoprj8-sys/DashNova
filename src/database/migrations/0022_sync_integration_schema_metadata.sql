-- Migração apenas de metadados do Drizzle.
--
-- A 0021 é customizada e reconcilia de forma idempotente os dois estados
-- conhecidos (banco legado ou banco criado pelo journal). Como o Drizzle não
-- consegue inferir o resultado de SQL customizado, este checkpoint avança o
-- snapshot para o schema efetivo sem repetir os CREATE/ALTER já executados.
SELECT 1;
