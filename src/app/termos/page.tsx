import type { Metadata } from "next";
import Link from "next/link";
import { LegalShell, LegalSection } from "@/components/legal-shell";

export const metadata: Metadata = {
  title: "Termos de Uso — ALIANZA",
  description: "Condições de uso da plataforma ALIANZA.",
};

export default function TermosPage() {
  return (
    <LegalShell
      title="Termos de Uso"
      intro="Estes Termos regem o uso da plataforma ALIANZA de gestão de licenciamento de marcas. Ao acessar ou utilizar a plataforma, você concorda com estas condições."
    >
      <LegalSection title="1. Objeto">
        <p>
          A ALIANZA disponibiliza um sistema de gestão de licenciamento — contratos, royalties, produtos, suprimentos,
          qualidade, BI e portais externos — fornecido de forma multiempresa (multi-tenant) às organizações contratantes.
        </p>
      </LegalSection>

      <LegalSection title="2. Contas e acesso">
        <p>
          O acesso é individual e intransferível, mediante credenciais e, quando habilitada, autenticação em duas etapas.
          Você é responsável por manter suas credenciais em sigilo e por todas as ações realizadas em sua conta. Notifique
          imediatamente o suporte em caso de uso não autorizado.
        </p>
      </LegalSection>

      <LegalSection title="3. Uso aceitável">
        <p>
          É vedado utilizar a plataforma para fins ilícitos, tentar burlar controles de segurança ou de acesso, acessar
          dados de outras organizações, ou sobrecarregar a infraestrutura. O uso deve respeitar a legislação aplicável e
          os direitos de terceiros.
        </p>
      </LegalSection>

      <LegalSection title="4. Propriedade intelectual">
        <p>
          O software, a marca ALIANZA e os elementos da plataforma são protegidos por direitos de propriedade intelectual.
          Os dados inseridos pela organização contratante permanecem de sua titularidade.
        </p>
      </LegalSection>

      <LegalSection title="5. Proteção de dados">
        <p>
          O tratamento de dados pessoais observa a{" "}
          <Link href="/privacidade" className="font-medium text-blue-600">Política de Privacidade</Link>, parte integrante
          destes Termos, em conformidade com a LGPD.
        </p>
      </LegalSection>

      <LegalSection title="6. Disponibilidade e limitação de responsabilidade">
        <p>
          Empregamos esforços para manter a plataforma disponível e segura, mas o serviço é fornecido &quot;no estado em que
          se encontra&quot;. Não nos responsabilizamos por indisponibilidades decorrentes de terceiros, força maior ou uso
          indevido.
        </p>
      </LegalSection>

      <LegalSection title="7. Suporte">
        <p>Canais de atendimento estão disponíveis na plataforma e nas páginas de acesso.</p>
      </LegalSection>

      <LegalSection title="8. Legislação e foro">
        <p>
          Estes Termos são regidos pela legislação brasileira. Fica eleito o foro do domicílio da organização contratante
          para dirimir controvérsias, salvo disposição legal em contrário.
        </p>
      </LegalSection>
    </LegalShell>
  );
}
