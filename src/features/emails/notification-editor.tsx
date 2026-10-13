"use client";

import { Link2, RotateCcw, WandSparkles } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import {
  DEFAULT_NOTIFICATION_PREFERENCES,
  MESSAGE_OPTIONS,
  buildNotificationContent,
  type NotificationPreferences,
} from "./notification-content";
import { getOrderNotificationValidationError } from "./notification-policy";
import { matchesOrderCheckout } from "./checkout-url-constraint";

const selectClass =
  "border-input bg-background focus-visible:border-ring focus-visible:ring-ring/50 h-9 w-full min-w-0 rounded-md border px-3 text-sm outline-none focus-visible:ring-[3px]";

export function NotificationEditor({
  value,
  onChange,
  destinationKind = "order",
  previewCheckoutUrl,
  requestedCheckoutUrl = "",
  onRequestedCheckoutUrlChange,
}: {
  value: NotificationPreferences;
  onChange: (value: NotificationPreferences) => void;
  destinationKind?: "order" | "checkout";
  previewCheckoutUrl?: string | null;
  requestedCheckoutUrl?: string;
  onRequestedCheckoutUrlChange?: (value: string) => void;
}) {
  const content = {
    ...buildNotificationContent(value),
    ctaUrl: destinationKind === "checkout" && requestedCheckoutUrl.trim()
      ? requestedCheckoutUrl.trim()
      : "{{CHECKOUT_URL}}",
  };
  const validationError = getOrderNotificationValidationError(content, destinationKind === "checkout");
  const checkoutMismatch = destinationKind === "checkout" && requestedCheckoutUrl.trim() && previewCheckoutUrl &&
    !matchesOrderCheckout(requestedCheckoutUrl.trim(), previewCheckoutUrl);
  return (
    <div className="min-w-0 space-y-4">
      <div className="flex items-center justify-between gap-2">
        <h3 className="flex items-center gap-2 text-sm font-semibold">
          <WandSparkles className="text-primary size-4" /> Personalizar e-mail
        </h3>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => onChange({
            ...DEFAULT_NOTIFICATION_PREFERENCES,
            ctaLabel: destinationKind === "checkout" ? "Abrir checkout do pedido" : DEFAULT_NOTIFICATION_PREFERENCES.ctaLabel,
          })}
        >
          <RotateCcw className="size-3.5" /> Restaurar padrão
        </Button>
      </div>
      {(
        [
          ["subject", "Assunto"],
          ["preheader", "Texto de pré-visualização"],
        ] as const
      ).map(([field, label]) => (
        <div key={field} className="space-y-2">
          <Label htmlFor={field}>{label}</Label>
          <Input
            id={field}
            name={field}
            value={value[field]}
            maxLength={field === "preheader" ? 180 : 160}
            onChange={(event) =>
              onChange({ ...value, [field]: event.target.value })
            }
          />
        </div>
      ))}
      <div className="space-y-2">
        <Label htmlFor="headerName">Nome no cabeçalho</Label>
        <Input
          id="headerName"
          name="headerName"
          value={value.headerName}
          onChange={(event) => onChange({ ...value, headerName: event.target.value })}
          maxLength={80}
          placeholder="Ex.: Equipa de apoio PCCGVIP"
        />
        <p className="text-muted-foreground text-xs">
          Escolha o nome da equipa ou setor e mantenha PCCGVIP para identificar
          a loja. Remetente: notificacoes@encomendapgcvip.site.
        </p>
      </div>
      <div className="space-y-2">
        <Label htmlFor="title">Título interno</Label>
        <Input
          id="title"
          name="title"
          value={value.title}
          onChange={(event) => onChange({ ...value, title: event.target.value })}
          maxLength={160}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="articleName">Nome do artigo</Label>
        <Input
          id="articleName"
          name="articleName"
          value={content.articleName}
          readOnly
        />
        <p className="text-muted-foreground text-xs">
          Preenchido com o artigo do pedido verificado de cada cliente.
        </p>
      </div>
      <details className="rounded-md border px-3 py-2">
        <summary className="cursor-pointer text-sm font-medium">Opções do pedido</summary>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
        {(
          [
            ["greeting", "Saudação"],
            ["introduction", "Texto do pedido"],
            ["support", "Orientação de apoio"],
            ["closing", "Despedida"],
          ] as const
        ).map(([field, label]) => (
          <div key={field} className="space-y-2">
            <Label htmlFor={`message-${field}`}>{label}</Label>
            <select
              id={`message-${field}`}
              value={value[field]}
              className={selectClass}
              onChange={(event) =>
                onChange({ ...value, [field]: Number(event.target.value) })
              }
            >
              {MESSAGE_OPTIONS[field].map((option, index) => (
                <option key={option.label} value={index}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
        ))}
        </div>
        <label className="mt-3 flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={value.showValue}
          onChange={(event) =>
            onChange({ ...value, showValue: event.target.checked })
          }
          className="accent-primary size-4"
        />
        Mostrar o valor do pedido
        </label>
      </details>
      <div className="space-y-2">
        <Label htmlFor="customMessage">Mensagem</Label>
        <Textarea
          id="customMessage"
          value={value.customMessage}
          onChange={(event) => onChange({ ...value, customMessage: event.target.value })}
          maxLength={800}
          placeholder="Escreva uma informação útil sobre o pedido confirmado."
          className="min-h-[260px] resize-y leading-relaxed"
        />
        <input type="hidden" name="body" value={content.body} />
        <p className="text-muted-foreground text-xs">
          O seu texto entra na mensagem mostrada ao lado. Nome, pedido, artigo e
          valor são personalizados para cada destinatário. Links e pedidos de
          pagamento não são aceitos neste campo.
        </p>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="ctaLabelPreview">Texto do botão</Label>
          <Input
            id="ctaLabelPreview"
            value={value.ctaLabel}
            maxLength={60}
            onChange={(event) => onChange({ ...value, ctaLabel: event.target.value })}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="ctaUrlPreview">{destinationKind === "checkout" ? "Link do botão (checkout)" : "Link individual do pedido"}</Label>
          <div className="relative">
          <Link2 className="text-muted-foreground pointer-events-none absolute left-3 top-2.5 size-4" aria-hidden="true" />
          <Input
            id="ctaUrlPreview"
            className="pl-9"
            value={requestedCheckoutUrl || (destinationKind === "order" ? "{{CHECKOUT_URL}}" : "")}
            onChange={(event) => onRequestedCheckoutUrlChange?.(event.target.value)}
            maxLength={2048}
            placeholder={previewCheckoutUrl ?? "Cole a URL do checkout aqui"}
          />
          </div>
        </div>
        <p className="text-muted-foreground text-xs sm:col-span-2">
          {destinationKind === "checkout"
            ? "Pode colar o link do checkout publicado. O envio só continua se ele corresponder ao pedido pendente de cada destinatário; o botão usa o endereço validado pelo sistema. Deixe vazio para usar o checkout do pedido automaticamente."
            : "Pode substituir {{CHECKOUT_URL}} pela URL do checkout. Ao colar uma URL, o público muda para pedidos pendentes, que são validados antes do envio. Deixe {{CHECKOUT_URL}} para acompanhar o pedido pago de cada cliente."}
        </p>
        {checkoutMismatch && <p role="alert" className="text-destructive text-xs">O link colado não corresponde ao checkout do cliente mostrado na prévia.</p>}
      </div>
      <div className="space-y-2">
        <Label htmlFor="fallbackTextPreview">Texto do link alternativo</Label>
        <Input
          id="fallbackTextPreview"
          value={value.fallbackText}
          maxLength={240}
          onChange={(event) => onChange({ ...value, fallbackText: event.target.value })}
        />
      </div>
      {validationError && (
        <p role="alert" className="text-destructive text-xs">
          {validationError}
        </p>
      )}
      <div
        className="flex flex-wrap gap-1.5"
        aria-label="Dados personalizados do pedido"
      >
        {[
          "{{PRIMEIRO_NOME}}",
          "{{NOME}}",
          "{{EMAIL}}",
          "{{PEDIDO}}",
          "{{PRODUTO}}",
          "{{VALOR}}",
          "{{CHECKOUT_URL}}",
          "{{LOJA_URL}}",
        ].map((token) => (
          <span
            key={token}
            className="bg-muted text-muted-foreground rounded-md px-2 py-1 font-mono text-[11px]"
          >
            {token}
          </span>
        ))}
      </div>
      {(["ctaLabel", "ctaUrl", "fallbackText"] as const).map((name) => (
        <input key={name} type="hidden" name={name} value={content[name]} />
      ))}
      <p className="text-muted-foreground text-xs">
        O envio inclui apenas pedidos verificados da loja. A prévia usa os dados
        disponíveis; os destinatários são conferidos antes do envio.
      </p>
    </div>
  );
}
