"use client";

import Link from "next/link";

export function ResetGettingStarted() {
  function restore() {
    window.localStorage.removeItem("deciflujo:hide-getting-started");
  }

  return (
    <Link
      href="/"
      onClick={restore}
      className="inline-flex rounded-lg bg-[#183153] px-4 py-2.5 text-sm font-medium text-white hover:bg-[#102943]"
    >
      Volver a mostrar “Primeros pasos”
    </Link>
  );
}
