"use client";

import Link from "next/link";
import { useSearchParams, useRouter } from "next/navigation";
import { Suspense, useState } from "react";
import { CheckCircle2, LoaderCircle } from "lucide-react";
import { AuthLayout } from "@/components/auth/auth-layout";
import { authClient } from "@/lib/auth-client";

function InvitationContent() {
  const params = useSearchParams();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const invitationId = params.get("id");

  async function accept() {
    if (!invitationId) return;
    setLoading(true);
    const session = await authClient.getSession();
    if (!session.data) {
      router.push(`/sign-in?next=/accept-invitation?id=${invitationId}`);
      return;
    }
    const result = await authClient.organization.acceptInvitation({
      invitationId,
    });
    if (result.error) {
      setError(
        "No fue posible aceptar. Inicia sesión con el correo que recibió la invitación.",
      );
      setLoading(false);
      return;
    }
    router.push("/onboarding");
    router.refresh();
  }

  return (
    <AuthLayout
      eyebrow="Invitación de equipo"
      title="Únete a una empresa en Deciflujo"
      description="Al aceptar, verás únicamente la información permitida por el rol que te asignaron."
    >
      {invitationId ? (
        <>
          <div className="flex items-start gap-3 rounded-xl bg-[#edf5ef] p-4 text-sm leading-6 text-[#315f45]">
            <CheckCircle2 className="mt-0.5 shrink-0" size={19} />
            La invitación está lista. Debes usar el mismo correo al crear o
            iniciar tu cuenta.
          </div>
          {error && (
            <p className="mt-4 rounded-lg bg-[#fff0ec] px-3 py-2 text-sm text-[#9b422f]">
              {error}
            </p>
          )}
          <button
            onClick={() => void accept()}
            disabled={loading}
            className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl bg-[#183153] px-4 py-3 font-medium text-white disabled:opacity-60"
          >
            {loading && <LoaderCircle size={17} className="animate-spin" />}
            Aceptar invitación
          </button>
        </>
      ) : (
        <p className="text-sm text-[#9b422f]">
          El enlace no contiene una invitación válida.
        </p>
      )}
      <Link
        href="/"
        className="mt-5 block text-center text-sm font-medium text-[#3567a8]"
      >
        Volver a Deciflujo
      </Link>
    </AuthLayout>
  );
}

export default function AcceptInvitationPage() {
  return (
    <Suspense fallback={null}>
      <InvitationContent />
    </Suspense>
  );
}
