import { MailService } from '@sendgrid/mail';

if (!process.env.SENDGRID_API_KEY) {
  console.warn("SENDGRID_API_KEY não encontrada - emails não serão enviados");
}

const mailService = new MailService();
if (process.env.SENDGRID_API_KEY) {
  mailService.setApiKey(process.env.SENDGRID_API_KEY);
}

interface WelcomeEmailData {
  nome: string;
  email: string;
  senha: string;
  codigoCliente?: string;
  nomeEmpresa?: string;
}

function createWelcomeEmailHTML(data: WelcomeEmailData): string {
  return `
<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Bem-vindo ao SimpleDFE</title>
    <style>
        body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 600px;
            margin: 0 auto;
            padding: 0;
            background: linear-gradient(135deg, #1e1b4b 0%, #581c87 100%);
        }
        .container {
            background: white;
            margin: 20px;
            border-radius: 12px;
            overflow: hidden;
            box-shadow: 0 10px 30px rgba(0,0,0,0.2);
        }
        .header {
            background: linear-gradient(135deg, #1e1b4b 0%, #581c87 100%);
            color: white;
            padding: 30px 20px;
            text-align: center;
        }
        .logo {
            font-size: 28px;
            font-weight: bold;
            margin-bottom: 10px;
            text-shadow: 2px 2px 4px rgba(0,0,0,0.3);
        }
        .subtitle {
            font-size: 14px;
            opacity: 0.9;
            margin: 0;
        }
        .content {
            padding: 30px 20px;
        }
        .welcome-title {
            color: #581c87;
            font-size: 24px;
            margin-bottom: 15px;
            font-weight: bold;
        }
        .welcome-text {
            font-size: 16px;
            margin-bottom: 25px;
            color: #555;
        }
        .access-box {
            background: linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%);
            border-left: 4px solid #581c87;
            padding: 20px;
            margin: 25px 0;
            border-radius: 8px;
        }
        .access-title {
            color: #581c87;
            font-weight: bold;
            margin-bottom: 15px;
            font-size: 18px;
        }
        .access-item {
            margin: 8px 0;
            font-size: 14px;
        }
        .access-label {
            font-weight: bold;
            color: #374151;
        }
        .access-value {
            color: #581c87;
            font-family: 'Courier New', monospace;
            background: white;
            padding: 3px 8px;
            border-radius: 4px;
            border: 1px solid #e5e7eb;
        }
        .features {
            background: #f9fafb;
            padding: 20px;
            border-radius: 8px;
            margin: 25px 0;
        }
        .features-title {
            color: #581c87;
            font-weight: bold;
            margin-bottom: 15px;
            font-size: 18px;
        }
        .feature-item {
            margin: 10px 0;
            padding-left: 20px;
            position: relative;
        }
        .feature-item:before {
            content: "✅";
            position: absolute;
            left: 0;
        }
        .security-note {
            background: #fef3c7;
            border: 1px solid #f59e0b;
            padding: 15px;
            border-radius: 6px;
            margin: 20px 0;
            font-size: 14px;
        }
        .footer {
            background: #f8fafc;
            padding: 25px 20px;
            text-align: center;
            border-top: 1px solid #e5e7eb;
        }
        .support-info {
            font-size: 14px;
            color: #6b7280;
            margin: 10px 0;
        }
        .company-name {
            color: #581c87;
            font-weight: bold;
        }
        .url {
            color: #581c87;
            text-decoration: none;
            font-weight: bold;
        }
        .emoji {
            font-size: 20px;
            margin-right: 8px;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <div class="logo">SimpleDFE</div>
            <p class="subtitle">Gestão Inteligente de Documentos Fiscais</p>
        </div>
        
        <div class="content">
            <h1 class="welcome-title"><span class="emoji">🎉</span>Bem-vindo ao SimpleDFE${data.nomeEmpresa ? ` – ${data.nomeEmpresa}` : ''}!</h1>
            
            <p class="welcome-text">
                Olá, <strong>${data.nome}</strong>!<br><br>
                Seja muito bem-vindo ao SimpleDFE – a solução simples e segura para captura e gestão de XMLs de NFe e NFS-e.
            </p>
            
            <p class="welcome-text">
                Temos o prazer de confirmar que seu acesso foi ativado com sucesso${data.nomeEmpresa ? ` para a empresa <span class="company-name">${data.nomeEmpresa}</span>` : ''}.
            </p>
            
            <div class="access-box">
                <div class="access-title">✅ Dados de Acesso</div>
                <div class="access-item">
                    <span class="access-label">Usuário:</span> 
                    <span class="access-value">${data.email}</span>
                </div>
                <div class="access-item">
                    <span class="access-label">Senha Provisória:</span> 
                    <span class="access-value">${data.senha}</span>
                </div>
                <div class="access-item">
                    <span class="access-label">URL de Acesso:</span> 
                    <a href="https://www.simpledfe.com.br" class="url">www.simpledfe.com.br</a>
                </div>
                ${data.codigoCliente ? `
                <div class="access-item">
                    <span class="access-label">Código do Cliente:</span> 
                    <span class="access-value">${data.codigoCliente}</span>
                </div>
                ` : ''}
            </div>
            
            <div class="security-note">
                <strong>⚠️ Importante:</strong> Por segurança, recomendamos alterar sua senha após o primeiro acesso.
            </div>
            
            <div class="features">
                <div class="features-title">🚀 O que você pode fazer com o SimpleDFE:</div>
                <div class="feature-item">Captura automática de XMLs de NFe e NFS-e emitidos contra o seu CNPJ</div>
                <div class="feature-item">Organização por CNPJ, datas e tipos de documentos</div>
                <div class="feature-item">Acesso seguro com controle de usuários</div>
                <div class="feature-item">Histórico e logs detalhados de todas as operações</div>
            </div>
            
            <div class="features">
                <div class="features-title">🎨 Plataforma com interface amigável:</div>
                <p style="margin: 0; font-size: 14px; color: #6b7280;">
                    Nosso sistema foi desenvolvido com as cores institucionais e identidade visual do SimpleDFE, 
                    priorizando usabilidade, clareza e eficiência.
                </p>
            </div>
        </div>
        
        <div class="footer">
            <div class="features-title">🆘 Suporte e ajuda</div>
            <p class="support-info">Se precisar de qualquer apoio, conte com nosso time!</p>
            <div class="support-info">
                📧 <a href="mailto:contato@simpledfe.com.br" class="url">contato@simpledfe.com.br</a><br>
                📞 (11) 94498-7584
            </div>
            <br>
            <p style="margin: 15px 0; color: #581c87; font-weight: bold;">
                Agradecemos por confiar no SimpleDFE.<br>
                Vamos juntos simplificar a gestão de documentos fiscais!
            </p>
            <p style="margin: 10px 0; color: #6b7280; font-size: 14px;">
                <strong>Equipe SimpleDFE</strong><br>
                <a href="https://www.simpledfe.com.br" class="url">www.simpledfe.com.br</a>
            </p>
        </div>
    </div>
</body>
</html>
`;
}

export async function sendWelcomeEmail(data: WelcomeEmailData): Promise<boolean> {
  if (!process.env.SENDGRID_API_KEY) {
    console.warn('SendGrid API key não configurada - email não enviado');
    return false;
  }

  try {
    const htmlContent = createWelcomeEmailHTML(data);
    
    const msg = {
      to: data.email,
      from: {
        email: 'test@example.com',
        name: 'SimpleDFE - Suporte'
      },
      subject: `🎉 Bem-vindo ao SimpleDFE${data.nomeEmpresa ? ` – ${data.nomeEmpresa}` : ''}`,
      html: htmlContent,
      text: `Bem-vindo ao SimpleDFE, ${data.nome}! 
      
Seus dados de acesso:
Usuário: ${data.email}
Senha: ${data.senha}
URL: www.simpledfe.com.br
${data.codigoCliente ? `Código do Cliente: ${data.codigoCliente}` : ''}

Por segurança, altere sua senha após o primeiro acesso.

Equipe SimpleDFE
contato@simpledfe.com.br
(11) 94498-7584`
    };

    await mailService.send(msg);
    console.log(`Email de boas-vindas enviado para: ${data.email}`);
    return true;
  } catch (error: any) {
    console.error('Erro ao enviar email de boas-vindas:', {
      message: error.message,
      code: error.code,
      response: error.response?.body
    });
    
    if (error.code === 403) {
      console.error('Erro 403 - Possíveis causas:');
      console.error('1. API Key inválida ou sem permissões de envio');
      console.error('2. Email remetente não verificado no SendGrid');
      console.error('3. Conta SendGrid suspensa ou com restrições');
    }
    
    return false;
  }
}

export async function testSendGridConnection(): Promise<boolean> {
  if (!process.env.SENDGRID_API_KEY) {
    return false;
  }

  try {
    // Test connection by attempting to get API key info
    const response = await fetch('https://api.sendgrid.com/v3/user/account', {
      headers: {
        'Authorization': `Bearer ${process.env.SENDGRID_API_KEY}`,
        'Content-Type': 'application/json'
      }
    });
    
    return response.ok;
  } catch (error) {
    console.error('Erro ao testar conexão SendGrid:', error);
    return false;
  }
}