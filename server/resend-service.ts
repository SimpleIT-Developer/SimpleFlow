import { Resend } from 'resend';

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
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
            line-height: 1.6;
            color: #333;
            background-color: #f8fafc;
        }
        .container {
            max-width: 600px;
            margin: 0 auto;
            background-color: #ffffff;
            box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
        }
        .header {
            background: linear-gradient(135deg, #581c87 0%, #7c3aed 50%, #a855f7 100%);
            color: white;
            padding: 30px;
            text-align: center;
        }
        .logo {
            font-size: 32px;
            font-weight: bold;
            margin-bottom: 8px;
            text-shadow: 0 2px 4px rgba(0,0,0,0.3);
        }
        .subtitle {
            font-size: 16px;
            opacity: 0.9;
            font-weight: 300;
        }
        .content {
            padding: 40px 30px;
        }
        .welcome-title {
            color: #581c87;
            font-size: 24px;
            margin-bottom: 20px;
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
            display: inline-block;
            width: 100px;
        }
        .access-value {
            color: #581c87;
            font-weight: 600;
        }
        .security-note {
            background-color: #fef3c7;
            border: 1px solid #f59e0b;
            border-radius: 6px;
            padding: 15px;
            margin: 20px 0;
            font-size: 14px;
            color: #92400e;
        }
        .features {
            margin: 25px 0;
            padding: 20px;
            background-color: #f9fafb;
            border-radius: 8px;
        }
        .features-title {
            color: #581c87;
            font-weight: bold;
            margin-bottom: 12px;
            font-size: 16px;
        }
        .feature-item {
            margin: 8px 0;
            padding-left: 20px;
            position: relative;
            font-size: 14px;
            color: #4b5563;
        }
        .feature-item::before {
            content: "✓";
            position: absolute;
            left: 0;
            color: #10b981;
            font-weight: bold;
        }
        .footer {
            background-color: #f3f4f6;
            padding: 25px 30px;
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
                Olá <strong>${data.nome}</strong>! Seu acesso ao SimpleDFE foi criado com sucesso. 
                Agora você pode aproveitar todas as funcionalidades da nossa plataforma de gestão de documentos fiscais.
            </p>
            
            <div class="access-box">
                <div class="access-title">🔐 Seus dados de acesso</div>
                <div class="access-item">
                    <span class="access-label">Usuário:</span>
                    <span class="access-value">${data.email}</span>
                </div>
                <div class="access-item">
                    <span class="access-label">Senha:</span>
                    <span class="access-value">${data.senha}</span>
                </div>
                <div class="access-item">
                    <span class="access-label">URL:</span>
                    <a href="https://www.simpledfe.com.br" class="url">www.simpledfe.com.br</a>
                </div>
                ${data.codigoCliente ? `<div class="access-item">
                    <span class="access-label">Código:</span>
                    <span class="access-value">${data.codigoCliente}</span>
                </div>` : ''}
            </div>
            
            <div class="security-note">
                <strong>⚠️ Importante:</strong> Por segurança, recomendamos alterar sua senha após o primeiro acesso.
            </div>
            
            <div class="features">
                <div class="features-title">🚀 O que você pode fazer com o SimpleFlow:</div>
                <div class="feature-item">Análise inteligente de fluxo de caixa com projeções</div>
                <div class="feature-item">Simulação de pagamentos e recebimentos</div>
                <div class="feature-item">Integração automática com seu ERP via webhooks</div>
                <div class="feature-item">Relatórios de análise para tomada de decisão</div>
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
            <p class="support-info">
                © 2024 <span class="company-name">SimpleDFE</span>. Todos os direitos reservados.
            </p>
        </div>
    </div>
</body>
</html>
`;
}

export async function sendWelcomeEmail(data: WelcomeEmailData): Promise<boolean> {
  if (!process.env.RESEND_API_KEY) {
    console.warn('Resend API key não configurada - email não enviado');
    return false;
  }

  try {
    const resend = new Resend(process.env.RESEND_API_KEY);
    const htmlContent = createWelcomeEmailHTML(data);
    
    const result = await resend.emails.send({
      from: 'SimpleDFE <simpledfe@simpleit.com.br>',
      to: [data.email],
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
    });

    console.log(`Email de boas-vindas enviado para: ${data.email} - ID: ${result.data?.id}`);
    return true;
  } catch (error: any) {
    console.error('Erro ao enviar email de boas-vindas:', {
      message: error.message,
      name: error.name
    });
    
    if (error.message?.includes('API key')) {
      console.error('Erro de API Key - verifique se a chave Resend está correta');
    }
    
    return false;
  }
}

export async function testResendConnection(): Promise<boolean> {
  if (!process.env.RESEND_API_KEY) {
    console.error('Resend API Key não configurada');
    return false;
  }

  try {
    const resend = new Resend(process.env.RESEND_API_KEY);
    
    // Teste usando email simples
    const result = await resend.emails.send({
      from: 'SimpleDFE <simpledfe@simpleit.com.br>',
      to: ['test@example.com'],
      subject: 'Teste de conexão Resend',
      html: '<p>Este é um teste de conexão.</p>',
      text: 'Este é um teste de conexão.'
    });

    console.log('Teste de conexão Resend: SUCESSO - ID:', result.data?.id);
    return true;
  } catch (error: any) {
    console.error('Teste de conexão Resend: FALHOU', {
      message: error.message,
      name: error.name
    });
    return false;
  }
}