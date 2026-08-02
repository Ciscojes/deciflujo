import type { ReactNode } from "react";
import Link from "next/link";

export function DocumentLayout({
  title,
  eyebrow,
  children,
}: {
  title: string;
  eyebrow: string;
  children: ReactNode;
}) {
  return (
    <main className="min-h-screen bg-[#f7f8fa] px-5 py-12 text-[#293648] sm:px-8">
      <article className="mx-auto max-w-3xl rounded-2xl border border-[#dce3ec] bg-white p-7 shadow-sm sm:p-10">
        <Link href="/" className="text-sm font-medium text-[#315f9b] hover:underline">
          ← Volver a Deciflujo
        </Link>
        <p className="mt-8 text-xs font-semibold uppercase tracking-[0.16em] text-[#4d785f]">
          {eyebrow}
        </p>
        <h1 className="mt-2 text-3xl font-semibold tracking-[-0.04em]">{title}</h1>
        <div className="prose prose-slate mt-8 max-w-none space-y-6 leading-7 text-[#596779]">
          {children}
        </div>
      </article>
    </main>
  );
}
