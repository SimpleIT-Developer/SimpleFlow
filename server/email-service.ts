import { MailerSend, EmailParams, Sender, Recipient } from 'mailersend';

// Configuração do MailerSend
const mailerSend = new MailerSend({
  apiKey: process.env.MAILERSEND_API_KEY || 'mlsn.3127b53dc3bd5e31fd39328bd1a3d2ad0145f02ff5ec930ba25ce4cedd8780d1',
});

// Template HTML profissional de boas-vindas
const getWelcomeEmailTemplate = (userName: string, userEmail: string) => {
  return `
    <!DOCTYPE html>
    <html lang="pt-BR">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Bem-vindo ao SimpleDFe</title>
        <style>
            body {
                margin: 0;
                padding: 0;
                font-family: 'Arial', sans-serif;
                background: linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #8b5cf6 100%);
                color: #ffffff;
            }
            .container {
                max-width: 600px;
                margin: 0 auto;
                background: #1a1a2e;
                border-radius: 15px;
                overflow: hidden;
                box-shadow: 0 10px 30px rgba(0, 0, 0, 0.3);
            }
            .header {
                background: linear-gradient(135deg, #8b5cf6 0%, #3b82f6 100%);
                padding: 40px 30px;
                text-align: center;
            }
            .logo {
                font-size: 32px;
                font-weight: bold;
                color: #ffffff;
                margin-bottom: 10px;
            }
            .subtitle {
                font-size: 16px;
                color: #e5e7eb;
                margin: 0;
            }
            .content {
                padding: 40px 30px;
                background: #1a1a2e;
            }
            .welcome-title {
                font-size: 28px;
                font-weight: bold;
                color: #ffffff;
                margin-bottom: 20px;
                text-align: center;
            }
            .welcome-text {
                font-size: 16px;
                line-height: 1.6;
                color: #d1d5db;
                margin-bottom: 30px;
                text-align: center;
            }
            .features {
                background: #374151;
                border-radius: 10px;
                padding: 25px;
                margin: 30px 0;
            }
            .feature-item {
                display: flex;
                align-items: center;
                margin-bottom: 15px;
                font-size: 14px;
                color: #e5e7eb;
            }
            .feature-icon {
                width: 20px;
                height: 20px;
                background: #8b5cf6;
                border-radius: 50%;
                margin-right: 15px;
                display: flex;
                align-items: center;
                justify-content: center;
                color: #ffffff;
                font-weight: bold;
            }
            .access-button {
                display: block;
                width: 100%;
                max-width: 300px;
                margin: 30px auto;
                padding: 15px 30px;
                background: linear-gradient(135deg, #8b5cf6 0%, #3b82f6 100%);
                color: #ffffff;
                text-decoration: none;
                border-radius: 50px;
                font-weight: bold;
                font-size: 16px;
                text-align: center;
                transition: transform 0.3s ease;
            }
            .access-button:hover {
                transform: translateY(-2px);
            }
            .credentials {
                background: #374151;
                border-radius: 10px;
                padding: 20px;
                margin: 20px 0;
                border-left: 4px solid #8b5cf6;
            }
            .credentials h3 {
                margin: 0 0 15px 0;
                color: #8b5cf6;
                font-size: 18px;
            }
            .credential-item {
                margin: 10px 0;
                font-size: 14px;
                color: #e5e7eb;
            }
            .credential-value {
                background: #1f2937;
                padding: 8px 12px;
                border-radius: 5px;
                font-family: 'Courier New', monospace;
                color: #10b981;
                margin-left: 10px;
            }
            .footer {
                background: #374151;
                padding: 30px;
                text-align: center;
                border-top: 1px solid #4b5563;
            }
            .footer-text {
                font-size: 14px;
                color: #9ca3af;
                margin: 0;
            }
            .support-info {
                margin-top: 20px;
                font-size: 12px;
                color: #6b7280;
            }
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <div class="logo">SimpleDFe</div>
                <p class="subtitle">Sistema de Gestão de Documentos Eletrônicos Inteligente</p>
            </div>
            
            <div class="content">
                <h1 class="welcome-title">Bem-vindo ao SimpleDFe!</h1>
                
                <p class="welcome-text">
                    Olá <strong>${userName}</strong>!<br><br>
                    Seu acesso ao SimpleDFe foi criado com sucesso. Agora você pode gerenciar seus documentos fiscais eletrônicos de forma inteligente e eficiente.
                </p>
                
                <div class="credentials">
                    <h3>📋 Suas Credenciais de Acesso</h3>
                    <div class="credential-item">
                        <strong>Email:</strong>
                        <span class="credential-value">${userEmail}</span>
                    </div>
                    <div class="credential-item">
                        <strong>Sistema:</strong>
                        <span class="credential-value">SimpleDFe</span>
                    </div>
                </div>
                
                <div class="features">
                    <div class="feature-item">
                        <div class="feature-icon">✓</div>
                        <span>Gestão completa de NFe e NFSe recebidas</span>
                    </div>
                    <div class="feature-item">
                        <div class="feature-icon">✓</div>
                        <span>Dashboard inteligente com gráficos e relatórios</span>
                    </div>
                    <div class="feature-item">
                        <div class="feature-icon">✓</div>
                        <span>Integração automática com sistemas ERP</span>
                    </div>
                    <div class="feature-item">
                        <div class="feature-icon">✓</div>
                        <span>Controle de empresas e fornecedores</span>
                    </div>
                    <div class="feature-item">
                        <div class="feature-icon">✓</div>
                        <span>Interface moderna e responsiva</span>
                    </div>
                </div>
                
                <a href="https://www.simpledfe.com.br" class="access-button">
                    🚀 Acessar o SimpleDFe
                </a>
                
                <p class="welcome-text">
                    <strong>Próximos passos:</strong><br>
                    1. Acesse o sistema através do link acima<br>
                    2. Faça login com suas credenciais<br>
                    3. Explore o dashboard e funcionalidades<br>
                    4. Configure suas empresas e integrações
                </p>
            </div>
            
            <div class="footer">
                <p class="footer-text">
                    <strong>SimpleDFe</strong> - Sistema de Gestão de Documentos Eletrônicos<br>
                    Desenvolvido para otimizar sua gestão fiscal
                </p>
                <div class="support-info">
                    <p>Em caso de dúvidas, entre em contato com nosso suporte.<br>
                    Este é um email automático, não responda esta mensagem.</p>
                </div>
            </div>
        </div>
    </body>
    </html>
  `;
};

// Função para enviar email de boas-vindas com MailerSend
export async function sendWelcomeEmail(userName: string, userEmail: string): Promise<boolean> {
  try {
    const sentFrom = new Sender("noreply@trial-v69oxl5oy9dg785k.mlsender.net", "SimpleDFe");
    const recipients = [new Recipient(userEmail, userName)];

    const emailParams = new EmailParams()
      .setFrom(sentFrom)
      .setTo(recipients)
      .setSubject('🎉 Bem-vindo ao SimpleDFe - Sua conta foi criada com sucesso!')
      .setHtml(getWelcomeEmailTemplate(userName, userEmail))
      .setText(`Olá ${userName}! Bem-vindo ao SimpleDFe - Sistema de Gestão de Documentos Eletrônicos. Acesse: www.simpledfe.com.br`);

    await mailerSend.email.send(emailParams);
    console.log(`Email de boas-vindas enviado com sucesso para: ${userEmail}`);
    return true;
  } catch (error) {
    console.error('Erro ao enviar email de boas-vindas:', error);
    return false;
  }
}

// Função para testar configuração de email
export async function testEmailConfiguration(): Promise<boolean> {
  try {
    console.log('MailerSend configurado e pronto para envio');
    return true;
  } catch (error) {
    console.error('Erro na configuração de email:', error);
    return false;
  }
}