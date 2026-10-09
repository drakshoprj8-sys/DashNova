-- Corrige o drift deixado por 0017_wonderful_randall_flagg.sql, que existe no
-- repositório mas nunca foi registrado no journal do Drizzle. Esta migração
-- suporta os dois estados conhecidos e auditados: banco legado com os objetos
-- completos ou banco novo, vazio, criado pelas entradas 0000–0020 do journal.
SET lock_timeout = '5s';
--> statement-breakpoint
DO $$
BEGIN
	IF NOT EXISTS (
		SELECT 1
		FROM pg_type AS enum_type
		JOIN pg_namespace AS namespace ON namespace.oid = enum_type.typnamespace
		WHERE namespace.nspname = 'public'
			AND enum_type.typname = 'integration_delivery_status'
	) THEN
		CREATE TYPE "public"."integration_delivery_status" AS ENUM (
			'pending',
			'processing',
			'success',
			'failed',
			'dead_letter'
		);
	ELSIF (
		SELECT array_agg(enum_value.enumlabel::text ORDER BY enum_value.enumsortorder)
		FROM pg_type AS enum_type
		JOIN pg_namespace AS namespace ON namespace.oid = enum_type.typnamespace
		JOIN pg_enum AS enum_value ON enum_value.enumtypid = enum_type.oid
		WHERE namespace.nspname = 'public'
			AND enum_type.typname = 'integration_delivery_status'
	) IS DISTINCT FROM ARRAY[
		'pending',
		'processing',
		'success',
		'failed',
		'dead_letter'
	]::text[] THEN
		RAISE EXCEPTION 'public.integration_delivery_status tem labels inesperados';
	END IF;
END
$$;
--> statement-breakpoint
ALTER TABLE "public"."carts"
	ADD COLUMN IF NOT EXISTS "last_utm" jsonb DEFAULT '{}'::jsonb NOT NULL;
--> statement-breakpoint
ALTER TABLE "public"."orders"
	ADD COLUMN IF NOT EXISTS "last_utm" jsonb DEFAULT '{}'::jsonb NOT NULL,
	ADD COLUMN IF NOT EXISTS "refunded_at" timestamp with time zone,
	ADD COLUMN IF NOT EXISTS "chargeback_at" timestamp with time zone;
--> statement-breakpoint
ALTER TABLE "public"."visitor_sessions"
	ADD COLUMN IF NOT EXISTS "last_utm" jsonb DEFAULT '{}'::jsonb NOT NULL;
--> statement-breakpoint
ALTER TABLE "public"."integrations"
	ADD COLUMN IF NOT EXISTS "is_active" boolean DEFAULT false NOT NULL,
	ADD COLUMN IF NOT EXISTS "connection_status" text DEFAULT 'not_tested' NOT NULL,
	ADD COLUMN IF NOT EXISTS "last_connection_test_at" timestamp with time zone,
	ADD COLUMN IF NOT EXISTS "last_connection_ok" boolean,
	ADD COLUMN IF NOT EXISTS "last_connection_http_status" integer,
	ADD COLUMN IF NOT EXISTS "last_connection_message" text,
	ADD COLUMN IF NOT EXISTS "last_connection_duration_ms" integer;
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "public"."integration_deliveries" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workspace_id" uuid NOT NULL,
	"integration_id" uuid NOT NULL,
	"order_id" uuid NOT NULL,
	"sale_status" text NOT NULL,
	"idempotency_key" text NOT NULL,
	"status" "public"."integration_delivery_status" DEFAULT 'pending' NOT NULL,
	"attempt_count" integer DEFAULT 0 NOT NULL,
	"max_attempts" integer DEFAULT 6 NOT NULL,
	"next_attempt_at" timestamp with time zone DEFAULT now() NOT NULL,
	"locked_at" timestamp with time zone,
	"lock_token" text,
	"http_status" integer,
	"error_code" text,
	"error_message" text,
	"duration_ms" integer,
	"sent_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "public"."integration_delivery_attempts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workspace_id" uuid NOT NULL,
	"integration_id" uuid NOT NULL,
	"delivery_id" uuid NOT NULL,
	"attempt_number" integer NOT NULL,
	"result" text NOT NULL,
	"http_status" integer,
	"error_code" text,
	"error_message" text,
	"duration_ms" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
DO $$
BEGIN
	IF NOT EXISTS (
		SELECT 1 FROM pg_constraint
		WHERE conname = 'integration_deliveries_workspace_id_workspaces_id_fk'
			AND conrelid = 'public.integration_deliveries'::regclass
			AND contype = 'f'
	) THEN
		ALTER TABLE "public"."integration_deliveries"
			ADD CONSTRAINT "integration_deliveries_workspace_id_workspaces_id_fk"
			FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id")
			ON DELETE cascade;
	END IF;

	IF NOT EXISTS (
		SELECT 1 FROM pg_constraint
		WHERE conname = 'integration_deliveries_integration_id_integrations_id_fk'
			AND conrelid = 'public.integration_deliveries'::regclass
			AND contype = 'f'
	) THEN
		ALTER TABLE "public"."integration_deliveries"
			ADD CONSTRAINT "integration_deliveries_integration_id_integrations_id_fk"
			FOREIGN KEY ("integration_id") REFERENCES "public"."integrations"("id")
			ON DELETE cascade;
	END IF;

	IF NOT EXISTS (
		SELECT 1 FROM pg_constraint
		WHERE conname = 'integration_deliveries_order_id_orders_id_fk'
			AND conrelid = 'public.integration_deliveries'::regclass
			AND contype = 'f'
	) THEN
		ALTER TABLE "public"."integration_deliveries"
			ADD CONSTRAINT "integration_deliveries_order_id_orders_id_fk"
			FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id")
			ON DELETE cascade;
	END IF;

	IF NOT EXISTS (
		SELECT 1 FROM pg_constraint
		WHERE conname = 'integration_delivery_attempts_workspace_id_workspaces_id_fk'
			AND conrelid = 'public.integration_delivery_attempts'::regclass
			AND contype = 'f'
	) THEN
		ALTER TABLE "public"."integration_delivery_attempts"
			ADD CONSTRAINT "integration_delivery_attempts_workspace_id_workspaces_id_fk"
			FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id")
			ON DELETE cascade;
	END IF;

	IF NOT EXISTS (
		SELECT 1 FROM pg_constraint
		WHERE conname = 'integration_delivery_attempts_integration_id_integrations_id_fk'
			AND conrelid = 'public.integration_delivery_attempts'::regclass
			AND contype = 'f'
	) THEN
		ALTER TABLE "public"."integration_delivery_attempts"
			ADD CONSTRAINT "integration_delivery_attempts_integration_id_integrations_id_fk"
			FOREIGN KEY ("integration_id") REFERENCES "public"."integrations"("id")
			ON DELETE cascade;
	END IF;

	IF NOT EXISTS (
		SELECT 1 FROM pg_constraint
		WHERE conname = 'integration_delivery_attempts_delivery_id_integration_deliveries_id_fk'
			AND conrelid = 'public.integration_delivery_attempts'::regclass
			AND contype = 'f'
	) THEN
		ALTER TABLE "public"."integration_delivery_attempts"
			ADD CONSTRAINT "integration_delivery_attempts_delivery_id_integration_deliveries_id_fk"
			FOREIGN KEY ("delivery_id") REFERENCES "public"."integration_deliveries"("id")
			ON DELETE cascade;
	END IF;
END
$$;
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "integration_deliveries_order_status_idx"
	ON "public"."integration_deliveries" ("workspace_id", "integration_id", "order_id", "sale_status");
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "integration_deliveries_idempotency_idx"
	ON "public"."integration_deliveries" ("idempotency_key");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "integration_deliveries_queue_idx"
	ON "public"."integration_deliveries" ("status", "next_attempt_at");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "integration_deliveries_workspace_idx"
	ON "public"."integration_deliveries" ("workspace_id", "created_at");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "integration_delivery_attempts_delivery_idx"
	ON "public"."integration_delivery_attempts" ("delivery_id", "attempt_number");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "integration_delivery_attempts_workspace_idx"
	ON "public"."integration_delivery_attempts" ("workspace_id", "created_at");
--> statement-breakpoint
-- A aplicação acessa dados exclusivamente no servidor por uma conexão
-- Postgres privilegiada. Nenhuma tabela fica exposta à Data API por padrão:
-- futuros acessos client-side devem adicionar grants e policies explícitos.
DO $$
DECLARE
	app_table text;
	api_role text;
BEGIN
	FOREACH app_table IN ARRAY ARRAY[
		'analytics_events',
		'audit_logs',
		'campaign_links',
		'campaigns',
		'cart_events',
		'cart_items',
		'carts',
		'categories',
		'chargebacks',
		'checkout_products',
		'checkout_sessions',
		'checkout_versions',
		'checkouts',
		'coupon_uses',
		'coupons',
		'customer_activities',
		'customer_addresses',
		'customer_consents',
		'customer_notes',
		'customer_segments',
		'customer_tag_assignments',
		'customer_tags',
		'customers',
		'domains',
		'email_campaigns',
		'email_events',
		'email_frequency_caps',
		'email_recipients',
		'email_suppressions',
		'files',
		'integration_deliveries',
		'integration_delivery_attempts',
		'integration_logs',
		'integrations',
		'inventory_movements',
		'landing_page_events',
		'landing_page_versions',
		'landing_pages',
		'ledger_entries',
		'notification_preferences',
		'notifications',
		'order_bumps',
		'order_items',
		'order_status_history',
		'orders',
		'payment_attempts',
		'payment_link_events',
		'payment_links',
		'payment_provider_accounts',
		'payment_providers',
		'payment_webhooks',
		'payments',
		'payouts',
		'pixel_bindings',
		'pixel_events',
		'pixels',
		'product_categories',
		'product_custom_code',
		'product_files',
		'product_images',
		'product_option_values',
		'product_options',
		'product_reviews',
		'product_variant_media',
		'product_variant_values',
		'product_variants',
		'products',
		'profiles',
		'refunds',
		'shipping_methods',
		'store_settings',
		'stores',
		'visitor_sessions',
		'webhook_deliveries',
		'webhook_endpoints',
		'workspace_branding',
		'workspace_members',
		'workspaces'
	]
	LOOP
		IF to_regclass(format('public.%I', app_table)) IS NOT NULL THEN
			EXECUTE format(
				'ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY',
				app_table
			);
		END IF;
	END LOOP;

	FOREACH api_role IN ARRAY ARRAY['anon', 'authenticated', 'service_role']
	LOOP
		IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = api_role) THEN
			EXECUTE format(
				'REVOKE ALL PRIVILEGES ON ALL TABLES IN SCHEMA public FROM %I',
				api_role
			);
			EXECUTE format(
				'REVOKE ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public FROM %I',
				api_role
			);
			EXECUTE format(
				'REVOKE ALL PRIVILEGES ON ALL FUNCTIONS IN SCHEMA public FROM %I',
				api_role
			);
			EXECUTE format(
				'ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public REVOKE ALL PRIVILEGES ON TABLES FROM %I',
				api_role
			);
			EXECUTE format(
				'ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public REVOKE ALL PRIVILEGES ON SEQUENCES FROM %I',
				api_role
			);
			EXECUTE format(
				'ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public REVOKE ALL PRIVILEGES ON FUNCTIONS FROM %I',
				api_role
			);
		END IF;
	END LOOP;

	REVOKE ALL PRIVILEGES ON ALL FUNCTIONS IN SCHEMA "public" FROM PUBLIC;
	ALTER DEFAULT PRIVILEGES FOR ROLE postgres
		REVOKE EXECUTE ON FUNCTIONS FROM PUBLIC;
END
$$;
--> statement-breakpoint
RESET lock_timeout;
