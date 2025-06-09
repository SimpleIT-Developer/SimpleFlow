import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { parseStringPromise } from 'xml2js';
import { jsPDF } from 'jspdf';

interface DANFSeLayoutFinalData {
  numeroNfse: string;
  dataEmissao: string;
  codigoVerificacao: string;
  
  prestador: {
    cnpj: string;
    razaoSocial: string;
    endereco: string;
    numero: string;
    complemento: string;
    bairro: string;
    cep: string;
    municipio: string;
    uf: string;
    inscricaoMunicipal: string;
    inscricaoEstadual: string;
    telefone: string;
    email: string;
  };
  
  tomador: {
    cnpj: string;
    razaoSocial: string;
    endereco: string;
    numero: string;
    bairro: string;
    cep: string;
    municipio: string;
    uf: string;
    inscricaoMunicipal: string;
    inscricaoEstadual: string;
  };
  
  descricaoServicos: string;
  observacoes: string;
  
  codigoServico: string;
  valorServicos: number;
  valorDeducoes: number;
  baseCalculo: number;
  aliquota: number;
  valorIss: number;
  issRetido: boolean;
  valorTotalNota: number;
  
  pis: number;
  cofins: number;
  inss: number;
  ir: number;
  csll: number;
  
  outrasInformacoes: string;
}

async function extrairDadosLayoutFinal(xmlContent: string): Promise<DANFSeLayoutFinalData> {
  try {
    let cleanXml = xmlContent.trim();
    
    if (!cleanXml.startsWith('<')) {
      cleanXml = Buffer.from(cleanXml, 'base64').toString('utf-8');
    }
    
    cleanXml = cleanXml.replace(/^\uFEFF/, '');
    cleanXml = cleanXml.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '');
    
    const parsed = await parseStringPromise(cleanXml, { explicitArray: false });
    
    // Buscar valor ISS recursivamente
    function buscarVISSQN(obj: any): any {
      if (typeof obj !== 'object' || obj === null) return null;
      
      for (const [key, value] of Object.entries(obj)) {
        if (key === 'vISSQN' && value) {
          return value;
        }
        if (typeof value === 'object') {
          const resultado = buscarVISSQN(value);
          if (resultado) return resultado;
        }
      }
      return null;
    }
    
    const valorIssEncontrado = buscarVISSQN(parsed);
    
    // Estrutura NFSe padrão
    if (parsed.NFSe && parsed.NFSe.infNFSe) {
      const infNFSe = parsed.NFSe.infNFSe;
      const emit = infNFSe.emit || {};
      const enderNac = emit.enderNac || {};
      const dps = infNFSe.DPS?.infDPS || {};
      const toma = dps.toma || {};
      const tomaEnd = toma.end || {};
      const tomaEndNac = tomaEnd.endNac || {};
      const serv = dps.serv || {};
      const cServ = serv.cServ || {};
      const valores = dps.valores || infNFSe.valores || {};
      
      return {
        numeroNfse: infNFSe.nNFSe || '',
        dataEmissao: dps.dhEmi || infNFSe.dhEmi || '',
        codigoVerificacao: infNFSe.cVerif || '',
        
        prestador: {
          cnpj: formatarCNPJ(emit.CNPJ || ''),
          razaoSocial: emit.xNome || '',
          endereco: enderNac.xLgr || '',
          numero: enderNac.nro || '',
          complemento: enderNac.xCpl || '',
          bairro: enderNac.xBairro || '',
          cep: formatarCEP(enderNac.CEP || ''),
          municipio: obterNomeMunicipio(enderNac.cMun || ''),
          uf: enderNac.UF || '',
          inscricaoMunicipal: emit.IM || '',
          inscricaoEstadual: '',
          telefone: emit.fone || '',
          email: emit.email || ''
        },
        
        tomador: {
          cnpj: formatarCNPJ(toma.CNPJ || ''),
          razaoSocial: toma.xNome || '',
          endereco: tomaEnd.xLgr || '',
          numero: tomaEnd.nro || '',
          bairro: tomaEnd.xBairro || '',
          cep: formatarCEP(tomaEndNac.CEP || ''),
          municipio: obterNomeMunicipio(tomaEndNac.cMun || ''),
          uf: tomaEndNac.UF || '',
          inscricaoMunicipal: toma.IM || '',
          inscricaoEstadual: ''
        },
        
        descricaoServicos: cServ.xDescServ || '',
        observacoes: valores.xOutInf || '',
        
        codigoServico: cServ.cTribNac || '',
        valorServicos: parseFloat(valores.vServPrest?.vServ || valores.vServ || '0'),
        valorDeducoes: 0,
        baseCalculo: parseFloat(valores.vBC || valores.vServ || '0'),
        aliquota: parseFloat(valores.pAliqAplic || '0'),
        valorIss: parseFloat(valorIssEncontrado || '0'),
        issRetido: valores.tpRetISSQN === '1',
        valorTotalNota: parseFloat(valores.vLiq || valores.vServ || '0'),
        
        pis: parseFloat(valores.vPIS || '0'),
        cofins: parseFloat(valores.vCOFINS || '0'),
        inss: parseFloat(valores.vINSS || '0'),
        ir: parseFloat(valores.vIR || '0'),
        csll: parseFloat(valores.vCSLL || '0'),
        
        outrasInformacoes: valores.xOutInf || ''
      };
    }
    
    // Estrutura NFe simplificada
    else if (parsed.NFe) {
      const nfe = parsed.NFe;
      const chaveNFe = nfe.ChaveNFe || {};
      const enderecoPrestador = nfe.EnderecoPrestador || {};
      const enderecoTomador = nfe.EnderecoTomador || {};
      
      return {
        numeroNfse: chaveNFe.NumeroNFe || '',
        dataEmissao: nfe.DataEmissaoNFe || '',
        codigoVerificacao: chaveNFe.CodigoVerificacao || '',
        
        prestador: {
          cnpj: formatarCNPJ(nfe.CPFCNPJPrestador?.CNPJ || ''),
          razaoSocial: nfe.RazaoSocialPrestador || '',
          endereco: enderecoPrestador.Logradouro || '',
          numero: enderecoPrestador.NumeroEndereco || '',
          complemento: enderecoPrestador.ComplementoEndereco || '',
          bairro: enderecoPrestador.Bairro || '',
          cep: formatarCEP(enderecoPrestador.CEP || ''),
          municipio: obterNomeMunicipio(enderecoPrestador.Cidade || ''),
          uf: enderecoPrestador.UF || '',
          inscricaoMunicipal: chaveNFe.InscricaoPrestador || '',
          inscricaoEstadual: '',
          telefone: '',
          email: nfe.EmailPrestador || ''
        },
        
        tomador: {
          cnpj: formatarCNPJ(nfe.CPFCNPJTomador?.CNPJ || ''),
          razaoSocial: nfe.RazaoSocialTomador || '',
          endereco: enderecoTomador.Logradouro || '',
          numero: enderecoTomador.NumeroEndereco || '',
          bairro: enderecoTomador.Bairro || '',
          cep: formatarCEP(enderecoTomador.CEP || ''),
          municipio: obterNomeMunicipio(enderecoTomador.Cidade || ''),
          uf: enderecoTomador.UF || '',
          inscricaoMunicipal: '',
          inscricaoEstadual: nfe.InscricaoEstadualTomador || ''
        },
        
        descricaoServicos: nfe.Discriminacao || '',
        observacoes: '',
        
        codigoServico: nfe.CodigoServico || '',
        valorServicos: parseFloat(nfe.ValorServicos || '0'),
        valorDeducoes: 0,
        baseCalculo: parseFloat(nfe.ValorServicos || '0'),
        aliquota: parseFloat(nfe.AliquotaServicos || '0') * 100,
        valorIss: parseFloat(nfe.ValorISS || '0'),
        issRetido: nfe.ISSRetido === 'true',
        valorTotalNota: parseFloat(nfe.ValorServicos || '0'),
        
        pis: parseFloat(nfe.ValorPIS || '0'),
        cofins: parseFloat(nfe.ValorCOFINS || '0'),
        inss: parseFloat(nfe.ValorINSS || '0'),
        ir: parseFloat(nfe.ValorIR || '0'),
        csll: parseFloat(nfe.ValorCSLL || '0'),
        
        outrasInformacoes: nfe.Discriminacao || ''
      };
    }
    
    throw new Error('Estrutura XML não reconhecida');
    
  } catch (error) {
    console.error('Erro ao processar XML final:', error);
    throw new Error(`Erro ao analisar XML: ${error instanceof Error ? error.message : String(error)}`);
  }
}

function formatarCNPJ(cnpj: string): string {
  const numbers = cnpj.replace(/\D/g, '');
  if (numbers.length === 14) {
    return numbers.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5');
  }
  return cnpj;
}

function formatarCEP(cep: string): string {
  const numbers = cep.replace(/\D/g, '');
  if (numbers.length === 8) {
    return numbers.replace(/(\d{5})(\d{3})/, '$1-$2');
  }
  return cep;
}

function formatarMoeda(value: number): string {
  return value.toLocaleString('pt-BR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
}

function formatarData(dateStr: string): string {
  try {
    const date = new Date(dateStr);
    return date.toLocaleDateString('pt-BR');
  } catch {
    return new Date().toLocaleDateString('pt-BR');
  }
}

function obterNomeMunicipio(codigo: string): string {
  const municipios: Record<string, string> = {
    '3106200': 'BELO HORIZONTE',
    '3550308': 'SÃO PAULO',
    '3509502': 'CAMPINAS',
    '2927408': 'SALVADOR'
  };
  return municipios[codigo] || '';
}

function criarDANFSeLayoutFinal(data: DANFSeLayoutFinalData): jsPDF {
  const doc = new jsPDF('p', 'mm', 'a4');
  
  const largura = 210;
  const altura = 297;
  const margem = 10;
  const larguraConteudo = largura - (margem * 2);
  let y = margem;
  
  // Borda principal
  doc.rect(margem, margem, larguraConteudo, altura - (margem * 2));
  
  // === CABEÇALHO CONFORME MODELO ===
  y += 5;
  
  // Primeira linha - Prefeitura e Número da NF-e
  const larguraEsquerda = 140;
  const larguraDireita = 50;
  
  // Lado esquerdo
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text('PREFEITURA MUNICIPAL DE SÃO PAULO', margem + 5, y);
  
  // Lado direito - Número da NF-e
  doc.rect(margem + larguraEsquerda, margem + 2, larguraDireita, 25);
  doc.setFontSize(8);
  doc.text('Número da NF-e', margem + larguraEsquerda + 25, y - 2, { align: 'center' });
  
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.text(data.numeroNfse, margem + larguraEsquerda + 25, y + 5, { align: 'center' });
  
  y += 6;
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text('SECRETARIA MUNICIPAL DA FAZENDA', margem + 5, y);
  
  y += 6;
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('NOTA FISCAL DE SERVIÇOS ELETRÔNICA - NFSe', margem + 5, y);
  
  // Data e Hora de Emissão no canto direito
  doc.setFontSize(7);
  doc.setFont('helvetica', 'normal');
  doc.text('Data e Hora de Emissão', margem + larguraEsquerda + 25, y + 8, { align: 'center' });
  doc.text(formatarData(data.dataEmissao), margem + larguraEsquerda + 25, y + 12, { align: 'center' });
  
  y += 8;
  doc.setFontSize(8);
  doc.text('(CONSTITUÍDA PELO DECRETO Nº 53.151 DE 10 DE JUNHO DE 2012)', margem + 5, y);
  
  // Código de Verificação
  if (data.codigoVerificacao) {
    y += 6;
    doc.setFontSize(7);
    doc.text(`Código de Verificação`, margem + larguraEsquerda + 25, y + 4, { align: 'center' });
    doc.text(data.codigoVerificacao, margem + larguraEsquerda + 25, y + 8, { align: 'center' });
  }
  
  y += 15;
  
  // === PRESTADOR DE SERVIÇOS ===
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text('PRESTADOR DE SERVIÇOS', margem + 5, y);
  
  y += 5;
  const prestadorHeight = 50;
  doc.rect(margem + 5, y, larguraConteudo - 10, prestadorHeight);
  
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  
  // Primeira linha
  doc.setFont('helvetica', 'bold');
  doc.text('CPF/CNPJ:', margem + 8, y + 6);
  doc.setFont('helvetica', 'normal');
  doc.text(data.prestador.cnpj, margem + 30, y + 6);
  
  doc.setFont('helvetica', 'bold');
  doc.text('Inscrição Municipal:', margem + 110, y + 6);
  doc.setFont('helvetica', 'normal');
  doc.text(data.prestador.inscricaoMunicipal, margem + 155, y + 6);
  
  // Segunda linha
  doc.setFont('helvetica', 'bold');
  doc.text('Razão Social:', margem + 8, y + 12);
  doc.setFont('helvetica', 'normal');
  const razaoLimitada = data.prestador.razaoSocial.length > 70 ? 
    data.prestador.razaoSocial.substring(0, 70) + '...' : 
    data.prestador.razaoSocial;
  doc.text(razaoLimitada, margem + 35, y + 12);
  
  // Terceira linha
  doc.setFont('helvetica', 'bold');
  doc.text('Endereço:', margem + 8, y + 18);
  doc.setFont('helvetica', 'normal');
  const enderecoCompleto = `${data.prestador.endereco}, ${data.prestador.numero}`;
  doc.text(enderecoCompleto, margem + 28, y + 18);
  
  // Quarta linha
  doc.setFont('helvetica', 'bold');
  doc.text('CEP:', margem + 8, y + 24);
  doc.setFont('helvetica', 'normal');
  doc.text(data.prestador.cep, margem + 20, y + 24);
  
  doc.setFont('helvetica', 'bold');
  doc.text('Bairro:', margem + 50, y + 24);
  doc.setFont('helvetica', 'normal');
  doc.text(data.prestador.bairro, margem + 65, y + 24);
  
  // Quinta linha
  doc.setFont('helvetica', 'bold');
  doc.text('Município:', margem + 8, y + 30);
  doc.setFont('helvetica', 'normal');
  doc.text(data.prestador.municipio, margem + 28, y + 30);
  
  doc.setFont('helvetica', 'bold');
  doc.text('Estado:', margem + 120, y + 30);
  doc.setFont('helvetica', 'normal');
  doc.text(data.prestador.uf, margem + 135, y + 30);
  
  y += prestadorHeight + 10;
  
  // === TOMADOR DE SERVIÇOS ===
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text('TOMADOR DE SERVIÇOS', margem + 5, y);
  
  y += 5;
  const tomadorHeight = 40;
  doc.rect(margem + 5, y, larguraConteudo - 10, tomadorHeight);
  
  doc.setFontSize(8);
  
  // Primeira linha
  doc.setFont('helvetica', 'bold');
  doc.text('CPF/CNPJ:', margem + 8, y + 6);
  doc.setFont('helvetica', 'normal');
  doc.text(data.tomador.cnpj, margem + 30, y + 6);
  
  if (data.tomador.inscricaoMunicipal) {
    doc.setFont('helvetica', 'bold');
    doc.text('Inscrição Municipal:', margem + 110, y + 6);
    doc.setFont('helvetica', 'normal');
    doc.text(data.tomador.inscricaoMunicipal, margem + 155, y + 6);
  }
  
  // Segunda linha
  doc.setFont('helvetica', 'bold');
  doc.text('Razão Social:', margem + 8, y + 12);
  doc.setFont('helvetica', 'normal');
  doc.text(data.tomador.razaoSocial, margem + 35, y + 12);
  
  // Terceira linha
  doc.setFont('helvetica', 'bold');
  doc.text('Endereço:', margem + 8, y + 18);
  doc.setFont('helvetica', 'normal');
  const enderecoTomador = `${data.tomador.endereco}, ${data.tomador.numero} - ${data.tomador.bairro}`.replace(/, -/, ' -');
  doc.text(enderecoTomador, margem + 28, y + 18);
  
  // Quarta linha
  doc.setFont('helvetica', 'bold');
  doc.text('CEP:', margem + 8, y + 24);
  doc.setFont('helvetica', 'normal');
  doc.text(data.tomador.cep, margem + 20, y + 24);
  
  doc.setFont('helvetica', 'bold');
  doc.text('Município:', margem + 50, y + 24);
  doc.setFont('helvetica', 'normal');
  doc.text(data.tomador.municipio, margem + 70, y + 24);
  
  doc.setFont('helvetica', 'bold');
  doc.text('Estado:', margem + 140, y + 24);
  doc.setFont('helvetica', 'normal');
  doc.text(data.tomador.uf, margem + 155, y + 24);
  
  y += tomadorHeight + 10;
  
  // === DESCRIÇÃO DOS SERVIÇOS ===
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text('DESCRIÇÃO DOS SERVIÇOS', margem + 5, y);
  
  y += 5;
  const descricaoHeight = 60;
  doc.rect(margem + 5, y, larguraConteudo - 10, descricaoHeight);
  
  doc.setFontSize(7);
  doc.setFont('helvetica', 'normal');
  
  const textoCompleto = `${data.codigoServico} - ${data.descricaoServicos}`;
  const linhasDescricao = doc.splitTextToSize(textoCompleto, larguraConteudo - 20);
  const linhasLimitadas = linhasDescricao.slice(0, 8);
  
  linhasLimitadas.forEach((linha: string, index: number) => {
    doc.text(linha, margem + 8, y + 5 + (index * 4));
  });
  
  y += descricaoHeight + 10;
  
  // === VALOR TOTAL DA NOTA ===
  const valorHeight = 15;
  doc.rect(margem + 5, y, larguraConteudo - 10, valorHeight);
  
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text(`VALOR TOTAL DA NOTA - R$ ${formatarMoeda(data.valorTotalNota)}`, largura/2, y + 10, { align: 'center' });
  
  y += valorHeight + 5;
  
  // === TABELA DE VALORES ===
  const colunas = [30, 30, 30, 30, 20, 20, 20];
  const cabecalhos = ['Código de Serviço', 'Valor Serviços (R$)', 'Valor Deduções (R$)', 'Base Cálculo (R$)', 'Alíquota (%)', 'ISS Retido', 'Valor Líquido (R$)'];
  
  let x = margem + 5;
  doc.setFontSize(6);
  doc.setFont('helvetica', 'bold');
  
  cabecalhos.forEach((cabecalho, i) => {
    doc.rect(x, y, colunas[i], 6);
    doc.text(cabecalho, x + colunas[i]/2, y + 4, { align: 'center' });
    x += colunas[i];
  });
  
  y += 6;
  x = margem + 5;
  doc.setFont('helvetica', 'normal');
  
  const valoresTabela = [
    data.codigoServico,
    formatarMoeda(data.valorServicos),
    formatarMoeda(data.valorDeducoes),
    formatarMoeda(data.baseCalculo),
    data.aliquota.toFixed(2),
    data.issRetido ? 'Sim' : 'Não',
    formatarMoeda(data.valorTotalNota)
  ];
  
  valoresTabela.forEach((valor, i) => {
    doc.rect(x, y, colunas[i], 6);
    doc.text(valor, x + colunas[i]/2, y + 4, { align: 'center' });
    x += colunas[i];
  });
  
  y += 10;
  
  // === TRIBUTOS FEDERAIS ===
  const tribColunas = [32, 32, 32, 32, 32];
  const tribCabecalhos = ['PIS (%)', 'COFINS (%)', 'INSS (%)', 'IR (%)', 'CSLL (%)'];
  
  x = margem + 5;
  doc.setFontSize(6);
  doc.setFont('helvetica', 'bold');
  
  tribCabecalhos.forEach((cabecalho, i) => {
    doc.rect(x, y, tribColunas[i], 6);
    doc.text(cabecalho, x + tribColunas[i]/2, y + 4, { align: 'center' });
    x += tribColunas[i];
  });
  
  y += 6;
  x = margem + 5;
  doc.setFont('helvetica', 'normal');
  
  const tribValores = [
    formatarMoeda(data.pis),
    formatarMoeda(data.cofins),
    formatarMoeda(data.inss),
    formatarMoeda(data.ir),
    formatarMoeda(data.csll)
  ];
  
  tribValores.forEach((valor, i) => {
    doc.rect(x, y, tribColunas[i], 6);
    doc.text(valor, x + tribColunas[i]/2, y + 4, { align: 'center' });
    x += tribColunas[i];
  });
  
  y += 12;
  
  // === OUTRAS INFORMAÇÕES ===
  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.text('OUTRAS INFORMAÇÕES', margem + 5, y);
  
  y += 5;
  const outrasHeight = 20;
  doc.rect(margem + 5, y, larguraConteudo - 10, outrasHeight);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6);
  
  if (data.outrasInformacoes) {
    const linhasOutras = doc.splitTextToSize(data.outrasInformacoes, larguraConteudo - 20);
    const linhasLimitadas = linhasOutras.slice(0, 3);
    linhasLimitadas.forEach((linha: string, index: number) => {
      doc.text(linha, margem + 8, y + 5 + (index * 4));
    });
  }
  
  return doc;
}

export async function generateDANFSE(xmlContent: string): Promise<{ success: boolean, pdfPath?: string, error?: string }> {
  try {
    console.log('Gerando DANFSe layout final para XML de tamanho:', xmlContent.length);
    
    const dadosLayout = await extrairDadosLayoutFinal(xmlContent);
    console.log('Dados mapeados layout final:', JSON.stringify(dadosLayout, null, 2));
    
    const pdfDoc = criarDANFSeLayoutFinal(dadosLayout);
    
    const tempDir = os.tmpdir();
    const pdfPath = path.join(tempDir, `danfse_layout_final_${Date.now()}.pdf`);
    
    const pdfBuffer = Buffer.from(pdfDoc.output('arraybuffer'));
    fs.writeFileSync(pdfPath, pdfBuffer);
    
    console.log('DANFSe layout final gerada:', pdfPath);
    console.log('Tamanho do arquivo:', pdfBuffer.length, 'bytes');
    
    return {
      success: true,
      pdfPath: pdfPath
    };
    
  } catch (error) {
    console.error('Erro ao gerar DANFSe layout final:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Erro desconhecido ao gerar DANFSe layout final'
    };
  }
}