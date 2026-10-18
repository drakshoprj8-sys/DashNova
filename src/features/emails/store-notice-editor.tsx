"use client";

import { RotateCcw, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { NotificationPreferences } from "./notification-content";
import {
  STORE_NOTICE_PREFERENCES,
  buildStoreNoticeContent,
  getStoreNoticeValidationError,
} from "./store-notice";
import {
  buildStoreNoticeOfferContent,
  getStoreNoticeOfferValidationError,
} from "./store-notice-offer";
import { StoreOfferEditor } from "./store-offer-editor";
import { OFFER_BUTTONS, type StoreOffer } from "./store-offer";
import {
  buildStoreNoticeTrackingContent,
  getStoreNoticeTrackingValidationError,
} from "./store-notice-tracking";

export function StoreNoticeEditor({
  value,
  onChange,
  audience = "all",
  hideSubject = false,
  offerUrl = "",
  offer = null,
  offerButton = OFFER_BUTTONS[0],
  onOfferUrlChange,
  onOfferChange,
  onOfferButtonChange,
  tracking = false,
  onTrackingChange,
}: {
  value: NotificationPreferences;
  onChange: (value: NotificationPreferences) => void;
  audience?:
    | "all"
    | "paid"
    | "imported_paid"
    | "imported_pending"
    | "no_orders"
    | "custom";
  hideSubject?: boolean;
  /** Botão vermelho opcional: link do checkout de um produto da própria loja. */
  offerUrl?: string;
  offer?: StoreOffer | null;
  offerButton?: string;
  onOfferUrlChange?: (url: string) => void;
  onOfferChange?: (offer: StoreOffer | null) => void;
  onOfferButtonChange?: (button: string) => void;
  tracking?: boolean;
  onTrackingChange?: (enabled: boolean) => void;
}) {
  const hasOffer = !tracking && Boolean(offer);
  const content = tracking
    ? buildStoreNoticeTrackingContent(value)
    : hasOffer
      ? buildStoreNoticeOfferContent(value, offer!, offerButton)
      : buildStoreNoticeContent(value);
  const error = tracking
    ? getStoreNoticeTrackingValidationError(content)
    : hasOffer
      ? getStoreNoticeOfferValidationError(content, offer!)
      : getStoreNoticeValidationError(content);
  return (
    <div className="min-w-0 space-y-4">
      <div className="flex items-center justify-between gap-2">
        <h3 className="flex items-center gap-2 text-sm font-semibold">
          <Mail className="text-primary size-4" />
          {audience === "paid" || audience === "imported_paid"
            ? "Personalizar email para clientes pagos"
            : audience === "imported_pending"
              ? "Personalizar email para clientes pendentes"
              : audience === "no_orders"
                ? "Personalizar email para quem ainda não comprou"
                : "Personalizar email para clientes"}
        </h3>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => {
            onChange({ ...STORE_NOTICE_PREFERENCES });
          }}
        >
          <RotateCcw className="size-3.5" /> Restaurar padrão
        </Button>
      </div>
      <div className="rounded-lg border border-red-200/60 bg-red-50/50 p-3 text-xs text-red-900 dark:border-red-900/40 dark:bg-red-950/20 dark:text-red-200">
        O assunto, o cabeçalho e a mensagem aparecem na prévia enquanto você
        edita. Este comunicado apresenta informações da própria loja.
      </div>
      <p className="bg-muted/40 text-muted-foreground rounded-md border p-3 text-sm">
        {audience === "paid" || audience === "imported_paid"
          ? "Envie informações da PCCGVIP aos clientes classificados como pagos na aba Clientes, incluindo os importados."
          : audience === "no_orders"
            ? "Envie informações da PCCGVIP a quem está cadastrado mas ainda não fez nenhum pedido."
            : "Envie informações da PCCGVIP aos contatos elegíveis da aba Clientes, incluindo quem não tem pedido."}{" "}
        {tracking
          ? "O botão acompanha o pedido confirmado de cada cliente, sem solicitar pagamento. Clientes sem pedido verificado são excluídos desse envio."
          : hasOffer
            ? "O botão abaixo leva ao checkout de produto verificado que você colou; não há cobrança de pedidos anteriores."
            : "O comunicado é enviado sem botão ou link de pagamento."}{" "}
        Bloqueados e descadastrados ficam excluídos.
      </p>
      {(
        [
          ["subject", "Assunto", 160],
          ["preheader", "Texto de pré-visualização", 180],
          ["headerName", "Nome no cabeçalho", 80],
          ["title", "Título interno", 160],
        ] as const
      )
        .filter(([field]) => !hideSubject || field !== "subject")
        .map(([field, label, limit]) => (
          <div key={field} className="space-y-2">
            <Label htmlFor={field}>{label}</Label>
            <Input
              id={field}
              name={field}
              value={value[field]}
              maxLength={limit}
              aria-invalid={error?.startsWith(`${label}:`) || undefined}
              aria-describedby={
                error?.startsWith(`${label}:`)
                  ? "storeNoticeError"
                  : field === "headerName"
                    ? "storeNoticeHeaderHelp"
                    : undefined
              }
              onChange={(event) =>
                onChange({ ...value, [field]: event.target.value })
              }
            />
            {field === "headerName" ? (
              <p
                id="storeNoticeHeaderHelp"
                className="text-muted-foreground text-xs"
              >
                Use o nome da sua loja ou equipe, como “Atendimento PCCGVIP”.
                Esse nome aparece no topo do email. O endereço do remetente
                continua sendo o configurado na loja.
              </p>
            ) : null}
          </div>
        ))}
      <div className="space-y-2">
        <Label htmlFor="storeMessage">Mensagem do comunicado</Label>
        <Textarea
          id="storeMessage"
          value={value.customMessage}
          maxLength={800}
          placeholder="Escreva uma informação da sua loja, como novidades do atendimento."
          className="min-h-[220px] resize-y leading-relaxed"
          onChange={(event) =>
            onChange({ ...value, customMessage: event.target.value })
          }
        />
        <p className="text-muted-foreground text-xs">
          Sua mensagem aparece entre a apresentação da PCCGVIP e a orientação de
          apoio na prévia.
        </p>
      </div>
      {onTrackingChange ? (
        <div className="space-y-3 rounded-md border p-3">
          <label
            className="flex items-center gap-2 text-sm font-medium"
            htmlFor="includeOrderTracking"
          >
            <input
              id="includeOrderTracking"
              type="checkbox"
              className="accent-primary size-4"
              checked={tracking}
              disabled={audience === "no_orders"}
              onChange={(event) => onTrackingChange(event.target.checked)}
              aria-describedby="orderTrackingHelp"
            />
            Incluir botão de acompanhamento do pedido
          </label>
          <p id="orderTrackingHelp" className="text-muted-foreground text-xs">
            {audience === "no_orders" ? (
              "Este público ainda não tem pedidos para acompanhar. Selecione clientes com uma compra confirmada."
            ) : (
              <>
                Cada destinatário recebe um endereço individual para o seu
                pedido aprovado. A prévia usa um endereço demonstrativo. Este
                botão não solicita pagamento.
              </>
            )}
          </p>
          {tracking ? (
            <div className="space-y-2">
              <Label htmlFor="trackingButtonLabel">
                Texto do botão de acompanhamento
              </Label>
              <Input
                id="trackingButtonLabel"
                value={value.ctaLabel}
                maxLength={60}
                onChange={(event) =>
                  onChange({ ...value, ctaLabel: event.target.value })
                }
                aria-invalid={error?.startsWith("Texto do botão:") || undefined}
                aria-describedby="trackingButtonHelp"
              />
              <p
                id="trackingButtonHelp"
                className="text-muted-foreground text-xs"
              >
                Use um texto sobre consultar o pedido, como “Ver o meu pedido”
                ou “Acompanhar encomenda”.
              </p>
            </div>
          ) : null}
        </div>
      ) : null}
      {!tracking && onOfferUrlChange ? (
        <div className="space-y-4 border-t pt-4">
          <StoreOfferEditor
            embedded
            url={offerUrl}
            offer={offer}
            button={offerButton}
            onUrl={onOfferUrlChange}
            onOffer={(next) => onOfferChange?.(next)}
            onButton={(next) => onOfferButtonChange?.(next)}
          />
        </div>
      ) : null}
      <div
        className="flex flex-wrap gap-1.5"
        aria-label="Variáveis do comunicado"
      >
        {["{{PRIMEIRO_NOME}}", "{{NOME}}", "{{EMAIL}}", "{{PRODUTO}}"].map(
          (token) => (
            <span
              key={token}
              className="bg-muted text-muted-foreground rounded-md px-2 py-1 font-mono text-[11px]"
            >
              {token}
            </span>
          ),
        )}
      </div>
      {error && (
        <p
          id="storeNoticeError"
          role="alert"
          className="text-destructive text-xs"
        >
          {error}
        </p>
      )}
      {(
        ["body", "articleName", "ctaLabel", "ctaUrl", "fallbackText"] as const
      ).map((field) => (
        <input key={field} type="hidden" name={field} value={content[field]} />
      ))}
    </div>
  );
}
