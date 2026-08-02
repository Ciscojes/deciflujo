"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { CheckCircle2, LoaderCircle } from "lucide-react";
import { AuthLayout } from "@/components/auth/auth-layout";
import { authClient } from "@/lib/auth-client";

export default function ForgotPasswordPage() {
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError(null);
    const form = new FormData(event.currentTarget);
    const result = await authClient.requestPasswordReset({
      email: String(form.get("email")),
      redirectTo: "/reset-password",
    });
    if (result.error) {
      setError("No fue posible procesar la solicitud. Inténtalo nuevamente.");
    } else {
      setSent(true);
    }
    setLoading(false);
  }

  return (
    <AuthLayout
      eyebrow="Recuperación segura"
      title="Recupera el acceso"
      description="Te enviaremos un enlace de un solo uso que vencerá en una hora."
    >
      {sent ? (
        <div>
          <div className="flex items-start gap-3 rounded-xl bg-[#edf5ef] p-4 text-sm leading-6 text-[#315f45]">
            <CheckCircle2 className="mt-0.5 shrink-0" size={19} />
            Si existe una cuenta con ese correo, recibirás las instrucciones en
            unos minutos. Revisa también la carpeta de spam.
          </div>
          <Link
            href="/sign-in"
            className="mt-6 block text-center text-sm font-medium text-[#3567a8] hover:underline"
          >
            Volver al inicio de sesión
          </Link>
        </div>
      ) : (
        <form className="space-y-5" onSubmit={handleSubmit}>
          <label className="block text-sm font-medium text-[#374354]">
            Correo electrónico
            <input
              className="form-control mt-2"
              type="email"
              name="email"
              autoComplete="email"
              required
              autoFocus
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
            Enviar enlace
          </button>
          <Link
            href="/sign-in"
            className="block text-center text-sm font-medium text-[#3567a8] hover:underline"
          >
            Volver al inicio de sesión
          </Link>
        </form>
      )}
    </AuthLayout>
  );
}
