import { DocumentLayout } from "@/components/legal/document-layout";

export default function TermsPage() {
  return (
    <DocumentLayout eyebrow="Borrador previo a publicación" title="Términos de uso">
      <p>
        Deciflujo es actualmente un producto en preparación. Los cálculos y
        reportes apoyan decisiones administrativas, pero no sustituyen asesoría
        contable, tributaria, financiera ni legal.
      </p>
      <section>
        <h2 className="font-semibold text-[#293648]">Uso responsable</h2>
        <p className="mt-2">
          Cada usuario debe proteger sus credenciales, registrar información
          autorizada y revisar los resultados antes de tomar decisiones. Queda
          prohibido intentar acceder a empresas ajenas o abusar del servicio.
        </p>
      </section>
      <section>
        <h2 className="font-semibold text-[#293648]">Disponibilidad y datos</h2>
        <p className="mt-2">
          Antes del lanzamiento se definirán niveles de servicio, respaldos,
          soporte, cancelación y eliminación. Este borrador no debe publicarse
          como acuerdo definitivo sin identidad jurídica y revisión profesional.
        </p>
      </section>
    </DocumentLayout>
  );
}
