import { DocumentLayout } from "@/components/legal/document-layout";
import { ResetGettingStarted } from "@/components/help/reset-getting-started";

export default function HelpPage() {
  return (
    <DocumentLayout eyebrow="Guía rápida" title="Centro de ayuda">
      <p>
        Empieza creando cuentas bancarias, de efectivo o tarjetas. Después
        registra ingresos y egresos siempre asociados a una cuenta.
      </p>
      <section>
        <h2 className="font-semibold text-[#293648]">Flujo recomendado</h2>
        <ol className="mt-2 list-decimal space-y-2 pl-5">
          <li>Retira los datos de ejemplo cuando estés listo.</li>
          <li>Registra cuentas y movimientos.</li>
          <li>Define presupuestos y cuentas por cobrar o pagar.</li>
          <li>Revisa reportes y tendencias.</li>
          <li>Cierra el mes cuando los datos estén confirmados.</li>
        </ol>
      </section>
      <p>
        Si olvidas tu contraseña, utiliza el enlace de recuperación del inicio
        de sesión. Los propietarios y administradores gestionan invitaciones y
        permisos desde Equipo.
      </p>
      <ResetGettingStarted />
    </DocumentLayout>
  );
}
