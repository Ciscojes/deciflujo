"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { CheckCircle2, LoaderCircle } from "lucide-react";
import { AuthLayout } from "@/components/auth/auth-layout";
import { authClient } from "@/lib/auth-client";

export function ResetPasswordForm({
  token,
  invalid,
}: {
  token: string | null;
  invalid: boolean;
}) {
  const [loading, setLoading] = useState(false);
  const [completed, setCompleted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!token) return;
    setLoading(true);
    setError(null);
    const form = new FormData(event.currentTarget);
    const password = String(form.get("password"));
    const confirmation = String(form.get("confirmation"));
    if (password !== confirmation) {
      setError("Las contraseñas no coinciden.");
      setLoading(false);
      return;
    }
    const result = await authClient.resetPassword({
      newPassword: password,
      token,
    });
    if (result.error) {
      setError("El enlace venció o ya fue utilizado. Solicita uno nuevo.");
    } else {
      setCompleted(true);
    }
    setLoading(false);
  }

  return (
    <AuthLayout
      eyebrow="Seguridad de la cuenta"
      title="Crea una contraseña nueva"
      description="Elige una contraseña de al menos ocho caracteres y distinta de las que utilizas en otros servicios."
    >
      {completed ? (
        <div>
          <div className="flex items-start gap-3 rounded-xl bg-[#edf5ef] p-4 text-sm leading-6 text-[#315f45]">
            <CheckCircle2 className="mt-0.5 shrink-0" size={19} />
            Tu contraseña fue actualizada y las sesiones anteriores quedaron
            cerradas.
          </div>
          <Link
            href="/sign-in"
            className="mt-6 block rounded-xl bg-[#183153] px-4 py-3 text-center font-medium text-white"
          >
            Iniciar sesión
          </Link>
        </div>
      ) : invalid ? (
        <div>
          <p className="rounded-xl bg-[#fff0ec] p-4 text-sm leading-6 text-[#9b422f]">
            Este enlace no es válido o ya venció.
          </p>
          <Link
            href="/forgot-password"
            className="mt-6 block text-center text-sm font-medium text-[#3567a8] hover:underline"
          >
            Solicitar otro enlace
          </Link>
        </div>
      ) : (
        <form className="space-y-5" onSubmit={handleSubmit}>
          <label className="block text-sm font-medium text-[#374354]">
            Contraseña nueva
            <input
              className="form-control mt-2"
              type="password"
              name="password"
              autoComplete="new-password"
              minLength={8}
              maxLength={128}
              required
              autoFocus
            />
          </label>
          <label className="block text-sm font-medium text-[#374354]">
            Confirmar contraseña
            <input
              className="form-control mt-2"
              type="password"
              name="confirmation"
              autoComplete="new-password"
              minLength={8}
              maxLength={128}
              required
            />
          </label>
          {error && (
            <p className="rounded-lg bg-[#fff0ec] px-3 py-2 text-sm text-[#9b422f]">
              {error}
            </p>
          )}
          <button
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#183153] px-4 py-3 font-medium text-white transition hover:bg-[#102943] disabled:opacity-60"
            disabled={loading}
          >
            {loading && <LoaderCircle size={17} className="animate-spin" />}
            Guardar contraseña
          </button>
        </form>
      )}
    </AuthLayout>
  );
}
