import type { ReactNode } from "react";
import { Building2, ChartNoAxesCombined, ShieldCheck } from "lucide-react";
import Link from "next/link";

type AuthLayoutProps = {
  children: ReactNode;
  eyebrow: string;
  title: string;
  description: string;
};

export function AuthLayout({
  children,
  eyebrow,
  title,
  description,
}: AuthLayoutProps) {
  return (
    <main className="grid min-h-screen bg-[#f7f8fa] lg:grid-cols-[1.05fr_0.95fr]">
      <section className="hidden overflow-hidden bg-[#142b49] p-12 text-white lg:flex lg:flex-col">
        <div className="flex items-center gap-3">
          <div className="grid size-11 place-items-center rounded-xl bg-white/12">
            <Building2 size={22} />
          </div>
          <div>
            <p className="text-lg font-semibold">Deciflujo</p>
            <p className="text-xs text-white/60">Decisiones con contexto</p>
          </div>
        </div>
        <div className="my-auto max-w-xl">
          <p className="mb-5 text-xs font-semibold uppercase tracking-[0.2em] text-[#a9c5e7]">
            Finanzas que explican
          </p>
          <h2 className="text-5xl font-semibold leading-[1.08] tracking-[-0.045em]">
            Tu empresa no necesita más números. Necesita entenderlos.
          </h2>
          <div className="mt-10 grid gap-4 sm:grid-cols-2">
            <div className="rounded-2xl border border-white/10 bg-white/6 p-5">
              <ChartNoAxesCombined className="mb-4 text-[#a9c5e7]" />
              <p className="font-medium">Pulso y escenarios</p>
              <p className="mt-1 text-sm leading-6 text-white/60">
                Observa el presente y ensaya decisiones antes de tomarlas.
              </p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/6 p-5">
              <ShieldCheck className="mb-4 text-[#a9c5e7]" />
              <p className="font-medium">Datos separados</p>
              <p className="mt-1 text-sm leading-6 text-white/60">
                Cada empresa conserva su propio espacio financiero.
              </p>
            </div>
          </div>
        </div>
        <p className="text-xs text-white/40">
          Proyecto de ingeniería de software · Deciflujo
        </p>
      </section>

      <section className="flex items-center justify-center px-5 py-12 sm:px-10">
        <div className="w-full max-w-md">
          <div className="mb-8 flex items-center gap-3 lg:hidden">
            <div className="grid size-10 place-items-center rounded-xl bg-[#183153] text-white">
              <Building2 size={20} />
            </div>
            <p className="font-semibold">Deciflujo</p>
          </div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#3567a8]">
            {eyebrow}
          </p>
          <h1 className="mt-3 text-3xl font-semibold tracking-[-0.035em] text-[#18212f]">
            {title}
          </h1>
          <p className="mt-3 leading-7 text-[#697586]">{description}</p>
          <div className="mt-8 rounded-2xl border border-[#dce3ec] bg-white p-6 shadow-[0_18px_50px_rgba(27,54,39,0.07)] sm:p-8">
            {children}
          </div>
          <p className="mt-5 text-center text-xs text-[#7b8696]">
            <Link href="/privacy" className="hover:underline">Privacidad</Link>
            <span className="mx-2">·</span>
            <Link href="/terms" className="hover:underline">Términos</Link>
          </p>
        </div>
      </section>
    </main>
  );
}
