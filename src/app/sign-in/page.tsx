"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import { LoaderCircle } from "lucide-react";
import { AuthLayout } from "@/components/auth/auth-layout";
import { authClient } from "@/lib/auth-client";

export default function SignInPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError(null);
    const form = new FormData(event.currentTarget);

    const result = await authClient.signIn.email({
      email: String(form.get("email")),
      password: String(form.get("password")),
    });

    if (result.error) {
      setError("El correo o la contraseña no coinciden.");
      setLoading(false);
      return;
    }

    const next = new URLSearchParams(window.location.search).get("next");
    router.push(next?.startsWith("/") ? next : "/");
    router.refresh();
  }

  return (
    <AuthLayout
      eyebrow="Bienvenido de nuevo"
      title="Entra a tu espacio financiero"
      description="Tus movimientos, escenarios y decisiones continúan donde los dejaste."
    >
      <form className="space-y-5" onSubmit={handleSubmit}>
        <label className="block text-sm font-medium text-[#374354]">
          Correo electrónico
          <input
            className="form-control mt-2"
            type="email"
            name="email"
            autoComplete="email"
            required
          />
        </label>
        <label className="block text-sm font-medium text-[#374354]">
          <span className="flex items-center justify-between gap-3">
            Contraseña
            <Link
              href="/forgot-password"
              className="font-normal text-[#3567a8] hover:underline"
            >
              ¿La olvidaste?
            </Link>
          </span>
          <input
            className="form-control mt-2"
            type="password"
            name="password"
            autoComplete="current-password"
            minLength={8}
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
          Iniciar sesión
        </button>
      </form>
      <p className="mt-6 text-center text-sm text-[#6f7b8a]">
        ¿Es tu primera vez?{" "}
        <Link className="font-medium text-[#3567a8] hover:underline" href="/sign-up">
          Crea tu cuenta
        </Link>
      </p>
    </AuthLayout>
  );
}
