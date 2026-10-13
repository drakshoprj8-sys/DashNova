-- Despublica, sem apagar dados, a vitrine de demonstração legada que ficou
-- ativa no banco original. O recorte por slug evita tocar em produtos reais.
-- As alterações são reversíveis pelo painel depois que conteúdo, preço,
-- estoque, identidade e domínio forem validados pelo proprietário.
SET lock_timeout = '5s';
--> statement-breakpoint
UPDATE "public"."domains" AS domain
SET
	"is_active" = false,
	"is_primary" = false,
	"updated_at" = now()
WHERE domain."hostname" = 'pcdignetstore.online'
	AND domain."is_active" = true
	AND EXISTS (
		SELECT 1
		FROM "public"."products" AS product
		WHERE product."id" = domain."product_id"
			AND product."workspace_id" = domain."workspace_id"
			AND product."slug" = 'cadeira-gaming-alpha-gamer-nebula'
	);
--> statement-breakpoint
UPDATE "public"."landing_pages" AS landing_page
SET
	"status" = 'draft',
	"scheduled_publish_at" = NULL,
	"updated_at" = now()
WHERE landing_page."product_id" IN (
	SELECT product."id"
	FROM "public"."products" AS product
	WHERE product."slug" = 'cadeira-gaming-alpha-gamer-nebula'
		AND EXISTS (
			SELECT 1
			FROM "public"."domains" AS target_domain
			WHERE target_domain."product_id" = product."id"
				AND target_domain."workspace_id" = product."workspace_id"
				AND target_domain."hostname" = 'pcdignetstore.online'
		)
)
	AND landing_page."status" = 'published'
	AND landing_page."deleted_at" IS NULL;
--> statement-breakpoint
UPDATE "public"."checkouts" AS checkout
SET
	"status" = 'draft',
	"updated_at" = now()
WHERE checkout."status" = 'published'
	AND checkout."deleted_at" IS NULL
	AND (
		checkout."main_product_id" IN (
			SELECT product."id"
			FROM "public"."products" AS product
			WHERE product."slug" = 'cadeira-gaming-alpha-gamer-nebula'
				AND EXISTS (
					SELECT 1
					FROM "public"."domains" AS target_domain
					WHERE target_domain."product_id" = product."id"
						AND target_domain."workspace_id" = product."workspace_id"
						AND target_domain."hostname" = 'pcdignetstore.online'
				)
		)
		OR EXISTS (
			SELECT 1
			FROM "public"."checkout_products" AS checkout_product
			JOIN "public"."products" AS product
				ON product."id" = checkout_product."product_id"
			WHERE checkout_product."checkout_id" = checkout."id"
				AND product."slug" = 'cadeira-gaming-alpha-gamer-nebula'
				AND EXISTS (
					SELECT 1
					FROM "public"."domains" AS target_domain
					WHERE target_domain."product_id" = product."id"
						AND target_domain."workspace_id" = product."workspace_id"
						AND target_domain."hostname" = 'pcdignetstore.online'
				)
		)
	);
--> statement-breakpoint
UPDATE "public"."products"
SET
	"status" = 'draft',
	"updated_at" = now()
WHERE "slug" = 'cadeira-gaming-alpha-gamer-nebula'
	AND "status" = 'active'
	AND "deleted_at" IS NULL
	AND EXISTS (
		SELECT 1
		FROM "public"."domains" AS target_domain
		WHERE target_domain."product_id" = "products"."id"
			AND target_domain."workspace_id" = "products"."workspace_id"
			AND target_domain."hostname" = 'pcdignetstore.online'
	);
--> statement-breakpoint
RESET lock_timeout;
