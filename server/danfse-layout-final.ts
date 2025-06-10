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

// Função auxiliar para buscar vISSQN e vServ recursivamente
function buscarVISSQN(obj: any, caminho = ''): any {
  if (typeof obj !== 'object' || obj === null) return null;
  
  for (const [key, value] of Object.entries(obj)) {
    const caminhoAtual = caminho ? `${caminho}.${key}` : key;
    
    if (key === 'vISSQN' && value) {
      console.log(`Encontrado vISSQN em ${caminhoAtual}:`, value);
      return value;
    }
    
    if (typeof value === 'object') {
      const resultado = buscarVISSQN(value, caminhoAtual);
      if (resultado) return resultado;
    }
  }
  return null;
}

// Função auxiliar para buscar vServ recursivamente
function buscarVServ(obj: any, caminho = ''): any {
  if (typeof obj !== 'object' || obj === null) return null;
  
  for (const [key, value] of Object.entries(obj)) {
    const caminhoAtual = caminho ? `${caminho}.${key}` : key;
    
    if (key === 'vServ' && value) {
      console.log(`Encontrado vServ em ${caminhoAtual}:`, value);
      return value;
    }
    
    if (typeof value === 'object') {
      const resultado = buscarVServ(value, caminhoAtual);
      if (resultado) return resultado;
    }
  }
  return null;
}

// Função para buscar tributos no XML (case insensitive)
function buscarTributo(obj: any, nomeTributo: string, caminho = ''): number {
  if (typeof obj !== 'object' || obj === null) return 0;
  
  for (const [key, value] of Object.entries(obj)) {
    const caminhoAtual = caminho ? `${caminho}.${key}` : key;
    const keyLower = key.toLowerCase();
    const tributoLower = nomeTributo.toLowerCase();
    
    // Buscar exatamente o nome do tributo
    if (keyLower === tributoLower && value) {
      console.log(`Encontrado ${nomeTributo} em ${caminhoAtual}:`, value);
      const valorNumerico = parseFloat(String(value));
      return isNaN(valorNumerico) ? 0 : valorNumerico;
    }
    
    if (typeof value === 'object') {
      const resultado = buscarTributo(value, nomeTributo, caminhoAtual);
      if (resultado > 0) return resultado;
    }
  }
  return 0;
}

// Função específica para buscar PIS
function buscarPIS(obj: any): number {
  return buscarTributo(obj, 'vPis') || buscarTributo(obj, 'vPIS') || buscarTributo(obj, 'pis') || buscarTributo(obj, 'PIS');
}

// Função específica para buscar COFINS
function buscarCOFINS(obj: any): number {
  return buscarTributo(obj, 'vCofins') || buscarTributo(obj, 'vCOFINS') || buscarTributo(obj, 'cofins') || buscarTributo(obj, 'COFINS');
}

// Função específica para buscar IR
function buscarIR(obj: any): number {
  return buscarTributo(obj, 'vRetIRRF') || buscarTributo(obj, 'vIRRF') || buscarTributo(obj, 'vIR') || buscarTributo(obj, 'ir') || buscarTributo(obj, 'IR');
}

// Função específica para buscar CSLL
function buscarCSLL(obj: any): number {
  return buscarTributo(obj, 'vRetCSLL') || buscarTributo(obj, 'vCSLL') || buscarTributo(obj, 'csll') || buscarTributo(obj, 'CSLL');
}

// Função específica para buscar INSS
function buscarINSS(obj: any): number {
  return buscarTributo(obj, 'vRetINSS') || buscarTributo(obj, 'vINSS') || buscarTributo(obj, 'inss') || buscarTributo(obj, 'INSS');
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
    
    console.log('Procurando valor ISS e valor dos serviços em:');
    const valores = parsed.NFSe?.infNFSe?.DPS?.infDPS?.valores || parsed.NFSe?.infNFSe?.valores || {};
    console.log('valores.vISSQN:', valores.vISSQN);
    console.log('valores.vISS:', valores.vISS);
    console.log('valores.vServ:', valores.vServ);
    
    const serv = parsed.NFSe?.infNFSe?.DPS?.infDPS?.serv || {};
    console.log('serv.vISSQN:', serv.vISSQN);
    console.log('serv.vServ:', serv.vServ);
    
    const infNFSe = parsed.NFSe?.infNFSe || {};
    console.log('infNFSe.vISSQN:', infNFSe.vISSQN);
    
    console.log('parsed.NFSe.vISSQN:', parsed.NFSe?.vISSQN);
    
    const valorIssEncontrado = buscarVISSQN(parsed);
    const valorServEncontrado = buscarVServ(parsed);
    
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
        valorServicos: parseFloat(valorServEncontrado || valores.vServPrest?.vServ || valores.vServ || serv.vServ || '0'),
        valorDeducoes: 0,
        baseCalculo: parseFloat(valores.vBC || valorServEncontrado || valores.vServ || serv.vServ || '0'),
        aliquota: parseFloat(valores.pAliqAplic || '0'),
        valorIss: parseFloat(valorIssEncontrado || '0'),
        issRetido: valores.tpRetISSQN === '1',
        valorTotalNota: parseFloat(valores.vLiq || valorServEncontrado || valores.vServ || serv.vServ || '0'),
        
        pis: buscarPIS(parsed),
        cofins: buscarCOFINS(parsed),
        inss: buscarINSS(parsed),
        ir: buscarIR(parsed),
        csll: buscarCSLL(parsed),
        
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
        
        pis: buscarPIS(parsed),
        cofins: buscarCOFINS(parsed),
        inss: buscarINSS(parsed),
        ir: buscarIR(parsed),
        csll: buscarCSLL(parsed),
        
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
  
  // === CABEÇALHO CONFORME MODELO ANEXADO ===
  y += 5;
  
  // Caixa do cabeçalho com mesma largura das outras seções
  const cabecalhoHeight = 25;
  const larguraCabecalho = larguraConteudo - 10;
  doc.rect(margem + 5, y, larguraCabecalho, cabecalhoHeight);
  
  // Coluna esquerda: 65% para o título
  const larguraEsquerda = larguraCabecalho * 0.65;
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.text('NOTA FISCAL DE SERVIÇOS ELETRÔNICA', margem + 5 + larguraEsquerda/2, y + 13, { align: 'center' });
  
  // Linha vertical separadora
  const xSeparador = margem + 5 + larguraEsquerda;
  doc.line(xSeparador, y, xSeparador, y + cabecalhoHeight);
  
  // Coluna direita: 35% dividida em 3 linhas
  const larguraDireita = larguraCabecalho * 0.35;
  const alturaLinha = cabecalhoHeight / 3;
  
  // Linhas horizontais para dividir as 3 seções
  doc.line(xSeparador, y + alturaLinha, margem + 5 + larguraCabecalho, y + alturaLinha);
  doc.line(xSeparador, y + (alturaLinha * 2), margem + 5 + larguraCabecalho, y + (alturaLinha * 2));
  
  doc.setFontSize(7);
  
  // Primeira linha: Número da NFSe
  doc.setFont('helvetica', 'bold');
  doc.text('Número da NF-e:', xSeparador + 2, y + 4);
  doc.setFont('helvetica', 'normal');
  doc.text(data.numeroNfse, xSeparador + 2, y + 7);
  
  // Segunda linha: Data e Hora
  doc.setFont('helvetica', 'bold');
  doc.text('Data e Hora de Emissão:', xSeparador + 2, y + alturaLinha + 3);
  doc.setFont('helvetica', 'normal');
  doc.text(formatarData(data.dataEmissao), xSeparador + 2, y + alturaLinha + 6);
  
  // Terceira linha: Código de Verificação
  doc.setFont('helvetica', 'bold');
  doc.text('Código de Verificação:', xSeparador + 2, y + (alturaLinha * 2) + 3);
  doc.setFont('helvetica', 'normal');
  doc.text(data.codigoVerificacao || 'N/A', xSeparador + 2, y + (alturaLinha * 2) + 6);
  
  y += cabecalhoHeight;
  
  // === PRESTADOR DE SERVIÇOS ===
  const prestadorHeight = 40;
  doc.rect(margem + 5, y, larguraConteudo - 10, prestadorHeight);
  
  // Título centralizado dentro da caixa
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.text('PRESTADOR DE SERVIÇOS', largura/2, y + 4, { align: 'center' });
  
  doc.setFontSize(7);
  doc.setFont('helvetica', 'normal');
  
  // Primeira linha
  doc.setFont('helvetica', 'bold');
  doc.text('CPF/CNPJ:', margem + 8, y + 9);
  doc.setFont('helvetica', 'normal');
  doc.text(data.prestador.cnpj, margem + 28, y + 9);
  
  doc.setFont('helvetica', 'bold');
  doc.text('Inscrição Municipal:', margem + 110, y + 9);
  doc.setFont('helvetica', 'normal');
  doc.text(data.prestador.inscricaoMunicipal, margem + 155, y + 9);
  
  // Segunda linha
  doc.setFont('helvetica', 'bold');
  doc.text('Razão Social:', margem + 8, y + 14);
  doc.setFont('helvetica', 'normal');
  const razaoLimitada = data.prestador.razaoSocial.length > 70 ? 
    data.prestador.razaoSocial.substring(0, 70) + '...' : 
    data.prestador.razaoSocial;
  doc.text(razaoLimitada, margem + 33, y + 14);
  
  // Terceira linha
  doc.setFont('helvetica', 'bold');
  doc.text('Endereço:', margem + 8, y + 19);
  doc.setFont('helvetica', 'normal');
  const enderecoCompleto = `${data.prestador.endereco}, ${data.prestador.numero}`;
  doc.text(enderecoCompleto, margem + 26, y + 19);
  
  // Quarta linha
  doc.setFont('helvetica', 'bold');
  doc.text('CEP:', margem + 8, y + 24);
  doc.setFont('helvetica', 'normal');
  doc.text(data.prestador.cep, margem + 18, y + 24);
  
  doc.setFont('helvetica', 'bold');
  doc.text('Bairro:', margem + 45, y + 24);
  doc.setFont('helvetica', 'normal');
  doc.text(data.prestador.bairro, margem + 58, y + 24);
  
  // Quinta linha
  doc.setFont('helvetica', 'bold');
  doc.text('Município:', margem + 8, y + 29);
  doc.setFont('helvetica', 'normal');
  doc.text(data.prestador.municipio, margem + 26, y + 29);
  
  doc.setFont('helvetica', 'bold');
  doc.text('Estado:', margem + 120, y + 29);
  doc.setFont('helvetica', 'normal');
  doc.text(data.prestador.uf, margem + 135, y + 29);
  
  // Sexta linha
  doc.setFont('helvetica', 'bold');
  doc.text('E-mail:', margem + 8, y + 34);
  doc.setFont('helvetica', 'normal');
  doc.text(data.prestador.email, margem + 22, y + 34);
  
  y += prestadorHeight;
  
  // === TOMADOR DE SERVIÇOS ===
  const tomadorHeight = 30;
  doc.rect(margem + 5, y, larguraConteudo - 10, tomadorHeight);
  
  // Título centralizado dentro da caixa
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.text('TOMADOR DE SERVIÇOS', largura/2, y + 4, { align: 'center' });
  
  doc.setFontSize(7);
  doc.setFont('helvetica', 'normal');
  
  // Primeira linha
  doc.setFont('helvetica', 'bold');
  doc.text('CPF/CNPJ:', margem + 8, y + 9);
  doc.setFont('helvetica', 'normal');
  doc.text(data.tomador.cnpj, margem + 28, y + 9);
  
  if (data.tomador.inscricaoMunicipal) {
    doc.setFont('helvetica', 'bold');
    doc.text('Inscrição Municipal:', margem + 110, y + 9);
    doc.setFont('helvetica', 'normal');
    doc.text(data.tomador.inscricaoMunicipal, margem + 155, y + 9);
  }
  
  // Segunda linha
  doc.setFont('helvetica', 'bold');
  doc.text('Razão Social:', margem + 8, y + 14);
  doc.setFont('helvetica', 'normal');
  doc.text(data.tomador.razaoSocial, margem + 33, y + 14);
  
  // Terceira linha
  doc.setFont('helvetica', 'bold');
  doc.text('Endereço:', margem + 8, y + 19);
  doc.setFont('helvetica', 'normal');
  const enderecoTomador = `${data.tomador.endereco}, ${data.tomador.numero} - ${data.tomador.bairro}`.replace(/, -/, ' -');
  doc.text(enderecoTomador, margem + 26, y + 19);
  
  // Quarta linha
  doc.setFont('helvetica', 'bold');
  doc.text('CEP:', margem + 8, y + 24);
  doc.setFont('helvetica', 'normal');
  doc.text(data.tomador.cep, margem + 18, y + 24);
  
  doc.setFont('helvetica', 'bold');
  doc.text('Município:', margem + 45, y + 24);
  doc.setFont('helvetica', 'normal');
  doc.text(data.tomador.municipio, margem + 65, y + 24);
  
  doc.setFont('helvetica', 'bold');
  doc.text('Estado:', margem + 140, y + 24);
  doc.setFont('helvetica', 'normal');
  doc.text(data.tomador.uf, margem + 155, y + 24);
  
  y += tomadorHeight;
  
  // === DESCRIÇÃO DOS SERVIÇOS ===
  const descricaoHeight = 50;
  doc.rect(margem + 5, y, larguraConteudo - 10, descricaoHeight);
  
  // Título centralizado dentro da caixa
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.text('DESCRIÇÃO DOS SERVIÇOS', largura/2, y + 4, { align: 'center' });
  
  doc.setFontSize(6);
  doc.setFont('helvetica', 'normal');
  
  const textoCompleto = `${data.codigoServico} - ${data.descricaoServicos}`;
  const linhasDescricao = doc.splitTextToSize(textoCompleto, larguraConteudo - 20);
  const linhasLimitadas = linhasDescricao.slice(0, 7);
  
  linhasLimitadas.forEach((linha: string, index: number) => {
    doc.text(linha, margem + 8, y + 8 + (index * 3.5));
  });
  
  y += descricaoHeight;
  
  // === VALOR TOTAL DA NOTA ===
  const valorHeight = 12;
  doc.rect(margem + 5, y, larguraConteudo - 10, valorHeight);
  
  // Título e valor na mesma linha centralizado
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.text(`VALOR TOTAL DA NOTA - R$ ${formatarMoeda(data.valorTotalNota)}`, largura/2, y + 8, { align: 'center' });
  
  y += valorHeight;
  
  // === TABELA DE VALORES CONFORME MODELO ===
  // Usar a mesma largura das outras seções para alinhamento uniforme
  const larguraTabela = larguraConteudo - 10;
  
  // Primeira linha: Valor Retenções, Base Cálculo ISS, Valor Líquido, Alíquota ISS, ISS Retido, Valor do ISS
  const colunas1 = [larguraTabela/6, larguraTabela/6, larguraTabela/6, larguraTabela/6, larguraTabela/6, larguraTabela/6];
  const cabecalhos1 = ['Valor Retenções (R$)', 'Base Cálculo ISS (R$)', 'Valor Líquido (R$)', 'Alíquota ISS (%)', 'ISS Retido', 'Valor do ISS (R$)'];
  
  let x = margem + 5;
  doc.setFontSize(5);
  doc.setFont('helvetica', 'bold');
  
  cabecalhos1.forEach((cabecalho, i) => {
    doc.rect(x, y, colunas1[i], 8);
    const linhasCabecalho = doc.splitTextToSize(cabecalho, colunas1[i] - 2);
    linhasCabecalho.forEach((linha: string, index: number) => {
      doc.text(linha, x + colunas1[i]/2, y + 3 + (index * 2), { align: 'center' });
    });
    x += colunas1[i];
  });
  
  y += 8;
  x = margem + 5;
  doc.setFont('helvetica', 'normal');
  
  const retencoes = data.pis + data.cofins + data.inss + data.ir + data.csll;
  const valoresTabela1 = [
    formatarMoeda(retencoes),
    formatarMoeda(data.baseCalculo),
    formatarMoeda(data.valorTotalNota - retencoes),
    data.aliquota.toFixed(2),
    data.issRetido ? 'Sim' : 'Não',
    formatarMoeda(data.valorIss)
  ];
  
  valoresTabela1.forEach((valor, i) => {
    doc.rect(x, y, colunas1[i], 8);
    doc.text(valor, x + colunas1[i]/2, y + 5, { align: 'center' });
    x += colunas1[i];
  });
  
  // Segunda linha: PIS, COFINS, INSS, IR, CSLL (sem pular linha)
  y += 8;
  const colunas2 = [larguraTabela/5, larguraTabela/5, larguraTabela/5, larguraTabela/5, larguraTabela/5];
  const cabecalhos2 = ['PIS (R$)', 'COFINS (R$)', 'INSS (R$)', 'IR (R$)', 'CSLL (R$)'];
  
  x = margem + 5;
  doc.setFont('helvetica', 'bold');
  
  cabecalhos2.forEach((cabecalho, i) => {
    doc.rect(x, y, colunas2[i], 8);
    doc.text(cabecalho, x + colunas2[i]/2, y + 3, { align: 'center' });
    x += colunas2[i];
  });
  
  y += 8;
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
    doc.rect(x, y, colunas2[i], 8);
    doc.text(valor, x + colunas2[i]/2, y + 5, { align: 'center' });
    x += colunas2[i];
  });
  
  y += 8;
  
  // === OUTRAS INFORMAÇÕES ===
  const outrasHeight = 25;
  doc.rect(margem + 5, y, larguraConteudo - 10, outrasHeight);
  
  // Título centralizado dentro da caixa
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.text('OUTRAS INFORMAÇÕES', largura/2, y + 4, { align: 'center' });
  
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6);
  
  if (data.outrasInformacoes) {
    const linhasOutras = doc.splitTextToSize(data.outrasInformacoes, larguraConteudo - 20);
    const linhasLimitadas = linhasOutras.slice(0, 3);
    linhasLimitadas.forEach((linha: string, index: number) => {
      doc.text(linha, margem + 8, y + 8 + (index * 4));
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