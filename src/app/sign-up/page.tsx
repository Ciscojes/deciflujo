"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import { LoaderCircle } from "lucide-react";
import { AuthLayout } from "@/components/auth/auth-layout";
import { authClient } from "@/lib/auth-client";

export default function SignUpPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError(null);
    const form = new FormData(event.currentTarget);

    const result = await authClient.signUp.email({
      name: String(form.get("name")),
      email: String(form.get("email")),
      password: String(form.get("password")),
    });

    if (result.error) {
      setError(
        result.error.code === "USER_ALREADY_EXISTS"
          ? "Ya existe una cuenta con ese correo."
          : "No fue posible crear la cuenta. Revisa los datos.",
      );
      setLoading(false);
      return;
    }

    router.push("/onboarding");
    router.refresh();
  }

  return (
    <AuthLayout
      eyebrow="Comienza en Deciflujo"
      title="Crea tu identidad de trabajo"
      description="Luego crearás tu empresa. Separar usuario y organización permite colaborar sin mezclar datos."
    >
      <form className="space-y-5" onSubmit={handleSubmit}>
        <label className="block text-sm font-medium text-[#374354]">
          Tu nombre
          <input
            className="form-control mt-2"
            name="name"
            autoComplete="name"
            minLength={2}
            required
          />
        </label>
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
          Contraseña
          <input
            className="form-control mt-2"
            type="password"
            name="password"
            autoComplete="new-password"
            minLength={8}
            maxLength={128}
            required
          />
          <span className="mt-1.5 block text-xs font-normal text-[#7c8797]">
            Usa al menos 8 caracteres.
          </span>
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
          Crear cuenta
        </button>
      </form>
      <p className="mt-6 text-center text-sm text-[#6f7b8a]">
        ¿Ya tienes cuenta?{" "}
        <Link className="font-medium text-[#3567a8] hover:underline" href="/sign-in">
          Inicia sesión
        </Link>
      </p>
    </AuthLayout>
  );
}
