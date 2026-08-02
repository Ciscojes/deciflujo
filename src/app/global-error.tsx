"use client";

import * as Sentry from "@sentry/nextjs";
import { useEffect } from "react";

export default function GlobalError({ error }: { error: Error & { digest?: string } }) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <html lang="es">
      <body className="flex min-h-screen items-center justify-center bg-[#F7F8FA] px-6 text-[#183153]">
        <main className="max-w-md rounded-2xl border border-[#d8e1ea] bg-white p-8 text-center shadow-sm">
          <h1 className="text-xl font-semibold">Algo no salió como esperábamos</h1>
          <p className="mt-3 text-sm text-[#607086]">
            El incidente quedó registrado si el monitoreo está habilitado. Recarga la página para intentarlo nuevamente.
          </p>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="mt-6 rounded-xl bg-[#3567A8] px-4 py-2 text-sm font-semibold text-white"
          >
            Recargar
          </button>
        </main>
      </body>
    </html>
  );
}
