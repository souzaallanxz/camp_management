import { createFileRoute } from '@tanstack/react-router'
import { ArrowLeft } from 'lucide-react'
import { Link } from '@tanstack/react-router'
import { Button } from '@/components/ui/button'

function TermsPage() {
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
        <h1 className="text-3xl font-bold mb-8">Termos e Condições</h1>
        
        <div className="space-y-6 text-sm leading-relaxed">
          <section>
            <h2 className="text-xl font-semibold mb-3">1. Aceitação dos Termos</h2>
            <p>
              Ao criar uma conta ou utilizar a plataforma Campy (doravante "Plataforma" ou "Campy"), 
              está a concordar com os presentes Termos e Condições. Se não concordar, não deverá 
              utilizar a Plataforma.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">2. Sobre a Campy</h2>
            <p>
              A Campy é uma plataforma online de gestão de acampamentos, permitindo a organização 
              de inscrições, gestão de participantes e atividades, comunicação com encarregados 
              de educação, entre outras funcionalidades.
            </p>
            <p className="mt-2">
              A Campy é operada por:
            </p>
            <p className="mt-1">
              <strong>Campy</strong><br />
              Morada: Rua Mariano Pina, Porto Salvo<br />
              Email de contacto: noreply@campy.pt
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">3. Criação de Conta</h2>
            <p>
              Para utilizar a Plataforma, deve criar uma conta fornecendo dados verdadeiros e 
              atualizados. O utilizador é responsável por manter a confidencialidade das suas 
              credenciais de acesso.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">4. Planos e Pagamentos</h2>
            <p>A Campy disponibiliza:</p>
            <ul className="list-disc list-inside mt-2 space-y-1">
              <li><strong>Plano Gratuito:</strong> acesso limitado a funcionalidades.</li>
              <li><strong>Plano Premium (19€/mês):</strong> acesso completo às funcionalidades premium.</li>
            </ul>
            <p className="mt-2">
              Os pagamentos são efetuados de forma antecipada e renovados automaticamente 
              mensalmente, salvo cancelamento prévio pelo utilizador antes do próximo ciclo 
              de faturação.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">5. Cancelamento e Reembolsos</h2>
            <p>
              O utilizador pode cancelar o plano premium a qualquer momento através da área 
              de gestão de conta. Após o cancelamento, o acesso ao plano premium manter-se-á 
              até ao final do período pago. Não são efetuados reembolsos relativos a períodos 
              já pagos.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">6. Utilização Aceitável</h2>
            <p>O utilizador compromete-se a:</p>
            <ul className="list-disc list-inside mt-2 space-y-1">
              <li>Não utilizar a Campy para atividades ilegais.</li>
              <li>Não introduzir vírus ou outros elementos que possam prejudicar o funcionamento da Plataforma.</li>
              <li>Utilizar a Plataforma de acordo com as leis em vigor.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">7. Propriedade Intelectual</h2>
            <p>
              Todos os direitos de propriedade intelectual relacionados com a Campy, incluindo 
              software, design e marca, pertencem à Campy ou aos seus licenciantes. O utilizador 
              não adquire qualquer direito de propriedade sobre a Plataforma.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">8. Proteção de Dados</h2>
            <p>
              A Campy cumpre o Regulamento Geral de Proteção de Dados (RGPD). Os dados pessoais 
              dos utilizadores são tratados para gestão da conta, faturação e funcionamento da 
              Plataforma. Para mais detalhes, consulte a nossa{' '}
              <Link to="/privacy" className="text-primary hover:underline">
                Política de Privacidade
              </Link>.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">9. Limitação de Responsabilidade</h2>
            <p>
              A Campy será responsável apenas por danos diretos causados por dolo ou negligência 
              grave. Não nos responsabilizamos por perdas indiretas, lucros cessantes ou 
              interrupções de serviço fora do nosso controlo.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">10. Alterações aos Termos</h2>
            <p>
              Reservamo-nos o direito de atualizar estes Termos e Condições. Será notificado 
              em caso de alterações materiais. A utilização continuada da Plataforma após as 
              alterações constitui aceitação dos novos Termos.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">11. Lei Aplicável e Foro</h2>
            <p>
              Estes Termos são regidos pela lei portuguesa. Em caso de litígio, as partes 
              elegem o foro da comarca de Lisboa como competente, com renúncia a qualquer outro.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">12. Contacto</h2>
            <p>
              Para quaisquer questões relacionadas com estes Termos, poderá contactar-nos 
              através de: <a href="mailto:noreply@campy.pt" className="text-primary hover:underline">noreply@campy.pt</a>
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

export const Route = createFileRoute('/terms')({
  component: TermsPage,
}) 