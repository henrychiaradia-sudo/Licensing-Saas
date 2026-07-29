import type { Metadata } from "next";
import Link from "next/link";
import { LegalShell, LegalSection } from "@/components/legal-shell";

export const metadata: Metadata = {
  title: "Política de Privacidade — ALIANZA",
  description: "Como a ALIANZA trata dados pessoais, conforme a LGPD.",
};

export default function PrivacidadePage() {
  return (
    <LegalShell
      title="Política de Privacidade"
      intro="Esta Política explica como a plataforma ALIANZA coleta, usa, compartilha e protege dados pessoais, em conformidade com a Lei Geral de Proteção de Dados (Lei nº 13.709/2018 — LGPD). Ao utilizar a plataforma, você declara estar ciente destas práticas."
    >
      <LegalSection title="1. Controlador dos dados">
        <p>
          O tratamento dos dados pessoais na plataforma é realizado pela organização contratante (tenant) que opera
          sua instância ALIANZA, na qualidade de <strong>controladora</strong>. A ALIANZA atua como{" "}
          <strong>operadora</strong>, tratando os dados conforme as instruções da controladora e esta Política.
        </p>
      </LegalSection>

      <LegalSection title="2. Dados que tratamos">
        <p>Coletamos apenas os dados necessários à operação de licenciamento de marcas:</p>
        <ul className="ml-4 list-disc space-y-1">
          <li><strong>Cadastro e acesso:</strong> nome, e-mail, senha (armazenada com hash), perfil de acesso, autenticação em duas etapas (2FA).</li>
          <li><strong>Contato de parceiros:</strong> nomes, e-mails e telefones de contatos de licenciados, fornecedores e agências.</li>
          <li><strong>Dados cadastrais de empresas:</strong> razão social, nome fantasia, CNPJ/inscrição, endereço, cidade/estado, site.</li>
          <li><strong>Dados financeiros/bancários:</strong> contas bancárias e chave PIX de fornecedores (para pagamentos).</li>
          <li><strong>Registros de uso e segurança:</strong> datas de acesso, endereço IP e trilha de auditoria das ações realizadas.</li>
          <li><strong>Cookies estritamente necessários:</strong> um cookie de sessão para manter você autenticado.</li>
        </ul>
      </LegalSection>

      <LegalSection title="3. Finalidades e bases legais">
        <p>Tratamos dados pessoais para as seguintes finalidades e bases legais (art. 7º da LGPD):</p>
        <ul className="ml-4 list-disc space-y-1">
          <li><strong>Execução de contrato:</strong> operar contratos de licenciamento, royalties, compras e pagamentos com licenciados e fornecedores.</li>
          <li><strong>Cumprimento de obrigação legal/regulatória:</strong> emissão fiscal, guarda de documentos e registros.</li>
          <li><strong>Legítimo interesse:</strong> segurança da informação, prevenção a fraude, auditoria e melhoria da plataforma — sempre respeitando seus direitos.</li>
          <li><strong>Consentimento:</strong> quando aplicável, para comunicações de marketing e captação de leads comerciais.</li>
        </ul>
      </LegalSection>

      <LegalSection title="4. Compartilhamento">
        <p>
          Não vendemos dados pessoais. Podemos compartilhá-los com provedores de infraestrutura e serviços essenciais
          (hospedagem, banco de dados, cotação cambial, e-mail) estritamente para operar a plataforma, sob obrigações
          de confidencialidade e segurança, e com autoridades quando exigido por lei.
        </p>
      </LegalSection>

      <LegalSection title="5. Cookies">
        <p>
          Utilizamos apenas <strong>cookies estritamente necessários</strong> (o cookie de sessão que mantém seu login).
          Não usamos cookies de publicidade ou rastreamento de terceiros. Por serem essenciais, não dependem de
          consentimento prévio — apenas informamos seu uso.
        </p>
      </LegalSection>

      <LegalSection title="6. Segurança">
        <p>
          Adotamos medidas técnicas e organizacionais compatíveis com o art. 46 da LGPD: senhas com hash (bcrypt),
          autenticação em duas etapas (2FA), criptografia em trânsito (HTTPS), isolamento por organização (multi-tenant),
          controle de acesso por perfil (RBAC) e trilha de auditoria.
        </p>
      </LegalSection>

      <LegalSection title="7. Retenção e eliminação">
        <p>
          Mantemos os dados pelo tempo necessário às finalidades e obrigações legais. Encerrado o tratamento, os dados
          são eliminados ou anonimizados, ressalvadas as hipóteses de guarda obrigatória previstas em lei.
        </p>
      </LegalSection>

      <LegalSection title="8. Seus direitos (art. 18 da LGPD)">
        <p>Como titular, você pode, a qualquer tempo:</p>
        <ul className="ml-4 list-disc space-y-1">
          <li>Confirmar a existência de tratamento e acessar seus dados;</li>
          <li>Corrigir dados incompletos, inexatos ou desatualizados;</li>
          <li>Solicitar anonimização, bloqueio ou eliminação de dados desnecessários;</li>
          <li>Solicitar a portabilidade dos dados;</li>
          <li>Revogar o consentimento e obter informação sobre compartilhamentos.</li>
        </ul>
        <p>
          Usuários autenticados podem acessar e exportar seus dados na página{" "}
          <Link href="/meus-dados" className="font-medium text-blue-600">Meus Dados</Link>. Solicitações de
          eliminação/anonimização podem ser feitas ao encarregado (abaixo).
        </p>
      </LegalSection>

      <LegalSection title="9. Alterações">
        <p>
          Esta Política pode ser atualizada para refletir mudanças legais ou operacionais. A data de última atualização
          é indicada no topo desta página.
        </p>
      </LegalSection>
    </LegalShell>
  );
}
