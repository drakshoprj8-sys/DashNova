"use client";

import { useActionState, useState } from "react";
import { AlertCircle, CheckCircle2, Save } from "lucide-react";

import {
  updateBrandingAction,
  type BrandingActionResult,
} from "@/features/branding/actions";
import { CheckoutBrand } from "@/features/branding/checkout-brand";
import type { WorkspaceBranding } from "@/features/branding/queries";
import { LogoDropzone } from "@/components/logo-dropzone";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export function BrandingForm({ initial }: { initial: WorkspaceBranding }) {
  const [state, formAction, pending] = useActionState<
    BrandingActionResult | null,
    FormData
  >(updateBrandingAction, null);
  const [logoUrl, setLogoUrl] = useState(initial.logoUrl ?? "");
  const [headerBackground, setHeaderBackground] = useState(
    initial.headerBackground ?? "#e30613",
  );
  const [headerTextColor, setHeaderTextColor] = useState(
    initial.headerTextColor ?? "#ffffff",
  );
  const [storeName, setStoreName] = useState(
    initial.storeName.trim() || "Minha Loja",
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Identidade da loja</CardTitle>
        <CardDescription>
          Personalize o nome, a logo e as cores do cabeçalho. Landing pages e
          checkouts podem usar esta identidade ou ter uma própria.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form action={formAction} className="space-y-4">
          <input type="hidden" name="logoUrl" value={logoUrl} />
          <input
            type="hidden"
            name="headerBackground"
            value={headerBackground}
          />
          <input type="hidden" name="headerTextColor" value={headerTextColor} />

          {state?.error && (
            <Alert variant="destructive">
              <AlertCircle />
              <AlertDescription>{state.error}</AlertDescription>
            </Alert>
          )}
          {state?.ok && state.message && (
            <Alert variant="success">
              <CheckCircle2 />
              <AlertDescription>{state.message}</AlertDescription>
            </Alert>
          )}

          <LogoDropzone
            id="branding-logoUrl"
            label="Logo da loja"
            value={logoUrl}
            onChange={setLogoUrl}
          />
          <p className="text-muted-foreground -mt-2 text-xs">
            Use uma marca própria. Sem imagem, o checkout mostra “Minha Loja” ou
            o nome definido abaixo.
          </p>

          <div className="space-y-2 rounded-xl border p-4">
            <p className="text-muted-foreground text-xs font-medium">
              Pré-visualização do cabeçalho
            </p>
            <div
              className="flex h-[65px] items-center justify-center rounded-lg px-4"
              style={{ backgroundColor: headerBackground }}
            >
              <CheckoutBrand
                logoUrl={logoUrl}
                storeName={storeName}
                textColor={headerTextColor}
              />
            </div>
            <p className="text-muted-foreground text-[11px]">
              Área da logo: até 122 × 25 px, centralizada no celular e no
              computador.
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            {[
              {
                id: "header-background",
                label: "Cor de fundo do cabeçalho",
                value: headerBackground,
                onChange: setHeaderBackground,
              },
              {
                id: "header-text",
                label: "Cor do nome no cabeçalho",
                value: headerTextColor,
                onChange: setHeaderTextColor,
              },
            ].map(({ id, label, value, onChange }) => (
              <div className="space-y-2" key={id}>
                <Label htmlFor={id}>{label}</Label>
                <div className="flex gap-2">
                  <input
                    type="color"
                    aria-label={`Escolher ${label}`}
                    value={value}
                    onChange={(event) => onChange(event.target.value)}
                    className="size-9 shrink-0 rounded border"
                  />
                  <Input
                    id={id}
                    value={value}
                    maxLength={7}
                    pattern="#[0-9a-fA-F]{6}"
                    onChange={(event) => onChange(event.target.value)}
                    className="font-mono"
                    required
                  />
                </div>
              </div>
            ))}
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="storeName">Nome da loja</Label>
              <Input
                id="storeName"
                name="storeName"
                value={storeName}
                onChange={(event) => setStoreName(event.target.value)}
                placeholder="Ex.: Minha Loja"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="supportEmail">E-mail de suporte</Label>
              <Input
                id="supportEmail"
                name="supportEmail"
                type="email"
                defaultValue={initial.supportEmail ?? ""}
                placeholder="apoio@minhaloja.pt"
              />
            </div>
          </div>

          <Button type="submit" loading={pending}>
            <Save /> Salvar
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
