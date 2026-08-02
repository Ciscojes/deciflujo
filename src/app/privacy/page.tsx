import { DocumentLayout } from "@/components/legal/document-layout";

export default function PrivacyPage() {
  return (
    <DocumentLayout eyebrow="Borrador previo a publicación" title="Política de privacidad">
      <p>
        Deciflujo procesa nombre, correo, membresías y la información financiera
        que cada persona registra para prestar el servicio. No vende datos ni
        utiliza movimientos financieros para publicidad.
      </p>
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
    </DocumentLayout>
  );
}
