import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { parseStringPromise } from 'xml2js';
import { jsPDF } from 'jspdf';

interface DANFSeLayoutData {
  // Cabeçalho
  municipio: string;
  numeroNfse: string;
  dataEmissao: string;
  codigoVerificacao: string;
  
  // Dados do prestador
  prestador: {
    razaoSocial: string;
    nomeFantasia: string;
    endereco: string;
    cidade: string;
    uf: string;
    cep: string;
    email: string;
    telefone: string;
    inscricaoEstadual: string;
    inscricaoMunicipal: string;
    cnpj: string;
  };
  
  // Dados do tomador
  tomador: {
    razaoSocial: string;
    endereco: string;
    email: string;
    telefone: string;
    inscricaoEstadual: string;
    cnpjCpf: string;
  };
  
  // Serviços
  servico: {
    codigo: string;
    discriminacao: string;
  };
  
  // Valores
  valores: {
    valorServico: number;
    deducoes: number;
    descontoIncondicional: number;
    baseCalculo: number;
    aliquota: number;
    iss: number;
  };
  
  // Tributos federais
  tributos: {
    inss: number;
    ir: number;
    csll: number;
    cofins: number;
    pis: number;
    descontos: number;
    valorLiquido: number;
  };
}

async function parseXMLToLayout(xmlContent: string): Promise<DANFSeLayoutData> {
  try {
    let cleanXml = xmlContent.trim();
    
    // Decodificar base64 se necessário
    if (!cleanXml.startsWith('<')) {
      cleanXml = Buffer.from(cleanXml, 'base64').toString('utf-8');
    }
    
    cleanXml = cleanXml.replace(/^\uFEFF/, '');
    cleanXml = cleanXml.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '');
    
    const parsed = await parseStringPromise(cleanXml, { explicitArray: false });
    console.log('XML parsed structure:', JSON.stringify(parsed, null, 2).substring(0, 2000));
    
    // Mapear estrutura NFSe padrão nacional
    if (parsed.NFSe && parsed.NFSe.infNFSe) {
      const inf = parsed.NFSe.infNFSe;
      const emit = inf.emit || {};
      const dest = inf.dest || {};
      const enderEmi = emit.enderNac || {};
      const enderDest = dest.enderNac || {};
      
      // Mapear serviços baseado na estrutura real do XML
      let servicoInfo = inf.serv || {};
      let valorServicos = parseFloat(servicoInfo.vServ || servicoInfo.vTotServ || '0');
      let valorDeducoes = parseFloat(servicoInfo.vDesc || '0');
      let valorIss = parseFloat(servicoInfo.vISS || '0');
      let aliquota = parseFloat(servicoInfo.pISS || '0');
      let baseCalculo = parseFloat(servicoInfo.vBC || valorServicos.toString());
      
      // Tributos federais
      let inss = parseFloat(servicoInfo.vINSS || '0');
      let ir = parseFloat(servicoInfo.vIR || '0');
      let csll = parseFloat(servicoInfo.vCSLL || '0');
      let cofins = parseFloat(servicoInfo.vCOFINS || '0');
      let pis = parseFloat(servicoInfo.vPIS || '0');
      let valorLiquido = parseFloat(servicoInfo.vLiq || valorServicos.toString());
      
      return {
        municipio: inf.xLocEmi || 'BELO HORIZONTE',
        numeroNfse: inf.nNFSe || inf.nDFSe || '',
        dataEmissao: inf.dhEmi || inf.dhProc || '',
        codigoVerificacao: inf.cVerif || '',
        
        prestador: {
          razaoSocial: emit.xNome || '',
          nomeFantasia: emit.xFant || '',
          endereco: `${enderEmi.xLgr || ''}, ${enderEmi.nro || ''} - ${enderEmi.xBairro || ''}`.replace(/^, /, '').replace(/ - $/, ''),
          cidade: enderEmi.xMun || '',
          uf: enderEmi.UF || '',
          cep: formatCEP(enderEmi.CEP || ''),
          email: emit.email || '',
          telefone: emit.fone || '',
          inscricaoEstadual: emit.IE || '',
          inscricaoMunicipal: emit.IM || '',
          cnpj: formatCNPJ(emit.CNPJ || '')
        },
        
        tomador: {
          razaoSocial: dest.xNome || '',
          endereco: enderDest.xLgr ? `${enderDest.xLgr || ''}, ${enderDest.nro || ''} - ${enderDest.xBairro || ''}`.replace(/^, /, '').replace(/ - $/, '') : '',
          email: dest.email || '',
          telefone: dest.fone || '',
          inscricaoEstadual: dest.IE || '',
          cnpjCpf: formatCNPJCPF(dest.CNPJ || dest.CPF || '')
        },
        
        servico: {
          codigo: servicoInfo.cServ || servicoInfo.cListServ || '',
          discriminacao: inf.xTribNac || inf.xTribMun || servicoInfo.xServ || ''
        },
        
        valores: {
          valorServico: valorServicos,
          deducoes: valorDeducoes,
          descontoIncondicional: parseFloat(servicoInfo.vDescIncond || '0'),
          baseCalculo: baseCalculo,
          aliquota: aliquota,
          iss: valorIss
        },
        
        tributos: {
          inss: inss,
          ir: ir,
          csll: csll,
          cofins: cofins,
          pis: pis,
          descontos: parseFloat(servicoInfo.vOutrasRetencoes || '0'),
          valorLiquido: valorLiquido
        }
      };
    }
    
    // Estrutura NFe alternativa (vista nos logs anteriores)
    else if (parsed.NFe) {
      const nfe = parsed.NFe;
      const enderPrest = nfe.EnderecoPrestador || {};
      const enderTom = nfe.EnderecoTomador || {};
      
      let valorServicos = parseFloat(nfe.ValorServicos || '0');
      let valorIss = parseFloat(nfe.ValorISS || '0');
      let aliquota = parseFloat(nfe.AliquotaServicos || '0') * 100; // Converter para porcentagem
      
      return {
        municipio: getCidadePorCodigo(enderPrest.Cidade) || 'VITÓRIA DA CONQUISTA',
        numeroNfse: nfe.ChaveNFe?.NumeroNFe || nfe.NumeroNFe || '',
        dataEmissao: nfe.DataEmissaoNFe || '',
        codigoVerificacao: nfe.ChaveNFe?.CodigoVerificacao || nfe.CodigoVerificacao || '',
        
        prestador: {
          razaoSocial: nfe.RazaoSocialPrestador || '',
          nomeFantasia: '',
          endereco: `${enderPrest.TipoLogradouro || ''} ${enderPrest.Logradouro || ''}, ${enderPrest.NumeroEndereco || ''} - ${enderPrest.Bairro || ''}`.trim(),
          cidade: getCidadePorCodigo(enderPrest.Cidade) || '',
          uf: enderPrest.UF || '',
          cep: formatCEP(enderPrest.CEP || ''),
          email: nfe.EmailPrestador || '',
          telefone: '',
          inscricaoEstadual: '',
          inscricaoMunicipal: nfe.ChaveNFe?.InscricaoPrestador || '',
          cnpj: formatCNPJ(nfe.CPFCNPJPrestador?.CNPJ || '')
        },
        
        tomador: {
          razaoSocial: nfe.RazaoSocialTomador || '',
          endereco: enderTom.TipoLogradouro ? `${enderTom.TipoLogradouro || ''} ${enderTom.Logradouro || ''}, ${enderTom.NumeroEndereco || ''} - ${enderTom.Bairro || ''}`.trim() : '',
          email: nfe.EmailTomador || '',
          telefone: '',
          inscricaoEstadual: '',
          cnpjCpf: formatCNPJ(nfe.CPFCNPJTomador?.CNPJ || '')
        },
        
        servico: {
          codigo: nfe.CodigoServico || '',
          discriminacao: nfe.DiscriminacaoServico || getDiscriminacaoPorCodigo(nfe.CodigoServico || '')
        },
        
        valores: {
          valorServico: valorServicos,
          deducoes: parseFloat(nfe.ValorDeducoes || '0'),
          descontoIncondicional: 0,
          baseCalculo: valorServicos,
          aliquota: aliquota,
          iss: valorIss
        },
        
        tributos: {
          inss: parseFloat(nfe.ValorINSS || '0'),
          ir: parseFloat(nfe.ValorIR || '0'),
          csll: parseFloat(nfe.ValorCSLL || '0'),
          cofins: parseFloat(nfe.ValorCOFINS || '0'),
          pis: parseFloat(nfe.ValorPIS || '0'),
          descontos: 0,
          valorLiquido: valorServicos
        }
      };
    }
    
    throw new Error('Estrutura XML não reconhecida');
    
  } catch (error) {
    console.error('Erro ao processar XML:', error);
    throw new Error(`Erro ao analisar XML: ${error instanceof Error ? error.message : String(error)}`);
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
  return doc || '000.000.000-00';
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

function getCidadePorCodigo(codigo: string): string {
  const cidades: Record<string, string> = {
    '3106200': 'BELO HORIZONTE',
    '3550308': 'SÃO PAULO',
    '2927408': 'SALVADOR'
  };
  return cidades[codigo] || '';
}

function getDiscriminacaoPorCodigo(codigo: string): string {
  const discriminacoes: Record<string, string> = {
    '5762': 'Licenciamento ou cessão de direito de uso de programas de computação',
    '9.01': 'Hospedagem de qualquer natureza em hotéis, apart-service condominiais, flat, apart-hotéis, hotéis residência',
    '6491': 'Prestação de serviços'
  };
  return discriminacoes[codigo] || 'Prestação de serviços';
}

function criarLayoutDANFSe(data: DANFSeLayoutData): jsPDF {
  const doc = new jsPDF('p', 'mm', 'a4');
  
  // Configurações
  const pageW = 210;
  const pageH = 297;
  const margin = 8;
  const contentW = pageW - (margin * 2);
  let y = margin;
  
  // Borda principal
  doc.rect(margin, margin, contentW, pageH - (margin * 2));
  
  // === CABEÇALHO ===
  y += 3;
  
  // Logo (em branco conforme solicitado)
  doc.rect(margin + 3, y, 22, 22);
  doc.setFontSize(6);
  doc.setFont('helvetica', 'normal');
  doc.text('LOGO', margin + 14, y + 13, { align: 'center' });
  
  // Título central
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('NOTA FISCAL DE SERVIÇOS ELETRÔNICA - NFSe', pageW/2, y + 6, { align: 'center' });
  
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text(`Prefeitura Municipal de ${data.municipio}`, pageW/2, y + 12, { align: 'center' });
  
  doc.setFontSize(8);
  doc.text('SECRETARIA MUNICIPAL DE FAZENDA E FINANÇAS', pageW/2, y + 17, { align: 'center' });
  
  // QR Code
  doc.rect(pageW - 30, y, 22, 22);
  doc.setFontSize(6);
  doc.text('QR CODE', pageW - 19, y + 13, { align: 'center' });
  
  // Código de verificação
  doc.setFontSize(6);
  doc.text(`Código de Verificação para Autenticação: ${data.codigoVerificacao || 'sem15ol890s01ca805z61'}`, pageW/2, y + 26, { align: 'center' });
  doc.text('Gerado automaticamente', pageW/2, y + 30, { align: 'center' });
  
  // Número da NFSe
  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  const numExibir = data.numeroNfse.length > 4 ? data.numeroNfse.slice(-4) : data.numeroNfse || '19';
  doc.text(numExibir, pageW - 12, y + 18, { align: 'center' });
  
  y += 35;
  
  // === TABELA DE INFORMAÇÕES ===
  // Primeira linha
  const colunas = [32, 35, 32, 22, 12, 25];
  let x = margin + 3;
  
  doc.setFontSize(6);
  doc.setFont('helvetica', 'bold');
  
  const cabecalhos = ['Data de Emissão', 'Exigibilidade do ISS', 'Regime Tributário', 'Número RPS', 'Série', 'Nº da Nota Fiscal'];
  cabecalhos.forEach((cab, i) => {
    doc.rect(x, y, colunas[i], 6);
    doc.text(cab, x + 1, y + 4);
    x += colunas[i];
  });
  
  y += 6;
  x = margin + 3;
  doc.setFont('helvetica', 'normal');
  
  const valores = [
    formatDate(data.dataEmissao),
    'Exigível no Município',
    'Tributação Normal',
    'PAGEAD',
    '',
    numExibir
  ];
  
  valores.forEach((val, i) => {
    doc.rect(x, y, colunas[i], 6);
    doc.text(val, x + 1, y + 4);
    x += colunas[i];
  });
  
  // Segunda linha
  y += 6;
  x = margin + 3;
  doc.setFont('helvetica', 'bold');
  
  doc.rect(x, y, 67, 6);
  doc.text('Tipo de Recolhimento', x + 1, y + 4);
  x += 67;
  
  doc.rect(x, y, 91, 6);
  doc.text('Local de Prestação', x + 1, y + 4);
  
  y += 6;
  x = margin + 3;
  doc.setFont('helvetica', 'normal');
  
  doc.rect(x, y, 22, 6);
  doc.text('Simples Nacional', x + 1, y + 4);
  x += 22;
  
  doc.rect(x, y, 22, 6);
  doc.text('Não Retido', x + 1, y + 4);
  x += 22;
  
  doc.rect(x, y, 23, 6);
  doc.text('Não Optante', x + 1, y + 4);
  x += 23;
  
  doc.rect(x, y, 91, 6);
  doc.text('No Município', x + 1, y + 4);
  
  y += 12;
  
  // === PRESTADOR ===
  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.rect(margin + 3, y, contentW - 6, 6);
  doc.text('PRESTADOR', pageW/2, y + 4, { align: 'center' });
  
  y += 6;
  doc.rect(margin + 3, y, contentW - 6, 24);
  doc.setFontSize(7);
  doc.setFont('helvetica', 'normal');
  
  doc.text(`Razão Social: ${data.prestador.razaoSocial}`, margin + 5, y + 4);
  doc.text(`Nome Fantasia: ${data.prestador.nomeFantasia}`, margin + 5, y + 8);
  doc.text(`Endereço: ${data.prestador.endereco}`, margin + 5, y + 12);
  doc.text(`Cidade: ${data.prestador.cidade} - ${data.prestador.uf} - CEP: ${data.prestador.cep}`, margin + 5, y + 16);
  doc.text(`E-mail: ${data.prestador.email} - Fone: ${data.prestador.telefone} - Celular: - Site:`, margin + 5, y + 20);
  doc.text(`Inscrição Estadual: ${data.prestador.inscricaoEstadual} - Inscrição Municipal: ${data.prestador.inscricaoMunicipal} - CPF/CNPJ: ${data.prestador.cnpj}`, margin + 5, y + 24);
  
  y += 28;
  
  // === TOMADOR ===
  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.rect(margin + 3, y, contentW - 6, 6);
  doc.text('TOMADOR', pageW/2, y + 4, { align: 'center' });
  
  y += 6;
  doc.rect(margin + 3, y, contentW - 6, 18);
  doc.setFontSize(7);
  doc.setFont('helvetica', 'normal');
  
  doc.text(`Razão Social: ${data.tomador.razaoSocial}`, margin + 5, y + 4);
  doc.text(`Endereço: ${data.tomador.endereco} - CEP:`, margin + 5, y + 8);
  doc.text(`E-mail: ${data.tomador.email} - Fone: ${data.tomador.telefone} - Celular:`, margin + 5, y + 12);
  doc.text(`Inscrição Estadual: ${data.tomador.inscricaoEstadual} - CPF/CNPJ: ${data.tomador.cnpjCpf}`, margin + 5, y + 16);
  
  y += 22;
  
  // === SERVIÇO ===
  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.rect(margin + 3, y, contentW - 6, 6);
  doc.text('SERVIÇO', pageW/2, y + 4, { align: 'center' });
  
  y += 6;
  doc.rect(margin + 3, y, contentW - 6, 12);
  doc.setFontSize(7);
  doc.setFont('helvetica', 'normal');
  doc.text(`${data.servico.codigo} - ${data.servico.discriminacao}`, margin + 5, y + 4, { maxWidth: contentW - 12 });
  
  y += 16;
  
  // === DISCRIMINAÇÃO DOS SERVIÇOS ===
  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.rect(margin + 3, y, contentW - 6, 6);
  doc.text('DISCRIMINAÇÃO DOS SERVIÇOS', pageW/2, y + 4, { align: 'center' });
  
  y += 6;
  doc.rect(margin + 3, y, contentW - 6, 30);
  doc.setFontSize(7);
  doc.setFont('helvetica', 'normal');
  doc.text('DIGITE AQUI A DISCRIMINAÇÃO DOS SERVIÇOS DA NOTA FISCAL', margin + 5, y + 4);
  
  y += 35;
  
  // === TABELA DE VALORES ===
  const valCols = [26, 26, 26, 26, 20, 20];
  const valHeaders = ['VALOR SERVIÇO (R$)', 'DEDUÇÕES (R$)', 'DESC. INCOD. (R$)', 'BASE DE CÁLCULO (R$)', 'ALÍQUOTA (%)', 'ISS (R$)'];
  
  x = margin + 3;
  doc.setFontSize(6);
  doc.setFont('helvetica', 'bold');
  
  valHeaders.forEach((header, i) => {
    doc.rect(x, y, valCols[i], 8);
    doc.text(header, x + valCols[i]/2, y + 5, { align: 'center' });
    x += valCols[i];
  });
  
  y += 8;
  x = margin + 3;
  doc.setFont('helvetica', 'normal');
  
  const valData = [
    formatCurrency(data.valores.valorServico),
    formatCurrency(data.valores.deducoes),
    formatCurrency(data.valores.descontoIncondicional),
    formatCurrency(data.valores.baseCalculo),
    data.valores.aliquota.toFixed(2),
    formatCurrency(data.valores.iss)
  ];
  
  valData.forEach((value, i) => {
    doc.rect(x, y, valCols[i], 8);
    doc.text(value, x + valCols[i]/2, y + 5, { align: 'center' });
    x += valCols[i];
  });
  
  y += 12;
  
  // === TRIBUTOS FEDERAIS E VALOR LÍQUIDO ===
  doc.setFontSize(7);
  doc.setFont('helvetica', 'bold');
  
  // Cabeçalhos
  doc.rect(margin + 3, y, 108, 6);
  doc.text('DEMONSTRATIVO DOS TRIBUTOS FEDERAIS', margin + 57, y + 4, { align: 'center' });
  
  doc.rect(margin + 111, y, 28, 6);
  doc.text('DESCONTOS DIVERSOS', margin + 125, y + 4, { align: 'center' });
  
  doc.rect(margin + 139, y, 35, 6);
  doc.text('VALOR LÍQUIDO (R$)', margin + 156.5, y + 4, { align: 'center' });
  
  y += 6;
  
  // Tributos
  const tribCols = [18, 18, 18, 18, 18, 18];
  const tribHeaders = ['INSS (R$)', 'IR (R$)', 'CSLL (R$)', 'COFINS (R$)', 'PIS (R$)', 'DESCONTOS (R$)'];
  
  x = margin + 3;
  doc.setFontSize(6);
  
  tribHeaders.forEach((header, i) => {
    doc.rect(x, y, tribCols[i], 6);
    doc.text(header, x + tribCols[i]/2, y + 4, { align: 'center' });
    x += tribCols[i];
  });
  
  // Valor líquido
  doc.rect(margin + 111, y, 63, 12);
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text(formatCurrency(data.tributos.valorLiquido), margin + 142.5, y + 8, { align: 'center' });
  
  y += 6;
  x = margin + 3;
  doc.setFontSize(7);
  doc.setFont('helvetica', 'normal');
  
  const tribData = [
    formatCurrency(data.tributos.inss),
    formatCurrency(data.tributos.ir),
    formatCurrency(data.tributos.csll),
    formatCurrency(data.tributos.cofins),
    formatCurrency(data.tributos.pis),
    formatCurrency(data.tributos.descontos)
  ];
  
  tribData.forEach((value, i) => {
    doc.rect(x, y, tribCols[i], 6);
    doc.text(value, x + tribCols[i]/2, y + 4, { align: 'center' });
    x += tribCols[i];
  });
  
  y += 18;
  
  // === OUTRAS INFORMAÇÕES ===
  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.rect(margin + 3, y, contentW - 6, 6);
  doc.text('OUTRAS INFORMAÇÕES', pageW/2, y + 4, { align: 'center' });
  
  y += 6;
  doc.rect(margin + 3, y, contentW - 6, 12);
  doc.setFontSize(7);
  doc.setFont('helvetica', 'normal');
  doc.text('Valor Líquido = Valor Serviço - INSS - IR - CSLL - COFINS - PIS - Descontos Diversos - ISS Retido - Desconto Incondicional', margin + 5, y + 4, { maxWidth: contentW - 12 });
  
  y += 15;
  
  // === FOOTER ===
  doc.setFontSize(7);
  doc.text('Consulte a autenticidade deste documento acessando o site https://www.pmvc.ba.gov.br', pageW/2, y, { align: 'center' });
  
  return doc;
}

export async function generateDANFSE(xmlContent: string): Promise<{ success: boolean, pdfPath?: string, error?: string }> {
  try {
    console.log('Gerando DANFSe com layout oficial para XML de tamanho:', xmlContent.length);
    
    // Extrair dados específicos do XML
    const layoutData = await parseXMLToLayout(xmlContent);
    console.log('Dados mapeados para layout:', JSON.stringify(layoutData, null, 2));
    
    // Criar PDF com layout oficial
    const pdfDoc = criarLayoutDANFSe(layoutData);
    
    // Salvar arquivo
    const tempDir = os.tmpdir();
    const pdfPath = path.join(tempDir, `danfse_layout_${Date.now()}.pdf`);
    
    const pdfBuffer = Buffer.from(pdfDoc.output('arraybuffer'));
    fs.writeFileSync(pdfPath, pdfBuffer);
    
    console.log('DANFSe com layout oficial gerada:', pdfPath);
    console.log('Tamanho do arquivo:', pdfBuffer.length, 'bytes');
    
    return {
      success: true,
      pdfPath: pdfPath
    };
    
  } catch (error) {
    console.error('Erro ao gerar DANFSe com layout oficial:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Erro desconhecido'
    };
  }
}