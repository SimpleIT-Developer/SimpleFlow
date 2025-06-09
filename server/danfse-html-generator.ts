import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { parseStringPromise } from 'xml2js';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const htmlPdf = require('html-pdf-node');

interface NFSeData {
  numeroNfse: string;
  serieNfse: string;
  dataEmissao: string;
  codigoVerificacao: string;
  prestador: {
    cnpj: string;
    inscricaoMunicipal: string;
    razaoSocial: string;
    nomeFantasia?: string;
    endereco: {
      logradouro: string;
      numero: string;
      bairro: string;
      cidade: string;
      uf: string;
      cep: string;
    };
    email?: string;
    telefone?: string;
  };
  tomador: {
    cnpjCpf: string;
    inscricaoEstadual?: string;
    razaoSocial: string;
    endereco?: {
      logradouro: string;
      numero: string;
      bairro: string;
      cidade: string;
      uf: string;
      cep: string;
    };
    email?: string;
    telefone?: string;
  };
  servico: {
    codigo: string;
    discriminacao: string;
    municipioPrestacao: string;
    valorServicos: number;
    valorDeducoes: number;
    valorPis: number;
    valorCofins: number;
    valorInss: number;
    valorIr: number;
    valorCsll: number;
    issRetido: boolean;
    valorIss: number;
    aliquota: number;
    valorLiquido: number;
    baseCalculo: number;
  };
  municipio: string;
  uf: string;
}

async function parseNFSeXML(xmlContent: string): Promise<NFSeData> {
  try {
    // Limpar e validar o XML
    let cleanXml = xmlContent.trim();
    
    // Verificar se o conteúdo está codificado em base64
    if (!cleanXml.startsWith('<')) {
      try {
        cleanXml = Buffer.from(cleanXml, 'base64').toString('utf-8');
        console.log('XML decodificado de base64');
      } catch (e) {
        console.log('Não foi possível decodificar base64');
      }
    }
    
    // Remover caracteres de controle e BOM
    cleanXml = cleanXml.replace(/^\uFEFF/, '');
    cleanXml = cleanXml.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '');
    
    if (!cleanXml.includes('<')) {
      throw new Error('Conteúdo não é XML válido');
    }
    
    console.log('Parseando XML estruturado...');
    const parsed = await parseStringPromise(cleanXml, { explicitArray: false });
    
    let nfseData: NFSeData;
    
    // Estrutura NFSe padrão nacional
    if (parsed.NFSe && parsed.NFSe.infNFSe) {
      const infNfse = parsed.NFSe.infNFSe;
      const emit = infNfse.emit || {};
      const dest = infNfse.dest || {};
      const serv = infNfse.serv || {};
      
      nfseData = {
        numeroNfse: infNfse.nNFSe || infNfse.nDFSe || '0',
        serieNfse: infNfse.serie || '',
        dataEmissao: infNfse.dhEmi || infNfse.dhProc || new Date().toISOString(),
        codigoVerificacao: infNfse.cVerif || '',
        prestador: {
          cnpj: formatCNPJ(emit.CNPJ || ''),
          inscricaoMunicipal: emit.IM || '',
          razaoSocial: emit.xNome || '',
          nomeFantasia: emit.xFant || '',
          endereco: {
            logradouro: emit.enderNac?.xLgr || '',
            numero: emit.enderNac?.nro || '',
            bairro: emit.enderNac?.xBairro || '',
            cidade: emit.enderNac?.xMun || '',
            uf: emit.enderNac?.UF || '',
            cep: formatCEP(emit.enderNac?.CEP || '')
          },
          email: emit.email || '',
          telefone: emit.fone || ''
        },
        tomador: {
          cnpjCpf: formatCNPJCPF(dest.CNPJ || dest.CPF || ''),
          inscricaoEstadual: dest.IE || '',
          razaoSocial: dest.xNome || '',
          endereco: dest.enderNac ? {
            logradouro: dest.enderNac.xLgr || '',
            numero: dest.enderNac.nro || '',
            bairro: dest.enderNac.xBairro || '',
            cidade: dest.enderNac.xMun || '',
            uf: dest.enderNac.UF || '',
            cep: formatCEP(dest.enderNac.CEP || '')
          } : undefined,
          email: dest.email || '',
          telefone: dest.fone || ''
        },
        servico: {
          codigo: serv.cServ || serv.cListServ || '',
          discriminacao: serv.xServ || serv.xDescServ || '',
          municipioPrestacao: infNfse.xLocPrestacao || '',
          valorServicos: parseFloat(serv.vServ || serv.vTotServ || '0'),
          valorDeducoes: parseFloat(serv.vDesc || '0'),
          valorPis: parseFloat(serv.vPIS || '0'),
          valorCofins: parseFloat(serv.vCOFINS || '0'),
          valorInss: parseFloat(serv.vINSS || '0'),
          valorIr: parseFloat(serv.vIR || '0'),
          valorCsll: parseFloat(serv.vCSLL || '0'),
          issRetido: serv.ISSRet === 'true' || serv.ISSRet === '1',
          valorIss: parseFloat(serv.vISS || '0'),
          aliquota: parseFloat(serv.pISS || '0'),
          valorLiquido: parseFloat(serv.vLiq || serv.vServ || '0'),
          baseCalculo: parseFloat(serv.vBC || serv.vServ || '0')
        },
        municipio: infNfse.xLocEmi || 'BELO HORIZONTE',
        uf: infNfse.cUF ? getUFByCodigo(infNfse.cUF) : 'MG'
      };
    }
    // Estrutura NFe alternativa (como visto nos logs)
    else if (parsed.NFe) {
      const nfe = parsed.NFe;
      
      nfseData = {
        numeroNfse: nfe.ChaveNFe?.NumeroNFe || nfe.NumeroNFe || '0',
        serieNfse: '',
        dataEmissao: nfe.DataEmissaoNFe || new Date().toISOString(),
        codigoVerificacao: nfe.ChaveNFe?.CodigoVerificacao || nfe.CodigoVerificacao || '',
        prestador: {
          cnpj: formatCNPJ(nfe.CPFCNPJPrestador?.CNPJ || ''),
          inscricaoMunicipal: nfe.ChaveNFe?.InscricaoPrestador || '',
          razaoSocial: nfe.RazaoSocialPrestador || '',
          nomeFantasia: '',
          endereco: {
            logradouro: `${nfe.EnderecoPrestador?.TipoLogradouro || ''} ${nfe.EnderecoPrestador?.Logradouro || ''}`.trim(),
            numero: nfe.EnderecoPrestador?.NumeroEndereco || '',
            bairro: nfe.EnderecoPrestador?.Bairro || '',
            cidade: getCidadeByCodigo(nfe.EnderecoPrestador?.Cidade) || '',
            uf: nfe.EnderecoPrestador?.UF || '',
            cep: formatCEP(nfe.EnderecoPrestador?.CEP || '')
          },
          email: nfe.EmailPrestador || '',
          telefone: ''
        },
        tomador: {
          cnpjCpf: formatCNPJ(nfe.CPFCNPJTomador?.CNPJ || ''),
          razaoSocial: nfe.RazaoSocialTomador || '',
          endereco: nfe.EnderecoTomador ? {
            logradouro: `${nfe.EnderecoTomador.TipoLogradouro || ''} ${nfe.EnderecoTomador.Logradouro || ''}`.trim(),
            numero: nfe.EnderecoTomador.NumeroEndereco || '',
            bairro: nfe.EnderecoTomador.Bairro || '',
            cidade: getCidadeByCodigo(nfe.EnderecoTomador.Cidade) || '',
            uf: nfe.EnderecoTomador.UF || '',
            cep: formatCEP(nfe.EnderecoTomador.CEP || '')
          } : undefined,
          email: nfe.EmailTomador || '',
          telefone: ''
        },
        servico: {
          codigo: nfe.CodigoServico || '',
          discriminacao: nfe.DiscriminacaoServico || getDiscriminacaoPorCodigo(nfe.CodigoServico),
          municipioPrestacao: nfe.prestador?.endereco?.cidade || '',
          valorServicos: parseFloat(nfe.ValorServicos || '0'),
          valorDeducoes: parseFloat(nfe.ValorDeducoes || '0'),
          valorPis: parseFloat(nfe.ValorPIS || '0'),
          valorCofins: parseFloat(nfe.ValorCOFINS || '0'),
          valorInss: parseFloat(nfe.ValorINSS || '0'),
          valorIr: parseFloat(nfe.ValorIR || '0'),
          valorCsll: parseFloat(nfe.ValorCSLL || '0'),
          issRetido: nfe.ISSRetido === 'true',
          valorIss: parseFloat(nfe.ValorISS || '0'),
          aliquota: parseFloat(nfe.AliquotaServicos || '0') * 100,
          valorLiquido: parseFloat(nfe.ValorServicos || '0'),
          baseCalculo: parseFloat(nfe.ValorServicos || '0')
        },
        municipio: 'VITÓRIA DA CONQUISTA',
        uf: 'BA'
      };
    }
    else {
      throw new Error('Estrutura XML não reconhecida');
    }
    
    console.log('Dados extraídos:', JSON.stringify(nfseData, null, 2));
    return nfseData;
    
  } catch (error) {
    console.error('Erro ao fazer parse do XML:', error);
    throw new Error(`Erro ao processar XML: ${error instanceof Error ? error.message : String(error)}`);
  }
}

function formatCNPJ(cnpj: string): string {
  const numbers = cnpj.replace(/\D/g, '');
  if (numbers.length === 14) {
    return numbers.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5');
  }
  return cnpj;
}

function formatCPF(cpf: string): string {
  const numbers = cpf.replace(/\D/g, '');
  if (numbers.length === 11) {
    return numbers.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
  }
  return cpf;
}

function formatCNPJCPF(doc: string): string {
  const numbers = doc.replace(/\D/g, '');
  if (numbers.length === 14) return formatCNPJ(doc);
  if (numbers.length === 11) return formatCPF(doc);
  return doc;
}

function formatCEP(cep: string): string {
  const numbers = cep.replace(/\D/g, '');
  if (numbers.length === 8) {
    return numbers.replace(/(\d{5})(\d{3})/, '$1-$2');
  }
  return cep;
}

function formatCurrency(value: number): string {
  return value.toLocaleString('pt-BR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
}

function formatDate(dateStr: string): string {
  try {
    const date = new Date(dateStr);
    return date.toLocaleDateString('pt-BR');
  } catch {
    return new Date().toLocaleDateString('pt-BR');
  }
}

function getUFByCodigo(codigo: string): string {
  const ufs: Record<string, string> = {
    '31': 'MG', '35': 'SP', '33': 'RJ', '23': 'CE', '29': 'BA',
    '41': 'PR', '42': 'SC', '43': 'RS', '52': 'GO', '53': 'DF'
  };
  return ufs[codigo] || 'MG';
}

function getCidadeByCodigo(codigo: string): string {
  if (codigo === '3106200') return 'BELO HORIZONTE';
  if (codigo === '3550308') return 'SÃO PAULO';
  return 'VITÓRIA DA CONQUISTA';
}

function getDiscriminacaoPorCodigo(codigo: string): string {
  const discriminacoes: Record<string, string> = {
    '5762': 'Licenciamento ou cessão de direito de uso de programas de computação',
    '9.01': 'Hospedagem de qualquer natureza em hotéis, apart-service condominiais, flat, apart-hotéis, hotéis residência'
  };
  return discriminacoes[codigo] || 'Prestação de serviços';
}

function generateDANFSeHTML(data: NFSeData): string {
  return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>DANFSe - ${data.numeroNfse}</title>
    <style>
        @page {
            size: A4;
            margin: 10mm;
        }
        
        body {
            font-family: Arial, sans-serif;
            font-size: 8pt;
            margin: 0;
            padding: 0;
            line-height: 1.2;
        }
        
        .container {
            border: 1px solid #000;
            padding: 5px;
            height: 100%;
        }
        
        .header {
            display: flex;
            align-items: center;
            margin-bottom: 10px;
            height: 80px;
        }
        
        .logo {
            width: 60px;
            height: 60px;
            border: 1px solid #000;
            display: flex;
            align-items: center;
            justify-content: center;
            margin-right: 15px;
            font-size: 6pt;
        }
        
        .title {
            flex: 1;
            text-align: center;
        }
        
        .title h1 {
            font-size: 14pt;
            margin: 0 0 5px 0;
            font-weight: bold;
        }
        
        .title h2 {
            font-size: 11pt;
            margin: 0 0 3px 0;
            font-weight: normal;
        }
        
        .title h3 {
            font-size: 9pt;
            margin: 0;
            font-weight: normal;
        }
        
        .qr-code {
            width: 75px;
            height: 60px;
            border: 1px solid #000;
            display: flex;
            align-items: center;
            justify-content: center;
            margin-left: 15px;
            font-size: 6pt;
        }
        
        .verification {
            text-align: center;
            font-size: 6pt;
            margin-top: 3px;
        }
        
        .numero-nf {
            position: absolute;
            right: 25px;
            top: 40px;
            font-size: 24pt;
            font-weight: bold;
        }
        
        .info-table {
            width: 100%;
            border-collapse: collapse;
            border: 1px solid #000;
            margin-bottom: 5px;
        }
        
        .info-table td, .info-table th {
            border: 1px solid #000;
            padding: 2px 4px;
            text-align: left;
            vertical-align: top;
        }
        
        .info-table th {
            background-color: #f0f0f0;
            font-weight: bold;
            font-size: 7pt;
        }
        
        .section-header {
            background-color: #e0e0e0;
            font-weight: bold;
            text-align: center;
            padding: 3px;
            font-size: 9pt;
        }
        
        .service-box {
            border: 1px solid #000;
            padding: 5px;
            margin-bottom: 5px;
            min-height: 40px;
        }
        
        .discrimination-box {
            border: 1px solid #000;
            padding: 5px;
            margin-bottom: 5px;
            min-height: 80px;
        }
        
        .values-table {
            width: 100%;
            border-collapse: collapse;
            border: 1px solid #000;
            margin-bottom: 5px;
        }
        
        .values-table td, .values-table th {
            border: 1px solid #000;
            padding: 3px;
            text-align: center;
            font-size: 7pt;
        }
        
        .tributos-container {
            display: flex;
            margin-bottom: 5px;
        }
        
        .tributos-federais {
            flex: 1;
            border: 1px solid #000;
            margin-right: 2px;
        }
        
        .valor-liquido {
            width: 70px;
            border: 1px solid #000;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
        }
        
        .outras-info {
            border: 1px solid #000;
            padding: 5px;
            margin-bottom: 5px;
            min-height: 25px;
        }
        
        .footer {
            text-align: center;
            font-size: 7pt;
            margin-top: 10px;
        }
        
        .small-text {
            font-size: 6pt;
        }
        
        .bold {
            font-weight: bold;
        }
    </style>
</head>
<body>
    <div class="container">
        <!-- Cabeçalho -->
        <div class="header">
            <div class="logo">LOGO<br>MUNICIPAL</div>
            <div class="title">
                <h1>NOTA FISCAL DE SERVIÇOS ELETRÔNICA - NFSe</h1>
                <h2>Prefeitura Municipal de ${data.municipio}</h2>
                <h3>SECRETARIA MUNICIPAL DE FAZENDA E FINANÇAS</h3>
            </div>
            <div>
                <div class="qr-code">QR CODE</div>
                <div class="verification small-text">
                    Código de Verificação para Autenticação:<br>
                    ${data.codigoVerificacao || 'sem15ol890s01ca805z61'}<br>
                    Gerado automaticamente
                </div>
            </div>
        </div>
        
        <div class="numero-nf">${data.numeroNfse}</div>
        
        <!-- Tabela de informações do cabeçalho -->
        <table class="info-table">
            <tr>
                <th style="width: 15%">Data de Emissão</th>
                <th style="width: 20%">Exigibilidade do ISS</th>
                <th style="width: 18%">Regime Tributário</th>
                <th style="width: 12%">Número RPS</th>
                <th style="width: 8%">Série</th>
                <th style="width: 12%">Nº da Nota Fiscal</th>
            </tr>
            <tr>
                <td>${formatDate(data.dataEmissao)}</td>
                <td>Exigível no Município</td>
                <td>Tributação Normal</td>
                <td>PAGEAD</td>
                <td>${data.serieNfse}</td>
                <td>${data.numeroNfse}</td>
            </tr>
            <tr>
                <th colspan="2">Tipo de Recolhimento</th>
                <th colspan="4">Local de Prestação</th>
            </tr>
            <tr>
                <td>Simples Nacional</td>
                <td>Não Retido</td>
                <td>Não Optante</td>
                <td colspan="3">No Município</td>
            </tr>
        </table>
        
        <!-- PRESTADOR -->
        <div class="section-header">PRESTADOR</div>
        <div class="service-box">
            <strong>Razão Social:</strong> ${data.prestador.razaoSocial}<br>
            <strong>Nome Fantasia:</strong> ${data.prestador.nomeFantasia || ''}<br>
            <strong>Endereço:</strong> ${data.prestador.endereco.logradouro}, ${data.prestador.endereco.numero} - ${data.prestador.endereco.bairro}<br>
            <strong>Cidade:</strong> ${data.prestador.endereco.cidade} - ${data.prestador.endereco.uf} - <strong>CEP:</strong> ${data.prestador.endereco.cep}<br>
            <strong>E-mail:</strong> ${data.prestador.email || 'email@email.com'} - <strong>Fone:</strong> ${data.prestador.telefone || ''} - <strong>Celular:</strong> - <strong>Site:</strong><br>
            <strong>Inscrição Estadual:</strong> - <strong>Inscrição Municipal:</strong> ${data.prestador.inscricaoMunicipal} - <strong>CPF/CNPJ:</strong> ${data.prestador.cnpj}
        </div>
        
        <!-- TOMADOR -->
        <div class="section-header">TOMADOR</div>
        <div class="service-box">
            <strong>Razão Social:</strong> ${data.tomador.razaoSocial}<br>
            <strong>Endereço:</strong> ${data.tomador.endereco ? `${data.tomador.endereco.logradouro}, ${data.tomador.endereco.numero} - ${data.tomador.endereco.bairro}` : ''}<br>
            <strong>E-mail:</strong> ${data.tomador.email || ''} - <strong>Fone:</strong> ${data.tomador.telefone || ''} - <strong>Celular:</strong><br>
            <strong>Inscrição Estadual:</strong> ${data.tomador.inscricaoEstadual || ''} - <strong>CPF/CNPJ:</strong> ${data.tomador.cnpjCpf}
        </div>
        
        <!-- SERVIÇO -->
        <div class="section-header">SERVIÇO</div>
        <div class="service-box">
            <strong>${data.servico.codigo}</strong> - ${data.servico.discriminacao}
        </div>
        
        <!-- DISCRIMINAÇÃO DOS SERVIÇOS -->
        <div class="section-header">DISCRIMINAÇÃO DOS SERVIÇOS</div>
        <div class="discrimination-box">
            DIGITE AQUI A DISCRIMINAÇÃO DOS SERVIÇOS DA NOTA FISCAL
        </div>
        
        <!-- Tabela de valores -->
        <table class="values-table">
            <tr>
                <th>VALOR SERVIÇO (R$)</th>
                <th>DEDUÇÕES (R$)</th>
                <th>DESC. INCOD. (R$)</th>
                <th>BASE DE CÁLCULO (R$)</th>
                <th>ALÍQUOTA (%)</th>
                <th>ISS (R$)</th>
            </tr>
            <tr>
                <td>${formatCurrency(data.servico.valorServicos)}</td>
                <td>${formatCurrency(data.servico.valorDeducoes)}</td>
                <td>0,00</td>
                <td>${formatCurrency(data.servico.baseCalculo)}</td>
                <td>${data.servico.aliquota.toFixed(2)}</td>
                <td>${formatCurrency(data.servico.valorIss)}</td>
            </tr>
        </table>
        
        <!-- Tributos e Valor Líquido -->
        <div class="tributos-container">
            <div class="tributos-federais">
                <div class="section-header">DEMONSTRATIVO DOS TRIBUTOS FEDERAIS | DESCONTOS DIVERSOS</div>
                <table class="values-table" style="margin: 0;">
                    <tr>
                        <th>INSS (R$)</th>
                        <th>IR (R$)</th>
                        <th>CSLL (R$)</th>
                        <th>COFINS (R$)</th>
                        <th>PIS (R$)</th>
                        <th>DESCONTOS (R$)</th>
                    </tr>
                    <tr>
                        <td>${formatCurrency(data.servico.valorInss)}</td>
                        <td>${formatCurrency(data.servico.valorIr)}</td>
                        <td>${formatCurrency(data.servico.valorCsll)}</td>
                        <td>${formatCurrency(data.servico.valorCofins)}</td>
                        <td>${formatCurrency(data.servico.valorPis)}</td>
                        <td>0,00</td>
                    </tr>
                </table>
            </div>
            <div class="valor-liquido">
                <div class="section-header">VALOR LÍQUIDO (R$)</div>
                <div style="font-size: 12pt; font-weight: bold; margin-top: 10px;">
                    ${formatCurrency(data.servico.valorLiquido)}
                </div>
            </div>
        </div>
        
        <!-- OUTRAS INFORMAÇÕES -->
        <div class="section-header">OUTRAS INFORMAÇÕES</div>
        <div class="outras-info">
            Valor Líquido = Valor Serviço - INSS - IR - CSLL - COFINS - PIS - Descontos Diversos - ISS Retido - Desconto Incondicional
        </div>
        
        <!-- Footer -->
        <div class="footer">
            Consulte a autenticidade deste documento acessando o site https://www.pmvc.ba.gov.br
        </div>
    </div>
</body>
</html>`;
}

export async function generateDANFSE(xmlContent: string): Promise<{ success: boolean, pdfPath?: string, error?: string }> {
  try {
    console.log('Gerando DANFSe HTML para XML de tamanho:', xmlContent.length);
    
    // Parse do XML
    const nfseData = await parseNFSeXML(xmlContent);
    
    // Gerar HTML
    const htmlContent = generateDANFSeHTML(nfseData);
    
    // Configurações do PDF
    const options = {
      format: 'A4',
      border: {
        top: '10mm',
        right: '10mm',
        bottom: '10mm',
        left: '10mm'
      },
      paginationOffset: 1,
      type: 'pdf',
      quality: '75'
    };
    
    // Gerar PDF
    const pdfBuffer = await htmlPdf.generatePdf({ content: htmlContent }, options);
    
    // Salvar arquivo temporário
    const tempDir = os.tmpdir();
    const pdfPath = path.join(tempDir, `danfse_${Date.now()}.pdf`);
    
    fs.writeFileSync(pdfPath, pdfBuffer);
    
    console.log('DANFSe HTML gerada com sucesso:', pdfPath);
    console.log('Tamanho do arquivo PDF:', pdfBuffer.length, 'bytes');
    
    return {
      success: true,
      pdfPath: pdfPath
    };
    
  } catch (error) {
    console.error('Erro ao gerar DANFSe HTML:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Erro desconhecido ao gerar DANFSe'
    };
  }
}