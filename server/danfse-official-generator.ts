import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { parseStringPromise } from 'xml2js';
import { jsPDF } from 'jspdf';

interface DANFSeData {
  // Dados do cabeçalho
  numeroNfse: string;
  dataEmissao: string;
  codigoVerificacao: string;
  
  // Prestador
  prestador: {
    cnpj: string;
    inscricaoMunicipal: string;
    razaoSocial: string;
    endereco: string;
    cidade: string;
    uf: string;
    cep: string;
    email: string;
    telefone: string;
  };
  
  // Tomador
  tomador: {
    cnpjCpf: string;
    razaoSocial: string;
    endereco: string;
    cidade: string;
    uf: string;
    cep: string;
    email: string;
    telefone: string;
    inscricaoEstadual: string;
  };
  
  // Serviço
  servico: {
    codigo: string;
    discriminacao: string;
    valorServicos: number;
    valorDeducoes: number;
    descontoIncondicional: number;
    baseCalculo: number;
    aliquota: number;
    valorIss: number;
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
  
  // Dados do município
  municipio: string;
  uf: string;
}

async function extractDANFSeData(xmlContent: string): Promise<DANFSeData> {
  try {
    let cleanXml = xmlContent.trim();
    
    // Decodificar base64 se necessário
    if (!cleanXml.startsWith('<')) {
      cleanXml = Buffer.from(cleanXml, 'base64').toString('utf-8');
    }
    
    // Limpar caracteres de controle
    cleanXml = cleanXml.replace(/^\uFEFF/, '');
    cleanXml = cleanXml.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '');
    
    const parsed = await parseStringPromise(cleanXml, { explicitArray: false });
    
    // Estrutura NFSe padrão
    if (parsed.NFSe && parsed.NFSe.infNFSe) {
      const inf = parsed.NFSe.infNFSe;
      const emit = inf.emit || {};
      const dest = inf.dest || {};
      const serv = inf.serv || {};
      
      // Extrair endereço completo do prestador
      const enderecoEmit = emit.enderNac || {};
      const enderecoCompleto = `${enderecoEmit.xLgr || ''}, ${enderecoEmit.nro || ''} - ${enderecoEmit.xBairro || ''}`.trim();
      
      // Extrair endereço completo do tomador
      const enderecoDest = dest.enderNac || {};
      const enderecoTomador = enderecoDest.xLgr ? 
        `${enderecoDest.xLgr || ''}, ${enderecoDest.nro || ''} - ${enderecoDest.xBairro || ''}`.trim() : '';
      
      return {
        numeroNfse: inf.nNFSe || inf.nDFSe || '',
        dataEmissao: inf.dhEmi || inf.dhProc || '',
        codigoVerificacao: inf.cVerif || '',
        
        prestador: {
          cnpj: formatCNPJ(emit.CNPJ || ''),
          inscricaoMunicipal: emit.IM || '',
          razaoSocial: emit.xNome || '',
          endereco: enderecoCompleto,
          cidade: enderecoEmit.xMun || '',
          uf: enderecoEmit.UF || '',
          cep: formatCEP(enderecoEmit.CEP || ''),
          email: emit.email || '',
          telefone: emit.fone || ''
        },
        
        tomador: {
          cnpjCpf: formatCNPJCPF(dest.CNPJ || dest.CPF || ''),
          razaoSocial: dest.xNome || '',
          endereco: enderecoTomador,
          cidade: enderecoDest.xMun || '',
          uf: enderecoDest.UF || '',
          cep: formatCEP(enderecoDest.CEP || ''),
          email: dest.email || '',
          telefone: dest.fone || '',
          inscricaoEstadual: dest.IE || ''
        },
        
        servico: {
          codigo: serv.cServ || serv.cListServ || '',
          discriminacao: inf.xTribNac || inf.xTribMun || serv.xServ || '',
          valorServicos: parseFloat(serv.vServ || serv.vTotServ || '0'),
          valorDeducoes: parseFloat(serv.vDesc || '0'),
          descontoIncondicional: parseFloat(serv.vDescIncond || '0'),
          baseCalculo: parseFloat(serv.vBC || serv.vServ || '0'),
          aliquota: parseFloat(serv.pISS || '0'),
          valorIss: parseFloat(serv.vISS || '0')
        },
        
        tributos: {
          inss: parseFloat(serv.vINSS || '0'),
          ir: parseFloat(serv.vIR || '0'),
          csll: parseFloat(serv.vCSLL || '0'),
          cofins: parseFloat(serv.vCOFINS || '0'),
          pis: parseFloat(serv.vPIS || '0'),
          descontos: parseFloat(serv.vOutrasRetencoes || '0'),
          valorLiquido: parseFloat(serv.vLiq || serv.vServ || '0')
        },
        
        municipio: inf.xLocEmi || '',
        uf: enderecoEmit.UF || 'MG'
      };
    }
    
    // Estrutura NFe alternativa (dos logs anteriores)
    else if (parsed.NFe) {
      const nfe = parsed.NFe;
      const enderecoPrest = nfe.EnderecoPrestador || {};
      const enderecoTom = nfe.EnderecoTomador || {};
      
      return {
        numeroNfse: nfe.ChaveNFe?.NumeroNFe || nfe.NumeroNFe || '',
        dataEmissao: nfe.DataEmissaoNFe || '',
        codigoVerificacao: nfe.ChaveNFe?.CodigoVerificacao || '',
        
        prestador: {
          cnpj: formatCNPJ(nfe.CPFCNPJPrestador?.CNPJ || ''),
          inscricaoMunicipal: nfe.ChaveNFe?.InscricaoPrestador || '',
          razaoSocial: nfe.RazaoSocialPrestador || '',
          endereco: `${enderecoPrest.TipoLogradouro || ''} ${enderecoPrest.Logradouro || ''}, ${enderecoPrest.NumeroEndereco || ''} - ${enderecoPrest.Bairro || ''}`.trim(),
          cidade: getCidadePorCodigo(enderecoPrest.Cidade) || '',
          uf: enderecoPrest.UF || '',
          cep: formatCEP(enderecoPrest.CEP || ''),
          email: nfe.EmailPrestador || '',
          telefone: ''
        },
        
        tomador: {
          cnpjCpf: formatCNPJ(nfe.CPFCNPJTomador?.CNPJ || ''),
          razaoSocial: nfe.RazaoSocialTomador || '',
          endereco: enderecoTom.TipoLogradouro ? 
            `${enderecoTom.TipoLogradouro || ''} ${enderecoTom.Logradouro || ''}, ${enderecoTom.NumeroEndereco || ''} - ${enderecoTom.Bairro || ''}`.trim() : '',
          cidade: getCidadePorCodigo(enderecoTom.Cidade) || '',
          uf: enderecoTom.UF || '',
          cep: formatCEP(enderecoTom.CEP || ''),
          email: nfe.EmailTomador || '',
          telefone: '',
          inscricaoEstadual: ''
        },
        
        servico: {
          codigo: nfe.CodigoServico || '',
          discriminacao: nfe.DiscriminacaoServico || getDiscriminacaoPorCodigo(nfe.CodigoServico || ''),
          valorServicos: parseFloat(nfe.ValorServicos || '0'),
          valorDeducoes: parseFloat(nfe.ValorDeducoes || '0'),
          descontoIncondicional: 0,
          baseCalculo: parseFloat(nfe.ValorServicos || '0'),
          aliquota: parseFloat(nfe.AliquotaServicos || '0') * 100,
          valorIss: parseFloat(nfe.ValorISS || '0')
        },
        
        tributos: {
          inss: parseFloat(nfe.ValorINSS || '0'),
          ir: parseFloat(nfe.ValorIR || '0'),
          csll: parseFloat(nfe.ValorCSLL || '0'),
          cofins: parseFloat(nfe.ValorCOFINS || '0'),
          pis: parseFloat(nfe.ValorPIS || '0'),
          descontos: 0,
          valorLiquido: parseFloat(nfe.ValorServicos || '0')
        },
        
        municipio: getCidadePorCodigo(enderecoPrest.Cidade) || 'VITÓRIA DA CONQUISTA',
        uf: enderecoPrest.UF || 'BA'
      };
    }
    
    throw new Error('Estrutura XML não reconhecida para DANFSe');
    
  } catch (error) {
    console.error('Erro ao extrair dados da DANFSe:', error);
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
    '9.01': 'Hospedagem de qualquer natureza em hotéis',
    '6491': 'Prestação de serviços'
  };
  return discriminacoes[codigo] || 'Prestação de serviços';
}

function generateOfficialDANFSe(data: DANFSeData): jsPDF {
  const doc = new jsPDF('p', 'mm', 'a4');
  
  // Configurações do layout oficial
  const pageWidth = 210;
  const pageHeight = 297;
  const margin = 10;
  const contentWidth = pageWidth - (margin * 2);
  
  let y = margin;
  
  // Borda externa principal
  doc.rect(margin, margin, contentWidth, pageHeight - (margin * 2));
  
  // === CABEÇALHO ===
  y += 5;
  
  // Logo municipal (deixar em branco conforme solicitado)
  doc.rect(margin + 5, y, 25, 25);
  doc.setFontSize(7);
  doc.text('LOGO', margin + 17.5, y + 15, { align: 'center' });
  
  // Título principal
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.text('NOTA FISCAL DE SERVIÇOS ELETRÔNICA - NFSe', pageWidth/2, y + 8, { align: 'center' });
  
  doc.setFontSize(12);
  doc.setFont('helvetica', 'normal');
  doc.text(`Prefeitura Municipal de ${data.municipio}`, pageWidth/2, y + 16, { align: 'center' });
  
  doc.setFontSize(10);
  doc.text('SECRETARIA MUNICIPAL DE FAZENDA E FINANÇAS', pageWidth/2, y + 23, { align: 'center' });
  
  // QR Code
  doc.rect(pageWidth - 35, y, 25, 25);
  doc.setFontSize(7);
  doc.text('QR CODE', pageWidth - 22.5, y + 15, { align: 'center' });
  
  // Código de verificação
  doc.setFontSize(7);
  doc.text(`Código de Verificação para Autenticação: ${data.codigoVerificacao}`, pageWidth/2, y + 30, { align: 'center' });
  doc.text('Gerado automaticamente', pageWidth/2, y + 35, { align: 'center' });
  
  // Número da NFSe no canto
  doc.setFontSize(24);
  doc.setFont('helvetica', 'bold');
  const numeroExibir = data.numeroNfse.length > 4 ? data.numeroNfse.slice(-4) : data.numeroNfse;
  doc.text(numeroExibir, pageWidth - 15, y + 20, { align: 'center' });
  
  y += 45;
  
  // === TABELA DE INFORMAÇÕES DO CABEÇALHO ===
  const tableStartY = y;
  
  // Primeira linha - cabeçalhos
  const colWidths = [35, 40, 35, 25, 15, 30];
  let x = margin + 5;
  
  doc.setFontSize(7);
  doc.setFont('helvetica', 'bold');
  
  const headers = ['Data de Emissão', 'Exigibilidade do ISS', 'Regime Tributário', 'Número RPS', 'Série', 'Nº da Nota Fiscal'];
  headers.forEach((header, i) => {
    doc.rect(x, y, colWidths[i], 8);
    doc.text(header, x + 2, y + 5);
    x += colWidths[i];
  });
  
  // Primeira linha - valores
  y += 8;
  x = margin + 5;
  doc.setFont('helvetica', 'normal');
  
  const values = [
    formatDate(data.dataEmissao),
    'Exigível no Município',
    'Tributação Normal',
    'PAGEAD',
    '',
    numeroExibir
  ];
  
  values.forEach((value, i) => {
    doc.rect(x, y, colWidths[i], 8);
    doc.text(value, x + 2, y + 5);
    x += colWidths[i];
  });
  
  // Segunda linha - tipo de recolhimento
  y += 8;
  x = margin + 5;
  doc.setFont('helvetica', 'bold');
  
  doc.rect(x, y, 70, 8);
  doc.text('Tipo de Recolhimento', x + 2, y + 5);
  x += 70;
  
  doc.rect(x, y, 110, 8);
  doc.text('Local de Prestação', x + 2, y + 5);
  
  // Segunda linha - valores
  y += 8;
  x = margin + 5;
  doc.setFont('helvetica', 'normal');
  
  doc.rect(x, y, 35, 8);
  doc.text('Simples Nacional', x + 2, y + 5);
  x += 35;
  
  doc.rect(x, y, 35, 8);
  doc.text('Não Retido', x + 2, y + 5);
  x += 35;
  
  doc.rect(x, y, 35, 8);
  doc.text('Não Optante', x + 2, y + 5);
  x += 35;
  
  doc.rect(x, y, 75, 8);
  doc.text('No Município', x + 2, y + 5);
  
  y += 15;
  
  // === PRESTADOR ===
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.rect(margin + 5, y, contentWidth - 10, 8);
  doc.text('PRESTADOR', pageWidth/2, y + 5, { align: 'center' });
  
  y += 8;
  doc.rect(margin + 5, y, contentWidth - 10, 32);
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  
  doc.text(`Razão Social: ${data.prestador.razaoSocial}`, margin + 7, y + 5);
  doc.text(`Nome Fantasia:`, margin + 7, y + 10);
  doc.text(`Endereço: ${data.prestador.endereco}`, margin + 7, y + 15);
  doc.text(`Cidade: ${data.prestador.cidade} - ${data.prestador.uf} - CEP: ${data.prestador.cep}`, margin + 7, y + 20);
  doc.text(`E-mail: ${data.prestador.email} - Fone: ${data.prestador.telefone} - Celular: - Site:`, margin + 7, y + 25);
  doc.text(`Inscrição Estadual: - Inscrição Municipal: ${data.prestador.inscricaoMunicipal} - CPF/CNPJ: ${data.prestador.cnpj}`, margin + 7, y + 30);
  
  y += 37;
  
  // === TOMADOR ===
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.rect(margin + 5, y, contentWidth - 10, 8);
  doc.text('TOMADOR', pageWidth/2, y + 5, { align: 'center' });
  
  y += 8;
  doc.rect(margin + 5, y, contentWidth - 10, 27);
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  
  doc.text(`Razão Social: ${data.tomador.razaoSocial}`, margin + 7, y + 5);
  doc.text(`Endereço: ${data.tomador.endereco} - CEP: ${data.tomador.cep}`, margin + 7, y + 10);
  doc.text(`E-mail: ${data.tomador.email} - Fone: ${data.tomador.telefone} - Celular:`, margin + 7, y + 15);
  doc.text(`Inscrição Estadual: ${data.tomador.inscricaoEstadual} - CPF/CNPJ: ${data.tomador.cnpjCpf}`, margin + 7, y + 20);
  
  y += 32;
  
  // === SERVIÇO ===
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.rect(margin + 5, y, contentWidth - 10, 8);
  doc.text('SERVIÇO', pageWidth/2, y + 5, { align: 'center' });
  
  y += 8;
  doc.rect(margin + 5, y, contentWidth - 10, 20);
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.text(`${data.servico.codigo} - ${data.servico.discriminacao}`, margin + 7, y + 5, { maxWidth: contentWidth - 20 });
  
  y += 25;
  
  // === DISCRIMINAÇÃO DOS SERVIÇOS ===
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.rect(margin + 5, y, contentWidth - 10, 8);
  doc.text('DISCRIMINAÇÃO DOS SERVIÇOS', pageWidth/2, y + 5, { align: 'center' });
  
  y += 8;
  doc.rect(margin + 5, y, contentWidth - 10, 40);
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.text('DIGITE AQUI A DISCRIMINAÇÃO DOS SERVIÇOS DA NOTA FISCAL', margin + 7, y + 5);
  
  y += 45;
  
  // === TABELA DE VALORES ===
  const valCols = [30, 30, 30, 30, 25, 25];
  const valHeaders = ['VALOR SERVIÇO (R$)', 'DEDUÇÕES (R$)', 'DESC. INCOD. (R$)', 'BASE DE CÁLCULO (R$)', 'ALÍQUOTA (%)', 'ISS (R$)'];
  
  x = margin + 5;
  doc.setFontSize(7);
  doc.setFont('helvetica', 'bold');
  
  valHeaders.forEach((header, i) => {
    doc.rect(x, y, valCols[i], 10);
    doc.text(header, x + valCols[i]/2, y + 6, { align: 'center' });
    x += valCols[i];
  });
  
  y += 10;
  x = margin + 5;
  doc.setFont('helvetica', 'normal');
  
  const valData = [
    formatCurrency(data.servico.valorServicos),
    formatCurrency(data.servico.valorDeducoes),
    formatCurrency(data.servico.descontoIncondicional),
    formatCurrency(data.servico.baseCalculo),
    data.servico.aliquota.toFixed(2),
    formatCurrency(data.servico.valorIss)
  ];
  
  valData.forEach((value, i) => {
    doc.rect(x, y, valCols[i], 10);
    doc.text(value, x + valCols[i]/2, y + 6, { align: 'center' });
    x += valCols[i];
  });
  
  y += 15;
  
  // === TRIBUTOS E VALOR LÍQUIDO ===
  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  
  // Cabeçalho tributos
  doc.rect(margin + 5, y, 130, 8);
  doc.text('DEMONSTRATIVO DOS TRIBUTOS FEDERAIS', margin + 70, y + 5, { align: 'center' });
  
  doc.rect(margin + 135, y, 35, 8);
  doc.text('DESCONTOS DIVERSOS', margin + 152.5, y + 5, { align: 'center' });
  
  doc.rect(margin + 170, y, 35, 8);
  doc.text('VALOR LÍQUIDO (R$)', margin + 187.5, y + 5, { align: 'center' });
  
  y += 8;
  
  // Colunas tributos
  const tribCols = [21.6, 21.6, 21.6, 21.6, 21.6, 22];
  const tribHeaders = ['INSS (R$)', 'IR (R$)', 'CSLL (R$)', 'COFINS (R$)', 'PIS (R$)', 'DESCONTOS (R$)'];
  
  x = margin + 5;
  doc.setFontSize(7);
  
  tribHeaders.forEach((header, i) => {
    doc.rect(x, y, tribCols[i], 8);
    doc.text(header, x + tribCols[i]/2, y + 5, { align: 'center' });
    x += tribCols[i];
  });
  
  // Valor líquido grande
  doc.rect(margin + 135, y, 70, 16);
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text(formatCurrency(data.tributos.valorLiquido), margin + 170, y + 10, { align: 'center' });
  
  y += 8;
  x = margin + 5;
  doc.setFontSize(8);
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
    doc.rect(x, y, tribCols[i], 8);
    doc.text(value, x + tribCols[i]/2, y + 5, { align: 'center' });
    x += tribCols[i];
  });
  
  y += 20;
  
  // === OUTRAS INFORMAÇÕES ===
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.rect(margin + 5, y, contentWidth - 10, 8);
  doc.text('OUTRAS INFORMAÇÕES', pageWidth/2, y + 5, { align: 'center' });
  
  y += 8;
  doc.rect(margin + 5, y, contentWidth - 10, 15);
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.text('Valor Líquido = Valor Serviço - INSS - IR - CSLL - COFINS - PIS - Descontos Diversos - ISS Retido - Desconto Incondicional', margin + 7, y + 5, { maxWidth: contentWidth - 20 });
  
  y += 20;
  
  // === FOOTER ===
  doc.setFontSize(8);
  doc.text('Consulte a autenticidade deste documento acessando o site https://www.pmvc.ba.gov.br', pageWidth/2, y, { align: 'center' });
  
  return doc;
}

export async function generateDANFSE(xmlContent: string): Promise<{ success: boolean, pdfPath?: string, error?: string }> {
  try {
    console.log('Gerando DANFSe oficial para XML de tamanho:', xmlContent.length);
    
    // Extrair dados do XML
    const danfseData = await extractDANFSeData(xmlContent);
    console.log('Dados extraídos para DANFSe:', JSON.stringify(danfseData, null, 2));
    
    // Gerar PDF oficial
    const pdfDoc = generateOfficialDANFSe(danfseData);
    
    // Salvar arquivo
    const tempDir = os.tmpdir();
    const pdfPath = path.join(tempDir, `danfse_official_${Date.now()}.pdf`);
    
    const pdfBuffer = Buffer.from(pdfDoc.output('arraybuffer'));
    fs.writeFileSync(pdfPath, pdfBuffer);
    
    console.log('DANFSe oficial gerada com sucesso:', pdfPath);
    console.log('Tamanho do arquivo:', pdfBuffer.length, 'bytes');
    
    return {
      success: true,
      pdfPath: pdfPath
    };
    
  } catch (error) {
    console.error('Erro ao gerar DANFSe oficial:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Erro desconhecido'
    };
  }
}