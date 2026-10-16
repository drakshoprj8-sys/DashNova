"use client";

import * as React from "react";
import { useActionState } from "react";
import { AlertCircle, CheckCircle2, Palette } from "lucide-react";

import {
  updateCheckoutThemeAction,
  type CheckoutActionResult,
} from "@/features/checkouts/actions";
import { CheckoutBrand } from "@/features/branding/checkout-brand";
import type { CheckoutTheme } from "@/features/checkouts/queries";
import { LogoDropzone } from "@/components/logo-dropzone";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";

function ColorField({
  id,
  name,
  label,
  value,
  onChange,
}: {
  id: string;
  name: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <div className="space-y-2">
      <Label htmlFor={id}>{label}</Label>
      <div className="flex items-center gap-2">
        <input
          type="color"
          aria-label={label}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="border-input size-9 shrink-0 cursor-pointer rounded-md border p-0.5"
        />
        <Input
          id={id}
          name={name}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="#7c3aed"
          className="font-mono uppercase"
          maxLength={7}
        />
      </div>
    </div>
  );
}

export function CheckoutThemeSheet({
  checkoutId,
  checkoutName,
  theme,
  storeName,
  inheritedLogoUrl,
  inheritedHeaderBackground = "#e30613",
  inheritedHeaderTextColor = "#ffffff",
}: {
  checkoutId: string;
  checkoutName: string;
  theme: CheckoutTheme;
  storeName: string;
  inheritedLogoUrl: string | null;
  inheritedHeaderBackground?: string;
  inheritedHeaderTextColor?: string;
}) {
  const [open, setOpen] = React.useState(false);
  const [primaryColor, setPrimaryColor] = React.useState(theme.primaryColor);
  const [buttonColor, setButtonColor] = React.useState(theme.buttonColor);
  const [bannerColor, setBannerColor] = React.useState(theme.bannerColor);
  const [logoUrl, setLogoUrl] = React.useState(theme.logoUrl ?? "");
  const [customStoreName, setCustomStoreName] = React.useState(
    theme.storeName ?? "",
  );
  const [headerTextColor, setHeaderTextColor] = React.useState(
    theme.headerTextColor ?? "#ffffff",
  );
  const [inheritHeader, setInheritHeader] = React.useState(
    theme.useWorkspaceHeader ?? false,
  );
  const [state, formAction, pending] = useActionState<
    CheckoutActionResult | null,
    FormData
  >(updateCheckoutThemeAction, null);

  // Fecha o sheet assim que a action responder com sucesso — ajustado durante
  // a renderização (não num efeito) para evitar um render em cascata.
  const [handledState, setHandledState] = React.useState(state);
  if (state !== handledState) {
    setHandledState(state);
    if (state?.ok) setOpen(false);
  }

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button size="sm" variant="ghost" aria-label="Personalizar checkout">
          <Palette />
        </Button>
      </SheetTrigger>
      <SheetContent>
        <SheetHeader>
          <SheetTitle>Personalizar checkout</SheetTitle>
          <SheetDescription>{checkoutName}</SheetDescription>
        </SheetHeader>

        <form
          action={formAction}
          className="flex flex-1 flex-col gap-4 overflow-y-auto px-4"
        >
          <input type="hidden" name="id" value={checkoutId} />
          <input type="hidden" name="logoUrl" value={logoUrl} />
          <input
            type="hidden"
            name="useWorkspaceHeader"
            value={String(inheritHeader)}
          />
          <input type="hidden" name="headerTextColor" value={headerTextColor} />
          <input type="hidden" name="storeName" value={customStoreName} />
          {state?.error && (
            <Alert variant="destructive">
              <AlertCircle />
              <AlertDescription>{state.error}</AlertDescription>
            </Alert>
          )}
          <div className="flex items-center justify-between gap-3 rounded-lg border p-3">
            <Label htmlFor={`inherit-${checkoutId}`}>
              Usar identidade das Configurações
            </Label>
            <Switch
              id={`inherit-${checkoutId}`}
              checked={inheritHeader}
              onCheckedChange={setInheritHeader}
            />
          </div>
          {inheritHeader ? (
            <p className="text-muted-foreground text-xs">
              Nome, logo e cores acompanham as{" "}
              <a className="underline" href="/configuracoes">
                Configurações da loja
              </a>
              .
            </p>
          ) : null}
          <div
            className={`space-y-4 ${inheritHeader ? "pointer-events-none opacity-50" : ""}`}
            inert={inheritHeader}
          >
            <Label htmlFor={`storeName-${checkoutId}`}>
              Nome da loja neste checkout
            </Label>
            <Input
              id={`storeName-${checkoutId}`}
              value={customStoreName}
              onChange={(event) => setCustomStoreName(event.target.value)}
              placeholder={storeName}
              maxLength={120}
            />

            {state?.ok && state.message && (
              <Alert variant="success">
                <CheckCircle2 />
                <AlertDescription>{state.message}</AlertDescription>
              </Alert>
            )}

            <LogoDropzone
              id={`logoUrl-${checkoutId}`}
              label="Logo do cabeçalho"
              value={logoUrl}
              onChange={setLogoUrl}
            />
            <p className="text-muted-foreground -mt-2 text-xs">
              Aparece centralizada neste checkout. Sem uma logo própria, usa a
              identidade geral definida no Editor de checkout.
            </p>

            <ColorField
              id={`bannerColor-${checkoutId}`}
              name="bannerColor"
              label="Cor de fundo do banner"
              value={bannerColor}
              onChange={setBannerColor}
            />
            <ColorField
              id={`headerTextColor-${checkoutId}`}
              name="headerTextColorInput"
              label="Cor do nome no cabeçalho"
              value={headerTextColor}
              onChange={setHeaderTextColor}
            />
          </div>
          <ColorField
            id={`primaryColor-${checkoutId}`}
            name="primaryColor"
            label="Cor de destaque"
            value={primaryColor}
            onChange={setPrimaryColor}
          />
          <ColorField
            id={`buttonColor-${checkoutId}`}
            name="buttonColor"
            label="Cor do botão de pagamento"
            value={buttonColor}
            onChange={setButtonColor}
          />

          <div className="space-y-3 rounded-xl border p-4">
            <p className="text-muted-foreground text-xs">Pré-visualização</p>

            <div
              className="flex h-[65px] items-center justify-center rounded-lg px-4"
              style={{
                backgroundColor: inheritHeader
                  ? inheritedHeaderBackground
                  : bannerColor,
              }}
            >
              <CheckoutBrand
                logoUrl={
                  inheritHeader ? inheritedLogoUrl : logoUrl || inheritedLogoUrl
                }
                storeName={
                  inheritHeader ? storeName : customStoreName || storeName
                }
                textColor={
                  inheritHeader ? inheritedHeaderTextColor : headerTextColor
                }
              />
            </div>

            <div
              className="flex size-7 items-center justify-center rounded-full text-xs font-bold text-white"
              style={{ backgroundColor: primaryColor }}
            >
              1
            </div>
            <button
              type="button"
              className="h-10 w-full rounded-lg text-sm font-bold text-white"
              style={{ backgroundColor: buttonColor }}
            >
              Pagar agora
            </button>
          </div>

          <SheetFooter className="px-0">
            <Button type="submit" loading={pending}>
              Salvar
            </Button>
            <SheetClose asChild>
              <Button type="button" variant="outline">
                Cancelar
              </Button>
            </SheetClose>
          </SheetFooter>
        </form>
      </SheetContent>
    </Sheet>
  );
}
