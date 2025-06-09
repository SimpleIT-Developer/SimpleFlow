import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { parseStringPromise } from 'xml2js';
import { jsPDF } from 'jspdf';

interface DANFSeOficialData {
  // Cabeçalho
  numeroNfse: string;
  dataEmissao: string;
  codigoVerificacao: string;
  
  // Prestador de Serviços
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
  
  // Tomador de Serviços
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
  
  // Descrição dos Serviços
  descricaoServicos: string;
  observacoes: string;
  
  // Valores
  codigoServico: string;
  valorServicos: number;
  valorDeducoes: number;
  baseCalculo: number;
  aliquota: number;
  valorIss: number;
  issRetido: boolean;
  valorTotalNota: number;
  
  // Tributos Federais
  pis: number;
  cofins: number;
  inss: number;
  ir: number;
  csll: number;
  
  // Outras Informações
  outrasInformacoes: string;
}

async function extrairDadosOficiais(xmlContent: string): Promise<DANFSeOficialData> {
  try {
    let cleanXml = xmlContent.trim();
    
    // Decodificar base64 se necessário
    if (!cleanXml.startsWith('<')) {
      cleanXml = Buffer.from(cleanXml, 'base64').toString('utf-8');
    }
    
    cleanXml = cleanXml.replace(/^\uFEFF/, '');
    cleanXml = cleanXml.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '');
    
    const parsed = await parseStringPromise(cleanXml, { explicitArray: false });
    console.log('Estrutura XML detectada:', Object.keys(parsed));
    
    // Tipo 1 e 2: NFSe padrão SPED
    if (parsed.NFSe && parsed.NFSe.infNFSe) {
      return await processarNFSeOficial(parsed);
    }
    
    // Tipo 3: NFe Simplificada (Campinas/Outras)
    else if (parsed.NFe) {
      return await processarNFeOficial(parsed);
    }
    
    throw new Error('Estrutura XML não reconhecida para DANFSe oficial');
    
  } catch (error) {
    console.error('Erro ao extrair dados oficiais:', error);
    throw new Error(`Erro ao processar XML oficial: ${error instanceof Error ? error.message : String(error)}`);
  }
}

async function processarNFSeOficial(parsed: any): Promise<DANFSeOficialData> {
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
  const vServPrest = valores.vServPrest || {};
  
  // Debug do valor ISS
  console.log('Procurando valor ISS em:');
  console.log('valores.vISSQN:', valores.vISSQN);
  console.log('valores.vISS:', valores.vISS);
  console.log('serv.vISSQN:', serv.vISSQN);
  console.log('infNFSe.vISSQN:', infNFSe.vISSQN);
  console.log('parsed.NFSe.vISSQN:', parsed.NFSe.vISSQN);
  
  // Buscar vISSQN em qualquer lugar da estrutura
  function buscarVISSQN(obj: any, caminho = ''): any {
    if (typeof obj !== 'object' || obj === null) return null;
    
    for (const [key, value] of Object.entries(obj)) {
      const novoCaminho = caminho ? `${caminho}.${key}` : key;
      if (key === 'vISSQN' && value) {
        console.log(`Encontrado vISSQN em ${novoCaminho}:`, value);
        return value;
      }
      if (typeof value === 'object') {
        const resultado = buscarVISSQN(value, novoCaminho);
        if (resultado) return resultado;
      }
    }
    return null;
  }
  
  const valorIssEncontrado = buscarVISSQN(parsed);
  
  return {
    // Número da NF-e: /NFSe/infNFSe/nNFSe
    numeroNfse: infNFSe.nNFSe || '',
    
    // Data Emissão: /NFSe/infNFSe/DPS/infDPS/dhEmi
    dataEmissao: dps.dhEmi || infNFSe.dhEmi || '',
    
    // Código Verificação: (não existe em NFSe padrão)
    codigoVerificacao: '',
    
    prestador: {
      // CNPJ: /NFSe/infNFSe/emit/CNPJ
      cnpj: formatarCNPJ(emit.CNPJ || ''),
      
      // Razão Social: /NFSe/infNFSe/emit/xNome
      razaoSocial: emit.xNome || '',
      
      // Endereço: /NFSe/infNFSe/emit/enderNac/xLgr
      endereco: enderNac.xLgr || '',
      
      // Número: /NFSe/infNFSe/emit/enderNac/nro
      numero: enderNac.nro || '',
      
      // Complemento: /NFSe/infNFSe/emit/enderNac/xCpl
      complemento: enderNac.xCpl || '',
      
      // Bairro: /NFSe/infNFSe/emit/enderNac/xBairro
      bairro: enderNac.xBairro || '',
      
      // CEP: /NFSe/infNFSe/emit/enderNac/CEP
      cep: formatarCEP(enderNac.CEP || ''),
      
      // Município: /NFSe/infNFSe/emit/enderNac/cMun
      municipio: obterNomeMunicipio(enderNac.cMun || ''),
      
      // UF: /NFSe/infNFSe/emit/enderNac/UF
      uf: enderNac.UF || '',
      
      // Inscrição Municipal: /NFSe/infNFSe/emit/IM
      inscricaoMunicipal: emit.IM || '',
      
      inscricaoEstadual: '',
      
      // Telefone: /NFSe/infNFSe/emit/fone
      telefone: emit.fone || '',
      
      // E-mail: /NFSe/infNFSe/emit/email
      email: emit.email || ''
    },
    
    tomador: {
      // CNPJ: /NFSe/infNFSe/DPS/infDPS/toma/CNPJ
      cnpj: formatarCNPJ(toma.CNPJ || ''),
      
      // Razão Social: /NFSe/infNFSe/DPS/infDPS/toma/xNome
      razaoSocial: toma.xNome || '',
      
      // Endereço: /NFSe/infNFSe/DPS/infDPS/toma/end/xLgr
      endereco: tomaEnd.xLgr || '',
      
      // Número: /NFSe/infNFSe/DPS/infDPS/toma/end/nro
      numero: tomaEnd.nro || '',
      
      // Bairro: /NFSe/infNFSe/DPS/infDPS/toma/end/xBairro
      bairro: tomaEnd.xBairro || '',
      
      // CEP: /NFSe/infNFSe/DPS/infDPS/toma/end/endNac/CEP
      cep: formatarCEP(tomaEndNac.CEP || ''),
      
      // Município: /NFSe/infNFSe/DPS/infDPS/toma/end/endNac/cMun
      municipio: obterNomeMunicipio(tomaEndNac.cMun || ''),
      
      // UF: /NFSe/infNFSe/DPS/infDPS/toma/end/endNac/UF
      uf: tomaEndNac.UF || '',
      
      // Inscrição Municipal: /NFSe/infNFSe/DPS/infDPS/toma/IM
      inscricaoMunicipal: toma.IM || '',
      
      inscricaoEstadual: ''
    },
    
    // Descrição dos Serviços: /NFSe/infNFSe/DPS/infDPS/serv/cServ/xDescServ
    descricaoServicos: cServ.xDescServ || '',
    
    // Observações: /NFSe/infNFSe/valores/xOutInf ou /NFSe/infNFSe/DPS/infDPS/serv/infoCompl/xInfComp
    observacoes: valores.xOutInf || serv.infoCompl?.xInfComp || infNFSe.xNBS || '',
    
    // Código do Serviço: /NFSe/infNFSe/DPS/infDPS/serv/cServ/cTribNac
    codigoServico: cServ.cTribNac || '',
    
    // Valor dos Serviços: /NFSe/infNFSe/DPS/infDPS/valores/vServPrest/vServ
    valorServicos: parseFloat(vServPrest.vServ || valores.vServ || '0'),
    
    valorDeducoes: 0, // Não tem no padrão NFSe
    
    // Base de Cálculo: /NFSe/infNFSe/valores/vBC
    baseCalculo: parseFloat(valores.vBC || vServPrest.vServ || '0'),
    
    // Alíquota: /NFSe/infNFSe/valores/pAliqAplic
    aliquota: parseFloat(valores.pAliqAplic || valores.aliq || '0'),
    
    // ISS: usar o valor encontrado pela busca recursiva
    valorIss: parseFloat(valorIssEncontrado || '0'),
    
    issRetido: valores.tpRetISSQN === '1',
    
    // Valor Total: /NFSe/infNFSe/valores/vLiq
    valorTotalNota: parseFloat(valores.vLiq || vServPrest.vServ || '0'),
    
    // Tributos federais: buscar em diferentes locais do XML
    pis: parseFloat(valores.vPIS || serv.vPIS || dps.vPIS || '0'),
    cofins: parseFloat(valores.vCOFINS || serv.vCOFINS || dps.vCOFINS || '0'),
    inss: parseFloat(valores.vINSS || serv.vINSS || dps.vINSS || '0'),
    ir: parseFloat(valores.vIR || serv.vIR || dps.vIR || '0'),
    csll: parseFloat(valores.vCSLL || serv.vCSLL || dps.vCSLL || '0'),
    
    // Outras Informações: /NFSe/infNFSe/valores/xOutInf
    outrasInformacoes: valores.xOutInf || serv.infoCompl?.xInfComp || ''
  };
}

async function processarNFeOficial(parsed: any): Promise<DANFSeOficialData> {
  const nfe = parsed.NFe;
  const chaveNFe = nfe.ChaveNFe || {};
  const enderecoPrestador = nfe.EnderecoPrestador || {};
  const enderecoTomador = nfe.EnderecoTomador || {};
  const cpfCnpjPrestador = nfe.CPFCNPJPrestador || {};
  const cpfCnpjTomador = nfe.CPFCNPJTomador || {};
  
  return {
    // Número da NF-e: /NFe/ChaveNFe/NumeroNFe
    numeroNfse: chaveNFe.NumeroNFe || '',
    
    // Data Emissão: /NFe/DataEmissaoNFe
    dataEmissao: nfe.DataEmissaoNFe || '',
    
    // Código Verificação: /NFe/ChaveNFe/CodigoVerificacao
    codigoVerificacao: chaveNFe.CodigoVerificacao || '',
    
    prestador: {
      // CNPJ: /NFe/CPFCNPJPrestador/CNPJ
      cnpj: formatarCNPJ(cpfCnpjPrestador.CNPJ || ''),
      
      // Razão Social: /NFe/RazaoSocialPrestador
      razaoSocial: nfe.RazaoSocialPrestador || '',
      
      // Endereço: /NFe/EnderecoPrestador/Logradouro
      endereco: enderecoPrestador.Logradouro || '',
      
      // Número: /NFe/EnderecoPrestador/NumeroEndereco
      numero: enderecoPrestador.NumeroEndereco || '',
      
      // Complemento: /NFe/EnderecoPrestador/ComplementoEndereco
      complemento: enderecoPrestador.ComplementoEndereco || '',
      
      // Bairro: /NFe/EnderecoPrestador/Bairro
      bairro: enderecoPrestador.Bairro || '',
      
      // CEP: /NFe/EnderecoPrestador/CEP
      cep: formatarCEP(enderecoPrestador.CEP || ''),
      
      // Município: /NFe/EnderecoPrestador/Cidade
      municipio: obterNomeMunicipio(enderecoPrestador.Cidade || ''),
      
      // UF: /NFe/EnderecoPrestador/UF
      uf: enderecoPrestador.UF || '',
      
      // Inscrição Municipal: /NFe/ChaveNFe/InscricaoPrestador
      inscricaoMunicipal: chaveNFe.InscricaoPrestador || '',
      
      inscricaoEstadual: '',
      
      telefone: '',
      
      // E-mail: /NFe/EmailPrestador
      email: nfe.EmailPrestador || ''
    },
    
    tomador: {
      // CNPJ: /NFe/CPFCNPJTomador/CNPJ
      cnpj: formatarCNPJ(cpfCnpjTomador.CNPJ || ''),
      
      // Razão Social: /NFe/RazaoSocialTomador
      razaoSocial: nfe.RazaoSocialTomador || '',
      
      // Endereço: /NFe/EnderecoTomador/Logradouro
      endereco: enderecoTomador.Logradouro || '',
      
      // Número: /NFe/EnderecoTomador/NumeroEndereco
      numero: enderecoTomador.NumeroEndereco || '',
      
      // Bairro: /NFe/EnderecoTomador/Bairro
      bairro: enderecoTomador.Bairro || '',
      
      // CEP: /NFe/EnderecoTomador/CEP
      cep: formatarCEP(enderecoTomador.CEP || ''),
      
      // Município: /NFe/EnderecoTomador/Cidade
      municipio: obterNomeMunicipio(enderecoTomador.Cidade || ''),
      
      // UF: /NFe/EnderecoTomador/UF
      uf: enderecoTomador.UF || '',
      
      inscricaoMunicipal: '',
      
      // Inscrição Estadual: /NFe/InscricaoEstadualTomador
      inscricaoEstadual: nfe.InscricaoEstadualTomador || ''
    },
    
    // Descrição dos Serviços: /NFe/Discriminacao
    descricaoServicos: nfe.Discriminacao || '',
    
    observacoes: '',
    
    // Código do Serviço: /NFe/CodigoServico
    codigoServico: nfe.CodigoServico || '',
    
    // Valor dos Serviços: /NFe/ValorServicos
    valorServicos: parseFloat(nfe.ValorServicos || '0'),
    
    valorDeducoes: 0,
    
    // Base de Cálculo: /NFe/ValorServicos (igual valor do serviço)
    baseCalculo: parseFloat(nfe.ValorServicos || '0'),
    
    // Alíquota: /NFe/AliquotaServicos
    aliquota: parseFloat(nfe.AliquotaServicos || '0') * 100, // Converter para porcentagem
    
    // ISS: /NFe/ValorISS
    valorIss: parseFloat(nfe.ValorISS || '0'),
    
    // ISS Retido: /NFe/ISSRetido
    issRetido: nfe.ISSRetido === 'true',
    
    // Valor Total: /NFe/ValorServicos
    valorTotalNota: parseFloat(nfe.ValorServicos || '0'),
    
    // Tributos federais (se existirem)
    pis: parseFloat(nfe.ValorPIS || '0'),
    cofins: parseFloat(nfe.ValorCOFINS || '0'),
    inss: parseFloat(nfe.ValorINSS || '0'),
    ir: parseFloat(nfe.ValorIR || '0'),
    csll: parseFloat(nfe.ValorCSLL || '0'),
    
    // Outras Informações: /NFe/Discriminacao
    outrasInformacoes: nfe.Discriminacao || ''
  };
}

function formatarCNPJ(cnpj: string): string {
  const numeros = cnpj.replace(/\D/g, '');
  if (numeros.length === 14) {
    return numeros.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5');
  }
  return cnpj;
}

function formatarCEP(cep: string): string {
  const numeros = cep.replace(/\D/g, '');
  if (numeros.length === 8) {
    return numeros.replace(/(\d{5})(\d{3})/, '$1-$2');
  }
  return cep;
}

function formatarMoeda(valor: number): string {
  return valor.toLocaleString('pt-BR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
}

function formatarData(dataStr: string): string {
  try {
    const data = new Date(dataStr);
    return data.toLocaleDateString('pt-BR');
  } catch {
    return new Date().toLocaleDateString('pt-BR');
  }
}

function obterNomeMunicipio(codigo: string): string {
  const municipios: Record<string, string> = {
    '3106200': 'BELO HORIZONTE',
    '3550308': 'SÃO PAULO',
    '3509502': 'CAMPINAS',
    '2927408': 'SALVADOR',
    '3304557': 'RIO DE JANEIRO',
    '4106902': 'CURITIBA',
    '5208707': 'GOIÂNIA',
    '2304400': 'FORTALEZA',
    '2611606': 'RECIFE',
    '1302603': 'MANAUS'
  };
  return municipios[codigo] || '';
}

function gerarDANFSeOficial(data: DANFSeOficialData): jsPDF {
  const doc = new jsPDF('p', 'mm', 'a4');
  
  // Configurações do documento
  const largura = 210;
  const altura = 297;
  const margem = 10;
  const larguraConteudo = largura - (margem * 2);
  let y = margem;
  
  // Borda principal do documento
  doc.rect(margem, margem, larguraConteudo, altura - (margem * 2));
  
  // === CABEÇALHO EM DUAS COLUNAS ===
  y += 5;
  
  // Coluna esquerda - Informações principais
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('NOTA FISCAL DE SERVIÇOS ELETRÔNICA - NFSe', margem + 5, y);
  
  y += 8;
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text('SECRETARIA MUNICIPAL DA FAZENDA', margem + 5, y);
  
  // Código de Verificação (se existir)
  if (data.codigoVerificacao) {
    y += 6;
    doc.setFontSize(8);
    doc.text(`Código de Verificação: ${data.codigoVerificacao}`, margem + 5, y);
  }
  
  // Coluna direita - Número da NFSe
  const colunaDir = largura - 80;
  let yDir = y - 22; // Voltar para o topo
  
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text('Número da NFSe', colunaDir, yDir);
  
  yDir += 6;
  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  doc.text(data.numeroNfse, colunaDir, yDir);
  
  yDir += 8;
  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.text('Data e Hora de Emissão', colunaDir, yDir);
  
  yDir += 5;
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text(formatarData(data.dataEmissao), colunaDir, yDir);
  
  y += 15;
  
  // === PRESTADOR DE SERVIÇOS ===
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text('PRESTADOR DE SERVIÇOS', margem + 5, y);
  
  y += 5;
  
  // Tabela do Prestador - organizada
  const prestadorHeight = 50;
  doc.rect(margem + 5, y, larguraConteudo - 10, prestadorHeight);
  
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  
  // Linha 1: CPF/CNPJ e Inscrição Municipal
  doc.setFont('helvetica', 'bold');
  doc.text('CPF/CNPJ:', margem + 8, y + 6);
  doc.setFont('helvetica', 'normal');
  doc.text(data.prestador.cnpj, margem + 30, y + 6);
  
  doc.setFont('helvetica', 'bold');
  doc.text('Inscrição Municipal:', margem + 110, y + 6);
  doc.setFont('helvetica', 'normal');
  doc.text(data.prestador.inscricaoMunicipal, margem + 155, y + 6);
  
  // Linha 2: Razão Social
  doc.setFont('helvetica', 'bold');
  doc.text('Razão Social:', margem + 8, y + 12);
  doc.setFont('helvetica', 'normal');
  const razaoLimitada = data.prestador.razaoSocial.length > 60 ? 
    data.prestador.razaoSocial.substring(0, 60) + '...' : 
    data.prestador.razaoSocial;
  doc.text(razaoLimitada, margem + 35, y + 12);
  
  // Linha 3: Endereço
  doc.setFont('helvetica', 'bold');
  doc.text('Endereço:', margem + 8, y + 18);
  doc.setFont('helvetica', 'normal');
  const enderecoCompleto = `${data.prestador.endereco}, ${data.prestador.numero}`;
  const enderecoLimitado = enderecoCompleto.length > 50 ? 
    enderecoCompleto.substring(0, 50) + '...' : 
    enderecoCompleto;
  doc.text(enderecoLimitado, margem + 28, y + 18);
  
  // Linha 4: Bairro e CEP
  doc.setFont('helvetica', 'bold');
  doc.text('Bairro:', margem + 8, y + 24);
  doc.setFont('helvetica', 'normal');
  doc.text(data.prestador.bairro, margem + 22, y + 24);
  
  doc.setFont('helvetica', 'bold');
  doc.text('CEP:', margem + 100, y + 24);
  doc.setFont('helvetica', 'normal');
  doc.text(data.prestador.cep, margem + 115, y + 24);
  
  // Linha 5: Município e UF
  doc.setFont('helvetica', 'bold');
  doc.text('Município:', margem + 8, y + 30);
  doc.setFont('helvetica', 'normal');
  doc.text(data.prestador.municipio, margem + 30, y + 30);
  
  doc.setFont('helvetica', 'bold');
  doc.text('Estado:', margem + 120, y + 30);
  doc.setFont('helvetica', 'normal');
  doc.text(data.prestador.uf, margem + 135, y + 30);
  
  // Linha 6: E-mail
  doc.setFont('helvetica', 'bold');
  doc.text('E-mail:', margem + 8, y + 36);
  doc.setFont('helvetica', 'normal');
  const emailLimitado = data.prestador.email.length > 50 ? 
    data.prestador.email.substring(0, 50) + '...' : 
    data.prestador.email;
  doc.text(emailLimitado, margem + 22, y + 36);
  
  y += prestadorHeight + 10;
  
  // === TOMADOR DE SERVIÇOS ===
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text('TOMADOR DE SERVIÇOS', margem + 5, y);
  
  y += 5;
  
  // Tabela do Tomador
  const tomadorHeight = 35;
  doc.rect(margem + 5, y, larguraConteudo - 10, tomadorHeight);
  
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  
  // CPF/CNPJ
  doc.setFont('helvetica', 'bold');
  doc.text('CPF/CNPJ:', margem + 8, y + 6);
  doc.setFont('helvetica', 'normal');
  doc.text(data.tomador.cnpj, margem + 25, y + 6);
  
  // Inscrição Municipal
  if (data.tomador.inscricaoMunicipal) {
    doc.setFont('helvetica', 'bold');
    doc.text('Inscrição Municipal:', largura - 80, y + 6);
    doc.setFont('helvetica', 'normal');
    doc.text(data.tomador.inscricaoMunicipal, largura - 40, y + 6);
  }
  
  // Razão Social
  doc.setFont('helvetica', 'bold');
  doc.text('Razão Social:', margem + 8, y + 12);
  doc.setFont('helvetica', 'normal');
  doc.text(data.tomador.razaoSocial, margem + 30, y + 12);
  
  // Endereço
  doc.setFont('helvetica', 'bold');
  doc.text('Endereço:', margem + 8, y + 18);
  doc.setFont('helvetica', 'normal');
  const enderecoTomador = `${data.tomador.endereco}, ${data.tomador.numero} - ${data.tomador.bairro}`.replace(/, -/, ' -');
  doc.text(enderecoTomador, margem + 25, y + 18);
  
  // CEP e Município
  doc.setFont('helvetica', 'bold');
  doc.text('CEP:', margem + 8, y + 24);
  doc.setFont('helvetica', 'normal');
  doc.text(data.tomador.cep, margem + 18, y + 24);
  
  doc.setFont('helvetica', 'bold');
  doc.text('Município:', margem + 45, y + 24);
  doc.setFont('helvetica', 'normal');
  doc.text(data.tomador.municipio, margem + 62, y + 24);
  
  doc.setFont('helvetica', 'bold');
  doc.text('Estado:', largura - 60, y + 24);
  doc.setFont('helvetica', 'normal');
  doc.text(data.tomador.uf, largura - 40, y + 24);
  
  y += tomadorHeight + 10;
  
  // === DESCRIÇÃO DOS SERVIÇOS ===
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text('DESCRIÇÃO DOS SERVIÇOS', margem + 5, y);
  
  y += 5;
  
  const descricaoHeight = 50;
  doc.rect(margem + 5, y, larguraConteudo - 10, descricaoHeight);
  
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  
  // Código do serviço e descrição com limite de caracteres
  const textoDescricao = `${data.codigoServico} - ${data.descricaoServicos}`;
  const linhasDescricao = doc.splitTextToSize(textoDescricao, larguraConteudo - 20);
  
  // Limitar a 6 linhas para não transbordar
  const linhasLimitadas = linhasDescricao.slice(0, 6);
  doc.text(linhasLimitadas, margem + 8, y + 6);
  
  // Se há mais informações, adicionar apenas as primeiras linhas
  if (data.outrasInformacoes && linhasDescricao.length <= 3) {
    const linhasOutras = doc.splitTextToSize(data.outrasInformacoes, larguraConteudo - 20);
    const linhasRestantes = 6 - linhasDescricao.length;
    const outrasLimitadas = linhasOutras.slice(0, linhasRestantes);
    doc.text(outrasLimitadas, margem + 8, y + 6 + (linhasDescricao.length * 4));
  }
  
  y += descricaoHeight + 5;
  
  // === VALOR TOTAL DA NOTA ===
  const valorHeight = 20;
  doc.rect(margem + 5, y, larguraConteudo - 10, valorHeight);
  
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text(`VALOR TOTAL DA NOTA - R$ ${formatarMoeda(data.valorTotalNota)}`, largura/2, y + 12, { align: 'center' });
  
  y += valorHeight + 5;
  
  // === TABELA DE VALORES SIMPLIFICADA ===
  // Layout conforme modelo original
  
  const colunas = [25, 30, 30, 30, 20, 25];
  const cabecalhos = ['Código', 'Valor Serviços', 'Deduções', 'Base Cálculo', 'Alíquota', 'ISS'];
  
  let x = margem + 5;
  doc.setFontSize(7);
  doc.setFont('helvetica', 'bold');
  
  cabecalhos.forEach((cabecalho, i) => {
    doc.rect(x, y, colunas[i], 8);
    doc.text(cabecalho, x + colunas[i]/2, y + 5, { align: 'center' });
    x += colunas[i];
  });
  
  // Valores
  y += 8;
  x = margem + 5;
  doc.setFont('helvetica', 'normal');
  
  const valoresTabela = [
    data.codigoServico,
    formatarMoeda(data.valorServicos),
    formatarMoeda(data.valorDeducoes),
    formatarMoeda(data.baseCalculo),
    data.aliquota.toFixed(2),
    formatarMoeda(data.valorIss)
  ];
  
  valoresTabela.forEach((valor, i) => {
    doc.rect(x, y, colunas[i], 8);
    doc.text(valor, x + colunas[i]/2, y + 5, { align: 'center' });
    x += colunas[i];
  });
  
  y += 15;
  
  // === TRIBUTOS FEDERAIS (se existirem) ===
  if (data.pis > 0 || data.cofins > 0 || data.inss > 0 || data.ir > 0 || data.csll > 0) {
    const tribColunas = [38, 38, 38, 38, 38];
    const tribCabecalhos = ['PIS (R$)', 'COFINS (R$)', 'INSS (R$)', 'IR (R$)', 'CSLL (R$)'];
    
    x = margem + 5;
    doc.setFontSize(7);
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
  }
  
  // === OUTRAS INFORMAÇÕES ===
  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.text('OUTRAS INFORMAÇÕES', margem + 5, y);
  
  y += 5;
  const outrasHeight = 25;
  doc.rect(margem + 5, y, larguraConteudo - 10, outrasHeight);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6);
  
  if (data.outrasInformacoes) {
    const linhasOutras = doc.splitTextToSize(data.outrasInformacoes, larguraConteudo - 20);
    // Limitar a 4 linhas para caber na caixa
    const linhasLimitadas = linhasOutras.slice(0, 4);
    linhasLimitadas.forEach((linha, index) => {
      doc.text(linha, margem + 8, y + 5 + (index * 4));
    });
  } else {
    doc.text('Valor Líquido = Valor Serviço - INSS - IR - CSLL - COFINS - PIS - Descontos Diversos - ISS Retido', margem + 8, y + 5);
  }
  
  return doc;
}

export async function generateDANFSE(xmlContent: string): Promise<{ success: boolean, pdfPath?: string, error?: string }> {
  try {
    console.log('Gerando DANFSe oficial modelo São Paulo para XML de tamanho:', xmlContent.length);
    
    // Extrair dados usando mapeamento oficial
    const dadosOficiais = await extrairDadosOficiais(xmlContent);
    console.log('Dados mapeados pelo modelo oficial:', JSON.stringify(dadosOficiais, null, 2));
    
    // Gerar PDF oficial
    const pdfDoc = gerarDANFSeOficial(dadosOficiais);
    
    // Salvar arquivo
    const tempDir = os.tmpdir();
    const pdfPath = path.join(tempDir, `danfse_modelo_oficial_${Date.now()}.pdf`);
    
    const pdfBuffer = Buffer.from(pdfDoc.output('arraybuffer'));
    fs.writeFileSync(pdfPath, pdfBuffer);
    
    console.log('DANFSe modelo oficial gerada:', pdfPath);
    console.log('Tamanho do arquivo:', pdfBuffer.length, 'bytes');
    
    return {
      success: true,
      pdfPath: pdfPath
    };
    
  } catch (error) {
    console.error('Erro ao gerar DANFSe modelo oficial:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Erro desconhecido ao gerar DANFSe oficial'
    };
  }
}