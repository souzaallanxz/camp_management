/**
 * Serviço para envio de emails usando a API da Resend
 */

// Interface para parâmetros do email
interface SendEmailParams {
  to: string;
  subject: string;
  html: string;
  text?: string;
  from?: string;
}

// Interface para resultados do email
interface EmailResult {
  success: boolean;
  data?: { id: string };
  error?: { name: string; message: string };
}

// URL completa da API proxy para o Resend
const EMAIL_API_URL = 'http://localhost:3001/api/send-email';
const RESEND_API_KEY = import.meta.env.VITE_RESEND_API_KEY || 'demokey';

// Verifica se estamos em modo de demonstração
const IS_DEMO_MODE = !RESEND_API_KEY || RESEND_API_KEY === 'demokey';

export const emailService = {
  /**
   * Envia um email usando a API da Resend
   */
  async sendEmail({
    to,
    subject,
    html,
    text,
    from = 'recuperacao@infolio.pt',
  }: SendEmailParams): Promise<EmailResult> {
    try {
      // Em ambiente de demonstração, use fallback local
      if (import.meta.env.DEV && IS_DEMO_MODE) {
        // eslint-disable-next-line no-console
        console.log('Usando fallback local para envio de email em ambiente de desenvolvimento');
        
        // Cria um ID simulado para o email
        const emailId = `demo-email-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
        
        // Armazena o email localmente para referência
        const emailData = {
          id: emailId,
          to,
          from,
          subject,
          html,
          text,
          sentAt: new Date().toISOString()
        };
        
        // Salva no localStorage para poder visualizar depois
        localStorage.setItem(`email_${emailId}`, JSON.stringify(emailData));
        
        // Exibe informações sobre o email simulado no console
        // eslint-disable-next-line no-console
        console.log('==========================================');
        // eslint-disable-next-line no-console
        console.log('SIMULAÇÃO DE EMAIL (Modo de demonstração)');
        // eslint-disable-next-line no-console
        console.log('------------------------------------------');
        // eslint-disable-next-line no-console
        console.log(`De: ${from}`);
        // eslint-disable-next-line no-console
        console.log(`Para: ${to}`);
        // eslint-disable-next-line no-console
        console.log(`Assunto: ${subject}`);
        // eslint-disable-next-line no-console
        console.log(`Conteúdo HTML: ${html.substring(0, 150)}...`);
        if (text) {
          // eslint-disable-next-line no-console
          console.log(`Conteúdo texto: ${text.substring(0, 150)}...`);
        }
        // eslint-disable-next-line no-console
        console.log('==========================================');
        
        return {
          success: true,
          data: { id: emailId }
        };
      }
      
      // Prepara os dados para a API
      const data = {
        from,
        to,
        subject,
        html,
        text: text || undefined
      };

      // Faz a requisição para o servidor proxy
      const response = await fetch(EMAIL_API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      // Processa a resposta
      const responseData = await response.json();

      // Verifica se a resposta foi bem-sucedida
      if (response.ok) {
        return {
          success: true,
          data: { id: responseData.data?.id || 'local-id' }
        };
      } else {
        return {
          success: false,
          error: responseData.error || {
            name: 'proxy_error',
            message: 'Falha ao enviar email'
          }
        };
      }
    } catch (error) {
      // Erro real em produção
      return {
        success: false,
        error: {
          name: 'network_error',
          message: error instanceof Error ? error.message : 'Erro ao conectar com o serviço de email'
        }
      };
    }
  },

  /**
   * Envia um email de recuperação de senha
   */
  async sendPasswordRecoveryEmail(email: string, resetLink: string): Promise<EmailResult> {
    const subject = 'Recuperação de senha';
    
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #333;">Recuperação de Senha</h2>
        <p>Você solicitou a recuperação de senha para sua conta.</p>
        <p>Clique no botão abaixo para redefinir sua senha:</p>
        <div style="text-align: center; margin: 30px 0;">
          <a href="${resetLink}" 
             style="background-color: #0070f3; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; font-weight: bold;">
            Redefinir Senha
          </a>
        </div>
        <p>Se você não solicitou esta recuperação, ignore este email.</p>
        <p>Este link expirará em 1 hora por motivos de segurança.</p>
        <hr style="border: 1px solid #eee; margin: 30px 0;" />
        <p style="color: #666; font-size: 12px;">© 2024 InfoLio. Todos os direitos reservados.</p>
      </div>
    `;

    const text = `
      Recuperação de Senha
      
      Você solicitou a recuperação de senha para sua conta.
      
      Para redefinir sua senha, acesse o link:
      ${resetLink}
      
      Se você não solicitou esta recuperação, ignore este email.
      
      Este link expirará em 1 hora por motivos de segurança.
    `;

    // Em ambiente de desenvolvimento, exibe o link no console para facilitar os testes
    if (import.meta.env.DEV && IS_DEMO_MODE) {
      // eslint-disable-next-line no-console
      console.log('==========================================');
      // eslint-disable-next-line no-console
      console.log('LINK DE RECUPERAÇÃO (DEV)');
      // eslint-disable-next-line no-console
      console.log(resetLink);
      // eslint-disable-next-line no-console
      console.log('==========================================');
    }

    return this.sendEmail({
      to: email,
      subject,
      html,
      text,
    });
  },
  
  // Variável de exportação para verificar se estamos em modo de demonstração
  isInDemoMode: IS_DEMO_MODE
}; 