import Link from 'next/link'
import { LOGO_BASE64 } from '@/lib/logo-base64'

export default function PrivacidadePage() {
  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="border-b sticky top-0 bg-white/95 backdrop-blur-sm z-50">
        <div className="max-w-4xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link href="/">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={LOGO_BASE64} alt="BoraGerir" style={{ height: '32px' }} />
          </Link>
          <Link href="/" className="text-sm text-gray-500 hover:text-gray-800 transition-colors">
            ← Voltar ao site
          </Link>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-4xl mx-auto px-6 py-12">
        {/* Title */}
        <div className="text-center mb-12">
          <h1 className="text-3xl font-bold text-gray-900 mb-3">Política de Privacidade</h1>
          <p className="text-sm text-gray-500">Última atualização: 11 de julho de 2026</p>
        </div>

        {/* Intro */}
        <div className="prose prose-gray max-w-none">
          <p className="text-gray-700 leading-relaxed mb-8">
            Esta Política de Privacidade descreve como <strong>Bora Gerir Chat Plataforma</strong>, operada por 32.420.180 JOAO VITOR SILVEIRA CANTUARIA, CNPJ 32.420.180/0001-57, coleta, usa, armazena e compartilha informações quando você utiliza nossa plataforma de atendimento ao cliente via WhatsApp.
          </p>
          <p className="text-gray-700 leading-relaxed mb-10">
            Nossa plataforma é integrada à API Oficial do WhatsApp Business, fornecida pela Meta Platforms, Inc., e está sujeita também às Políticas de Privacidade e Termos de Serviço da Meta.
          </p>

          {/* Section 1 */}
          <Section number="1" title="INFORMAÇÕES QUE COLETAMOS">
            <p className="text-gray-700 leading-relaxed mb-4">
              Ao utilizar nossa plataforma, coletamos os seguintes tipos de dados:
            </p>
            <ul className="space-y-3 text-gray-700">
              <li><strong>Dados de conta e empresa:</strong> nome da empresa, CNPJ, endereço de e-mail, número de telefone de contato e logotipo fornecidos no momento do cadastro.</li>
              <li><strong>Dados de agentes e usuários:</strong> nome completo, endereço de e-mail e credenciais de acesso dos atendentes cadastrados na plataforma.</li>
              <li><strong>Dados de contatos do WhatsApp:</strong> números de telefone, nomes de perfil e fotos de perfil dos contatos que interagem com a empresa cliente através do WhatsApp.</li>
              <li><strong>Conteúdo de mensagens:</strong> textos, imagens, áudios, vídeos, documentos e demais arquivos trocados nas conversas via WhatsApp Business API, incluindo metadados como data, hora e status de entrega das mensagens.</li>
              <li><strong>Dados de configuração do WhatsApp Business:</strong> tokens de acesso à API da Meta, Phone Number ID e Business Account ID fornecidos pelas empresas clientes para integração com a API Oficial do WhatsApp.</li>
              <li><strong>Dados de uso da plataforma:</strong> informações sobre como a plataforma é utilizada, incluindo horários de acesso, funcionalidades utilizadas e volume de mensagens processadas.</li>
              <li><strong>Dados técnicos:</strong> endereço IP, tipo de navegador, sistema operacional e dados de cookies necessários para o funcionamento da plataforma.</li>
            </ul>
          </Section>

          {/* Section 2 */}
          <Section number="2" title="COMO USAMOS SUAS INFORMAÇÕES">
            <p className="text-gray-700 leading-relaxed mb-4">
              Utilizamos os dados coletados exclusivamente para as seguintes finalidades:
            </p>
            <ul className="space-y-3 text-gray-700">
              <li>Prestação do serviço de atendimento ao cliente via WhatsApp, permitindo que empresas gerenciem conversas com seus clientes através da API Oficial do WhatsApp Business da Meta.</li>
              <li>Autenticação e controle de acesso dos atendentes cadastrados na plataforma.</li>
              <li>Envio e recebimento de mensagens através da API Oficial do WhatsApp Business em nome das empresas clientes.</li>
              <li>Geração de relatórios e métricas de atendimento para as empresas clientes.</li>
              <li>Melhoria contínua da plataforma com base em dados agregados e anonimizados de uso.</li>
              <li>Comunicação com as empresas clientes sobre atualizações, manutenções e suporte técnico.</li>
              <li>Cumprimento de obrigações legais e regulatórias aplicáveis.</li>
            </ul>
            <p className="text-gray-700 leading-relaxed mt-4 bg-gray-50 p-4 rounded-lg border-l-4 border-[#F26522]">
              Não utilizamos o conteúdo das mensagens trocadas entre empresas e seus clientes para fins de publicidade, treinamento de modelos de inteligência artificial ou qualquer outro fim que não seja a prestação direta do serviço contratado.
            </p>
          </Section>

          {/* Section 3 */}
          <Section number="3" title="INTEGRAÇÃO COM A META E O WHATSAPP">
            <p className="text-gray-700 leading-relaxed mb-4">
              Nossa plataforma utiliza a API Oficial do WhatsApp Business fornecida pela Meta Platforms, Inc. para processar mensagens. Ao utilizar nossa plataforma, você reconhece que:
            </p>
            <ul className="space-y-3 text-gray-700">
              <li>O envio e recebimento de mensagens via WhatsApp são processados através da infraestrutura da Meta, estando sujeitos à <a href="https://www.facebook.com/privacy/policy" target="_blank" rel="noopener noreferrer" className="text-[#F26522] hover:underline">Política de Privacidade da Meta</a>.</li>
              <li>As empresas clientes são responsáveis por obter o consentimento adequado de seus usuários finais antes de enviar mensagens via WhatsApp, conforme exigido pelas políticas da Meta e pela legislação aplicável.</li>
              <li>Os tokens de acesso e credenciais da API da Meta fornecidos pelas empresas clientes são armazenados de forma criptografada e utilizados exclusivamente para a integração técnica com a API do WhatsApp Business.</li>
            </ul>
          </Section>

          {/* Section 4 */}
          <Section number="4" title="COMPARTILHAMENTO DE DADOS">
            <p className="text-gray-700 leading-relaxed mb-4 font-medium">
              Não vendemos, alugamos nem compartilhamos suas informações pessoais com terceiros para fins comerciais ou publicitários.
            </p>
            <p className="text-gray-700 leading-relaxed mb-4">
              Podemos compartilhar dados nas seguintes situações limitadas:
            </p>
            <ul className="space-y-3 text-gray-700">
              <li><strong>Com a Meta Platforms, Inc.:</strong> exclusivamente para o processamento técnico das mensagens via API Oficial do WhatsApp Business, conforme os termos de uso da plataforma da Meta.</li>
              <li><strong>Com prestadores de serviços técnicos:</strong> empresas que nos auxiliam na operação da plataforma, como serviços de hospedagem, banco de dados e infraestrutura de nuvem, sempre vinculados a contratos que garantem a proteção dos seus dados.</li>
              <li><strong>Por obrigação legal:</strong> quando exigido por lei, ordem judicial ou autoridade governamental competente.</li>
              <li><strong>Em caso de transferência de negócio:</strong> em situações de fusão, aquisição ou venda de ativos, mediante notificação prévia aos usuários afetados.</li>
            </ul>
          </Section>

          {/* Section 5 */}
          <Section number="5" title="RETENÇÃO DE DADOS">
            <ul className="space-y-3 text-gray-700">
              <li>Mantemos seus dados pelo tempo necessário para a prestação dos serviços contratados e pelo período mínimo exigido pela legislação brasileira aplicável.</li>
              <li>Dados de mensagens e conversas são armazenados pelo período de vigência do contrato com a empresa cliente, acrescido de 90 dias após o encerramento, para fins de suporte e eventual resolução de disputas.</li>
              <li>Dados de conta são mantidos pelo período de vigência do contrato e podem ser excluídos mediante solicitação formal após o encerramento da relação contratual.</li>
              <li>Após os períodos de retenção, os dados são permanentemente excluídos ou anonimizados de forma irreversível.</li>
            </ul>
          </Section>

          {/* Section 6 */}
          <Section number="6" title="SEGURANÇA DOS DADOS">
            <p className="text-gray-700 leading-relaxed mb-4">
              Adotamos medidas técnicas e organizacionais adequadas para proteger suas informações contra acesso não autorizado, alteração, divulgação ou destruição, incluindo:
            </p>
            <ul className="space-y-3 text-gray-700">
              <li>Criptografia dos dados em trânsito via protocolo HTTPS/TLS.</li>
              <li>Criptografia dos dados sensíveis armazenados, como tokens de acesso à API da Meta.</li>
              <li>Controle de acesso baseado em funções, garantindo que cada atendente acesse apenas os dados necessários para suas funções.</li>
              <li>Monitoramento contínuo da plataforma para detecção de acessos suspeitos.</li>
              <li>Backups regulares com armazenamento seguro.</li>
            </ul>
          </Section>

          {/* Section 7 */}
          <Section number="7" title="DIREITOS DOS TITULARES DE DADOS">
            <p className="text-gray-700 leading-relaxed mb-4">
              Em conformidade com a Lei Geral de Proteção de Dados (LGPD, Lei nº 13.709/2018), você tem os seguintes direitos:
            </p>
            <ul className="space-y-3 text-gray-700">
              <li><strong>Acesso:</strong> solicitar confirmação sobre o tratamento e acesso aos seus dados pessoais.</li>
              <li><strong>Correção:</strong> solicitar a correção de dados incompletos, inexatos ou desatualizados.</li>
              <li><strong>Exclusão:</strong> solicitar a exclusão dos seus dados pessoais, observados os prazos legais de retenção.</li>
              <li><strong>Portabilidade:</strong> solicitar a portabilidade dos seus dados para outro fornecedor de serviço.</li>
              <li><strong>Revogação do consentimento:</strong> revogar o consentimento dado para o tratamento dos seus dados, quando aplicável.</li>
              <li><strong>Oposição:</strong> opor-se ao tratamento de dados realizado com fundamento em legítimo interesse.</li>
              <li><strong>Informação:</strong> obter informações sobre as entidades com as quais compartilhamos seus dados.</li>
            </ul>
            <p className="text-gray-700 leading-relaxed mt-4">
              Para exercer qualquer desses direitos, entre em contato conosco através do e-mail <a href="mailto:contato@boragerir.com" className="text-[#F26522] hover:underline">contato@boragerir.com</a>. Responderemos sua solicitação em até 15 dias úteis.
            </p>
          </Section>

          {/* Section 8 */}
          <Section number="8" title="COOKIES E TECNOLOGIAS DE RASTREAMENTO">
            <p className="text-gray-700 leading-relaxed mb-4">
              Nossa plataforma utiliza cookies e tecnologias similares para:
            </p>
            <ul className="space-y-3 text-gray-700">
              <li>Manter sua sessão autenticada durante o uso da plataforma.</li>
              <li>Lembrar suas preferências de configuração.</li>
              <li>Coletar dados agregados sobre o uso da plataforma para fins de melhoria do serviço.</li>
            </ul>
            <p className="text-gray-700 leading-relaxed mt-4">
              Você pode configurar seu navegador para recusar cookies, mas isso pode impactar o funcionamento adequado da plataforma.
            </p>
          </Section>

          {/* Section 9 */}
          <Section number="9" title="TRANSFERÊNCIA INTERNACIONAL DE DADOS">
            <p className="text-gray-700 leading-relaxed">
              Ao utilizar nossa plataforma, seus dados podem ser processados em servidores localizados fora do Brasil, incluindo nos servidores da Meta Platforms, Inc. nos Estados Unidos. Garantimos que tais transferências ocorram em conformidade com a LGPD e mediante salvaguardas adequadas de proteção de dados.
            </p>
          </Section>

          {/* Section 10 */}
          <Section number="10" title="DADOS DE MENORES">
            <p className="text-gray-700 leading-relaxed">
              Nossa plataforma é destinada exclusivamente ao uso empresarial por pessoas maiores de 18 anos. Não coletamos intencionalmente dados de menores de idade. Caso identifiquemos que coletamos dados de menores sem consentimento adequado, tomaremos as medidas necessárias para excluí-los imediatamente.
            </p>
          </Section>

          {/* Section 11 */}
          <Section number="11" title="ALTERAÇÕES NESTA POLÍTICA">
            <p className="text-gray-700 leading-relaxed">
              Podemos atualizar esta Política de Privacidade periodicamente para refletir mudanças em nossas práticas, na legislação aplicável ou nas políticas da Meta. Notificaremos as empresas clientes sobre alterações relevantes por e-mail ou através de aviso na plataforma com no mínimo 15 dias de antecedência. O uso continuado da plataforma após a notificação implica aceitação da política atualizada.
            </p>
          </Section>

          {/* Section 12 */}
          <Section number="12" title="CONTATO E ENCARREGADO DE DADOS (DPO)">
            <p className="text-gray-700 leading-relaxed mb-6">
              Para dúvidas, solicitações ou reclamações relacionadas a esta Política de Privacidade ou ao tratamento dos seus dados pessoais, entre em contato:
            </p>
            <div className="bg-gray-50 rounded-xl p-6 space-y-3 border">
              <p className="text-gray-800 font-semibold">32.420.180 JOAO VITOR SILVEIRA CANTUARIA</p>
              <p className="text-gray-600 text-sm">CNPJ: 32.420.180/0001-57</p>
              <p className="text-gray-600 text-sm">E-mail: <a href="mailto:contato@joaovcantuaria.com" className="text-[#F26522] hover:underline">contato@joaovcantuaria.com</a></p>
              <p className="text-gray-600 text-sm">Endereço: Rua Santos Dumont, 20 — Centro, Porteirinha, Minas Gerais — Brasil</p>
              <p className="text-gray-600 text-sm">Telefone: +55 (38) 9 9920-9694</p>
            </div>
            <div className="bg-gray-50 rounded-xl p-6 space-y-2 border mt-4">
              <p className="text-gray-800 font-semibold">Encarregado de Proteção de Dados (DPO)</p>
              <p className="text-gray-600 text-sm">João Vitor Silveira Cantuária</p>
              <p className="text-gray-600 text-sm">E-mail: <a href="mailto:contato@joaovcantuaria.com" className="text-[#F26522] hover:underline">contato@joaovcantuaria.com</a></p>
            </div>
            <p className="text-gray-600 text-sm mt-6">
              Você também pode registrar reclamações perante a Autoridade Nacional de Proteção de Dados (ANPD) através do site <a href="https://www.gov.br/anpd" target="_blank" rel="noopener noreferrer" className="text-[#F26522] hover:underline">www.gov.br/anpd</a>.
            </p>
          </Section>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t py-8 mt-12">
        <div className="max-w-4xl mx-auto px-6 text-center">
          <p className="text-sm text-gray-400">
            © {new Date().getFullYear()} BoraGerir Conversas. Todos os direitos reservados.
          </p>
        </div>
      </footer>
    </div>
  )
}

function Section({ number, title, children }: { number: string; title: string; children: React.ReactNode }) {
  return (
    <section className="mb-10">
      <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-3">
        <span className="flex items-center justify-center h-8 w-8 rounded-lg bg-[#F26522]/10 text-[#F26522] text-sm font-bold shrink-0">
          {number}
        </span>
        {title}
      </h2>
      {children}
    </section>
  )
}
