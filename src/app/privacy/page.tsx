import { DocumentLayout } from "@/components/legal/document-layout";

export default function PrivacyPage() {
  return (
    <DocumentLayout eyebrow="Borrador previo a publicación" title="Política de privacidad">
      <p>
        Este documento es un borrador previo al lanzamiento. Deciflujo procesa
        nombre, correo, membresías e información financiera registrada por cada
        empresa para prestar el servicio. No vende esos datos ni utiliza los
        movimientos financieros para publicidad.
      </p>
      <section>
        <h2 className="font-semibold text-[#293648]">Información tratada</h2>
        <p className="mt-2">
          Se procesan datos de cuenta y sesión, empresas y roles, movimientos,
          cuentas, presupuestos, decisiones, auditoría y comunicaciones de
          soporte. Los registros técnicos pueden incluir fecha, ruta y detalles
          mínimos de errores, pero el monitoreo no debe recibir información
          financiera ni credenciales.
        </p>
      </section>
      <section>
        <h2 className="font-semibold text-[#293648]">Uso y separación</h2>
        <p className="mt-2">
          Los datos se usan para autenticación, colaboración, reportes y
          recuperación de acceso. Cada consulta financiera exige sesión,
          empresa activa y permisos; una empresa no puede consultar otra.
        </p>
      </section>
      <section>
        <h2 className="font-semibold text-[#293648]">Proveedores</h2>
        <p className="mt-2">
          El despliegue podrá usar PostgreSQL administrado, alojamiento web y
          Resend para entregar correos. Antes de publicar se documentarán los
          proveedores definitivos, ubicación, retención y contacto responsable.
        </p>
      </section>
      <section>
        <h2 className="font-semibold text-[#293648]">Derechos y retención</h2>
        <p className="mt-2">
          Se definirá un canal para solicitar acceso, corrección o eliminación.
          Los respaldos tendrán retención limitada y acceso restringido. Este
          texto necesita revisión legal antes de aceptar usuarios reales.
        </p>
      </section>
      <section>
        <h2 className="font-semibold text-[#293648]">Seguridad e incidentes</h2>
        <p className="mt-2">
          Deciflujo aplica aislamiento por empresa, permisos, sesiones seguras,
          cifrado en tránsito y respaldos restringidos en el entorno definitivo.
          El procedimiento de incidentes y el plazo de notificación se
          publicarán después de la revisión legal y operativa.
        </p>
      </section>
      <section>
        <h2 className="font-semibold text-[#293648]">Contacto</h2>
        <p className="mt-2">
          Antes del lanzamiento se publicarán la identidad del responsable y un
          correo verificado para consultas, acceso, corrección y eliminación.
        </p>
      </section>
    </DocumentLayout>
  );
}
