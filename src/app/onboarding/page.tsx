"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Building2, LoaderCircle } from "lucide-react";
import { AuthLayout } from "@/components/auth/auth-layout";
import { authClient } from "@/lib/auth-client";

type Organization = {
  id: string;
  name: string;
  slug: string;
};

function createSlug(name: string) {
  const normalized = name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
  return `${normalized || "empresa"}-${crypto.randomUUID().slice(0, 6)}`;
}

export default function OnboardingPage() {
  const router = useRouter();
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadOrganizations() {
      const session = await authClient.getSession();
      if (!session.data) {
        router.replace("/sign-in");
        return;
      }

      const result = await authClient.organization.list();
      if (result.data) setOrganizations(result.data);
      setLoading(false);
    }

    void loadOrganizations();
  }, [router]);

  async function enterOrganization(organizationId: string) {
    setSaving(true);
    setError(null);
    const result = await authClient.organization.setActive({ organizationId });
    if (result.error) {
      setError("No fue posible abrir esa empresa.");
      setSaving(false);
      return;
    }
    router.push("/");
    router.refresh();
  }

  async function handleCreate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError(null);
    const form = new FormData(event.currentTarget);
    const name = String(form.get("organizationName")).trim();

    const result = await authClient.organization.create({
      name,
      slug: createSlug(name),
    });
    if (result.error || !result.data) {
      setError("No fue posible crear el espacio de la empresa.");
      setSaving(false);
      return;
    }

    await enterOrganization(result.data.id);
  }

  return (
    <AuthLayout
      eyebrow="Tu espacio de trabajo"
      title="¿Qué empresa vamos a comprender?"
      description="Una organización funciona como una frontera: sus cuentas y movimientos nunca se mezclan con los de otra."
    >
      {loading ? (
        <div className="flex items-center justify-center gap-2 py-8 text-sm text-[#6f7b8a]">
          <LoaderCircle size={18} className="animate-spin" />
          Buscando tus empresas…
        </div>
      ) : (
        <>
          {organizations.length > 0 && (
            <div className="mb-7 space-y-3">
              <p className="text-sm font-medium text-[#374354]">
                Tus empresas
              </p>
              {organizations.map((organization) => (
                <button
                  key={organization.id}
                  className="flex w-full items-center gap-3 rounded-xl border border-[#dce3ec] p-4 text-left transition hover:border-[#8eaa99] hover:bg-[#f4f8f5]"
                  disabled={saving}
                  onClick={() => void enterOrganization(organization.id)}
                >
                  <span className="grid size-10 place-items-center rounded-lg bg-[#edf3fb] text-[#3567a8]">
                    <Building2 size={19} />
                  </span>
                  <span className="font-medium">{organization.name}</span>
                </button>
              ))}
              <div className="flex items-center gap-3 py-2 text-xs uppercase tracking-[0.12em] text-[#939c96]">
                <span className="h-px flex-1 bg-[#e0e6ed]" />
                o crea otra
                <span className="h-px flex-1 bg-[#e0e6ed]" />
              </div>
            </div>
          )}

          <form className="space-y-5" onSubmit={handleCreate}>
            <label className="block text-sm font-medium text-[#374354]">
              Nombre de la empresa
              <input
                className="form-control mt-2"
                name="organizationName"
                placeholder="Ej. Café Horizonte"
                minLength={2}
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
              disabled={saving}
            >
              {saving && <LoaderCircle size={17} className="animate-spin" />}
              Crear espacio
            </button>
          </form>
        </>
      )}
    </AuthLayout>
  );
}
