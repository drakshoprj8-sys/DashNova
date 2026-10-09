import type { Metadata } from "next";
import Link from "next/link";
import { KeyRound, TriangleAlert } from "lucide-react";

import { resetPasswordAction } from "@/features/auth/actions";
import { AuthForm } from "@/features/auth/auth-form";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Redefinir senha" };
export const dynamic = "force-dynamic";

interface RedefinirSenhaPageProps {
  searchParams: Promise<{ error?: string | string[] }>;
}

export default async function RedefinirSenhaPage({
  searchParams,
}: RedefinirSenhaPageProps) {
  const params = await searchParams;
  const errorCode = typeof params.error === "string" ? params.error : undefined;
  const configured = isSupabaseConfigured();

  let hasRecoverySession = false;
  if (configured && !errorCode) {
    const supabase = await createClient();
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser();
    hasRecoverySession = Boolean(user) && !error;
  }

  const canResetPassword = configured && hasRecoverySession;

  return (
    <Card>
      <CardHeader>
        <h1 className="flex items-center gap-2 text-lg leading-none font-semibold">
          <KeyRound className="size-5" />
          Redefinir senha
        </h1>
        <CardDescription>
          Escolha uma nova senha para proteger sua conta.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {canResetPassword ? (
          <AuthForm
            action={resetPasswordAction}
            submitLabel="Salvar nova senha"
          >
            <div className="space-y-2">
              <Label htmlFor="password">Nova senha</Label>
              <Input
                id="password"
                name="password"
                type="password"
                autoComplete="new-password"
                minLength={8}
                required
              />
              <p className="text-muted-foreground text-xs">
                Use pelo menos 8 caracteres.
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirmar nova senha</Label>
              <Input
                id="confirmPassword"
                name="confirmPassword"
                type="password"
                autoComplete="new-password"
                minLength={8}
                required
              />
            </div>
          </AuthForm>
        ) : (
          <Alert variant="warning">
            <TriangleAlert />
            <AlertTitle>
              {errorCode === "configuracao"
                ? "Recuperação indisponível"
                : "Link inválido ou expirado"}
            </AlertTitle>
            <AlertDescription>
              {errorCode === "configuracao"
                ? "A recuperação de senha está temporariamente indisponível. Contacte o responsável pelo painel."
                : "Solicite um novo e-mail de recuperação para continuar."}
            </AlertDescription>
          </Alert>
        )}

        {!canResetPassword && (
          <p className="text-muted-foreground mt-4 text-center text-sm">
            <Link
              href="/recuperar-senha"
              className="text-primary font-medium underline-offset-4 hover:underline"
            >
              Solicitar novo link
            </Link>
          </p>
        )}
      </CardContent>
    </Card>
  );
}
