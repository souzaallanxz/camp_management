import { createFileRoute } from '@tanstack/react-router'
import { ArrowLeft } from 'lucide-react'
import { Link } from '@tanstack/react-router'
import { Button } from '@/components/ui/button'

function PrivacyPage() {
  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <div className="mb-6">
        <Link to="/">
          <Button variant="ghost" className="gap-2">
            <ArrowLeft className="h-4 w-4" />
            Voltar
          </Button>
        </Link>
      </div>
      
      <div className="prose prose-gray max-w-none">
        <h1 className="text-3xl font-bold mb-8">Política de Privacidade</h1>
        
        <div className="space-y-6 text-sm leading-relaxed">
          <section>
            <h2 className="text-xl font-semibold mb-3">1. Introdução</h2>
            <p>
              A Campy ("nós", "nosso" ou "Plataforma") está comprometida em proteger a sua 
              privacidade. Esta Política de Privacidade explica como recolhemos, utilizamos, 
              armazenamos e protegemos as suas informações pessoais quando utiliza a nossa 
              plataforma de gestão de acampamentos.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">2. Responsável pelo Tratamento</h2>
            <p>
              <strong>Campy</strong><br />
              Morada: Rua Mariano Pina, Porto Salvo<br />
              Email: hello@infolio.pt
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">3. Informações que Recolhemos</h2>
            <p>Recolhemos os seguintes tipos de informações:</p>
            
            <h3 className="text-lg font-medium mt-4 mb-2">3.1 Informações da Conta</h3>
            <ul className="list-disc list-inside space-y-1">
              <li>Nome completo</li>
              <li>Endereço de email</li>
              <li>Palavra-passe (encriptada)</li>
              <li>Informações de contacto</li>
            </ul>

            <h3 className="text-lg font-medium mt-4 mb-2">3.2 Informações dos Campistas</h3>
            <ul className="list-disc list-inside space-y-1">
              <li>Nome e dados pessoais dos campistas</li>
              <li>Informações de saúde e restrições alimentares</li>
              <li>Dados dos encarregados de educação</li>
              <li>Informações de pagamento</li>
            </ul>

            <h3 className="text-lg font-medium mt-4 mb-2">3.3 Informações de Utilização</h3>
            <ul className="list-disc list-inside space-y-1">
              <li>Dados de acesso e utilização da plataforma</li>
              <li>Informações técnicas (IP, navegador, dispositivo)</li>
              <li>Cookies e tecnologias similares</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">4. Finalidades do Tratamento</h2>
            <p>Utilizamos as suas informações para:</p>
            <ul className="list-disc list-inside mt-2 space-y-1">
              <li>Prestar serviços de gestão de acampamentos</li>
              <li>Processar inscrições e pagamentos</li>
              <li>Comunicar com encarregados de educação</li>
              <li>Melhorar a nossa plataforma e serviços</li>
              <li>Cumprir obrigações legais</li>
              <li>Enviar comunicações importantes sobre o serviço</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">5. Base Legal</h2>
            <p>O tratamento dos seus dados é baseado em:</p>
            <ul className="list-disc list-inside mt-2 space-y-1">
              <li><strong>Execução de contrato:</strong> para prestar os nossos serviços</li>
              <li><strong>Interesse legítimo:</strong> para melhorar os nossos serviços</li>
              <li><strong>Consentimento:</strong> para comunicações de marketing (quando aplicável)</li>
              <li><strong>Obrigação legal:</strong> para cumprir requisitos legais</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">6. Partilha de Informações</h2>
            <p>
              Não vendemos, alugamos ou partilhamos as suas informações pessoais com terceiros, 
              exceto nas seguintes situações:
            </p>
            <ul className="list-disc list-inside mt-2 space-y-1">
              <li>Com prestadores de serviços que nos ajudam a operar a plataforma</li>
              <li>Quando exigido por lei ou autoridades competentes</li>
              <li>Para proteger os nossos direitos e segurança</li>
              <li>Com o seu consentimento explícito</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">7. Segurança dos Dados</h2>
            <p>
              Implementamos medidas de segurança técnicas e organizacionais adequadas para 
              proteger as suas informações pessoais contra acesso não autorizado, alteração, 
              divulgação ou destruição.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">8. Retenção de Dados</h2>
            <p>
              Conservamos as suas informações pessoais apenas pelo tempo necessário para 
              cumprir as finalidades descritas nesta política, salvo quando a lei exige 
              um período de retenção mais longo.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">9. Os Seus Direitos</h2>
            <p>De acordo com o RGPD, tem os seguintes direitos:</p>
            <ul className="list-disc list-inside mt-2 space-y-1">
              <li><strong>Acesso:</strong> solicitar informações sobre os dados que temos sobre si</li>
              <li><strong>Retificação:</strong> corrigir dados inexatos ou incompletos</li>
              <li><strong>Apagamento:</strong> solicitar a eliminação dos seus dados</li>
              <li><strong>Portabilidade:</strong> receber os seus dados num formato estruturado</li>
              <li><strong>Oposição:</strong> opor-se ao tratamento dos seus dados</li>
              <li><strong>Limitação:</strong> solicitar a limitação do tratamento</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">10. Cookies</h2>
            <p>
              Utilizamos cookies e tecnologias similares para melhorar a sua experiência 
              na plataforma, analisar o tráfego e personalizar conteúdo. Pode gerir as 
              suas preferências de cookies através das configurações do seu navegador.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">11. Transferências Internacionais</h2>
            <p>
              Os seus dados podem ser processados em países fora do Espaço Económico Europeu. 
              Garantimos que essas transferências são protegidas por medidas adequadas, 
              como cláusulas contratuais padrão aprovadas pela Comissão Europeia.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">12. Alterações à Política</h2>
            <p>
              Podemos atualizar esta Política de Privacidade periodicamente. Notificaremos 
              sobre alterações significativas através da plataforma ou por email.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">13. Contacto</h2>
            <p>
              Para exercer os seus direitos ou esclarecer dúvidas sobre esta política, 
              contacte-nos através de: <a href="mailto:hello@infolio.pt" className="text-primary hover:underline">hello@infolio.pt</a>
            </p>
            <p className="mt-2">
              Também pode contactar a autoridade de controlo portuguesa (CNPD) se considerar 
              que o tratamento dos seus dados pessoais viola o RGPD.
            </p>
          </section>
        </div>

        <div className="mt-8 pt-6 border-t">
          <p className="text-sm text-muted-foreground">
            Última atualização: {new Date().toLocaleDateString('pt-PT')}
          </p>
        </div>
              </div>
      </div>
    )
  }

export const Route = createFileRoute('/privacy')({
  component: PrivacyPage,
}) 