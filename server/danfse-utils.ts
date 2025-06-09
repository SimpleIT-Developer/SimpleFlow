import PDFDocument from 'pdfkit';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { parseStringPromise } from 'xml2js';

interface NFSeData {
  numeroNfse: string;
  dataEmissao: string;
  prestador: {
    razaoSocial: string;
    nomeFantasia?: string;
    endereco: string;
    cidade: string;
    uf: string;
    cep: string;
    cnpj: string;
    inscricaoMunicipal: string;
    email?: string;
    telefone?: string;
  };
  tomador: {
    razaoSocial: string;
    endereco?: string;
    cidade?: string;
    uf?: string;
    cep?: string;
    cnpjCpf?: string;
    inscricaoEstadual?: string;
    email?: string;
    telefone?: string;
  };
  servico: {
    discriminacao: string;
    valorServico: number;
    aliquotaIss: number;
    valorIss: number;
    baseCalculo: number;
    itemListaServico: string;
    codigoTributacaoMunicipio?: string;
  };
  tributos: {
    inss: number;
    ir: number;
    csll: number;
    cofins: number;
    pis: number;
    valorLiquido: number;
  };
  codigoVerificacao?: string;
  municipio: string;
}

async function parseNFSeXML(xmlContent: string): Promise<NFSeData> {
  try {
    // Limpar e validar o XML
    let cleanXml = xmlContent.trim();
    
    // Verificar se o conteúdo está codificado em base64
    if (!cleanXml.startsWith('<')) {
      try {
        // Tentar decodificar se estiver em base64
        cleanXml = Buffer.from(cleanXml, 'base64').toString('utf-8');
        console.log('XML decodificado de base64');
      } catch (e) {
        console.log('Não foi possível decodificar base64, tentando como texto puro');
      }
    }
    
    // Remover caracteres de controle e BOM
    cleanXml = cleanXml.replace(/^\uFEFF/, ''); // Remove BOM
    cleanXml = cleanXml.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, ''); // Remove caracteres de controle
    
    // Verificar se ainda não é XML válido
    if (!cleanXml.includes('<')) {
      throw new Error('Conteúdo não parece ser XML válido');
    }
    
    console.log('XML limpo, primeiros 200 caracteres:', cleanXml.substring(0, 200));
    
    const parsed = await parseStringPromise(cleanXml, { explicitArray: false });
    
    // Navegação pela estrutura XML da NFSe (pode variar por município)
    let nfse = parsed;
    
    // Tenta diferentes estruturas de XML comuns
    if (parsed.CompNfse) {
      nfse = parsed.CompNfse.Nfse || parsed.CompNfse;
    } else if (parsed.ConsultarNfseResposta) {
      nfse = parsed.ConsultarNfseResposta.ListaNfse?.CompNfse?.Nfse || parsed.ConsultarNfseResposta;
    } else if (parsed.GerarNfseResposta) {
      nfse = parsed.GerarNfseResposta.ListaNfse?.CompNfse?.Nfse || parsed.GerarNfseResposta;
    }

    const infNfse = nfse.InfNfse || nfse;
    const identificacao = infNfse.IdentificacaoNfse || infNfse.Numero || {};
    const prestadorServico = infNfse.PrestadorServico || infNfse.Prestador || {};
    const tomadorServico = infNfse.TomadorServico || infNfse.Tomador || {};
    const servico = infNfse.Servico || infNfse.DeclaracaoServico || {};
    const valores = servico.Valores || servico;

    return {
      numeroNfse: identificacao.Numero || identificacao.NumeroNfse || '0',
      dataEmissao: infNfse.DataEmissao || new Date().toISOString().split('T')[0],
      prestador: {
        razaoSocial: prestadorServico.RazaoSocial || prestadorServico.Nome || 'PRESTADOR NÃO INFORMADO',
        nomeFantasia: prestadorServico.NomeFantasia,
        endereco: `${prestadorServico.Endereco?.Endereco || ''}, ${prestadorServico.Endereco?.Numero || ''} - ${prestadorServico.Endereco?.Bairro || ''}`,
        cidade: prestadorServico.Endereco?.Cidade || '',
        uf: prestadorServico.Endereco?.Uf || '',
        cep: prestadorServico.Endereco?.Cep || '',
        cnpj: prestadorServico.CpfCnpj?.Cnpj || prestadorServico.Cnpj || '',
        inscricaoMunicipal: prestadorServico.InscricaoMunicipal || '',
        email: prestadorServico.Contato?.Email,
        telefone: prestadorServico.Contato?.Telefone
      },
      tomador: {
        razaoSocial: tomadorServico.RazaoSocial || tomadorServico.Nome || 'TOMADOR NÃO INFORMADO',
        endereco: tomadorServico.Endereco ? `${tomadorServico.Endereco.Endereco || ''}, ${tomadorServico.Endereco.Numero || ''} - ${tomadorServico.Endereco.Bairro || ''}` : '',
        cidade: tomadorServico.Endereco?.Cidade || '',
        uf: tomadorServico.Endereco?.Uf || '',
        cep: tomadorServico.Endereco?.Cep || '',
        cnpjCpf: tomadorServico.CpfCnpj?.Cnpj || tomadorServico.CpfCnpj?.Cpf || tomadorServico.Cnpj || tomadorServico.Cpf || '',
        inscricaoEstadual: tomadorServico.InscricaoEstadual,
        email: tomadorServico.Contato?.Email,
        telefone: tomadorServico.Contato?.Telefone
      },
      servico: {
        discriminacao: servico.Discriminacao || 'SERVIÇO NÃO DISCRIMINADO',
        valorServico: parseFloat(valores.ValorServicos || valores.ValorTotal || '0'),
        aliquotaIss: parseFloat(valores.Aliquota || '0'),
        valorIss: parseFloat(valores.ValorIss || '0'),
        baseCalculo: parseFloat(valores.BaseCalculo || valores.ValorServicos || '0'),
        itemListaServico: servico.ItemListaServico || valores.ItemListaServico || '',
        codigoTributacaoMunicipio: servico.CodigoTributacaoMunicipio
      },
      tributos: {
        inss: parseFloat(valores.ValorInss || '0'),
        ir: parseFloat(valores.ValorIr || '0'),
        csll: parseFloat(valores.ValorCsll || '0'),
        cofins: parseFloat(valores.ValorCofins || '0'),
        pis: parseFloat(valores.ValorPis || '0'),
        valorLiquido: parseFloat(valores.ValorLiquidoNfse || valores.ValorLiquido || valores.ValorServicos || '0')
      },
      codigoVerificacao: infNfse.CodigoVerificacao,
      municipio: prestadorServico.Endereco?.Cidade || 'Município não informado'
    };
  } catch (error) {
    console.error('Erro ao fazer parse do XML NFSe:', error);
    throw new Error('Erro ao processar XML da NFSe');
  }
}

function formatCurrency(value: number): string {
  return value.toLocaleString('pt-BR', { 
    style: 'currency', 
    currency: 'BRL',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
}

function formatCNPJCPF(doc: string): string {
  if (!doc) return '';
  
  const numbers = doc.replace(/\D/g, '');
  
  if (numbers.length === 11) {
    // CPF
    return numbers.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
  } else if (numbers.length === 14) {
    // CNPJ
    return numbers.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5');
  }
  
  return doc;
}

function formatDate(dateStr: string): string {
  try {
    const date = new Date(dateStr);
    return date.toLocaleDateString('pt-BR');
  } catch {
    return dateStr;
  }
}

export async function generateDANFSE(xmlContent: string): Promise<{ success: boolean, pdfPath?: string, error?: string }> {
  try {
    console.log('Gerando DANFSe para XML de tamanho:', xmlContent.length);
    
    const nfseData = await parseNFSeXML(xmlContent);
    
    const tempDir = os.tmpdir();
    const pdfPath = path.join(tempDir, `danfse_${Date.now()}.pdf`);
    
    const doc = new PDFDocument({ 
      size: 'A4',
      margins: { top: 30, bottom: 30, left: 30, right: 30 }
    });
    
    doc.pipe(fs.createWriteStream(pdfPath));
    
    // Configurações de fonte e cores
    const primaryColor = '#000000';
    const headerColor = '#666666';
    
    // Header principal
    doc.fontSize(16)
       .fillColor(primaryColor)
       .text('NOTA FISCAL DE SERVIÇOS ELETRÔNICA - NFSe', 50, 50, { align: 'center' });
    
    doc.fontSize(14)
       .text(`Prefeitura Municipal de ${nfseData.municipio}`, 50, 75, { align: 'center' });
    
    doc.fontSize(12)
       .text('SECRETARIA MUNICIPAL DE FAZENDA E FINANÇAS', 50, 95, { align: 'center' });
    
    // Código de verificação (QR Code simulado)
    doc.rect(480, 50, 80, 80).stroke();
    doc.fontSize(8)
       .text('QR CODE', 500, 85, { align: 'center' });
    
    // Informações da NFSe
    let currentY = 140;
    
    // Cabeçalho com informações principais
    doc.rect(50, currentY, 510, 30).stroke();
    
    const headerFields = [
      { label: 'Data de Emissão', value: formatDate(nfseData.dataEmissao), x: 60 },
      { label: 'Exigibilidade do ISS', value: 'Exigível no Município', x: 150 },
      { label: 'Regime Tributário', value: 'Tributação Normal', x: 280 },
      { label: 'Número RPS', value: 'PAGEAD', x: 400 },
      { label: 'Série', value: '', x: 460 },
      { label: 'Nº da Nota Fiscal', value: nfseData.numeroNfse, x: 490 }
    ];
    
    doc.fontSize(8).fillColor(headerColor);
    headerFields.forEach(field => {
      doc.text(field.label, field.x, currentY + 5);
      doc.fillColor(primaryColor).text(field.value, field.x, currentY + 15);
      doc.fillColor(headerColor);
    });
    
    currentY += 40;
    
    // Tipo de Recolhimento
    doc.rect(50, currentY, 510, 25).stroke();
    doc.fontSize(8).text('Tipo de Recolhimento', 60, currentY + 5);
    doc.fontSize(8).text('Simples Nacional', 60, currentY + 15);
    doc.text('Local de Prestação', 200, currentY + 5);
    doc.text('No Município', 200, currentY + 15);
    
    currentY += 35;
    
    // PRESTADOR
    doc.rect(50, currentY, 510, 15).fill('#f0f0f0').stroke();
    doc.fontSize(10).fillColor(primaryColor).text('PRESTADOR', 60, currentY + 4);
    
    currentY += 15;
    doc.rect(50, currentY, 510, 70).stroke();
    
    doc.fontSize(10).text(`Razão Social: ${nfseData.prestador.razaoSocial}`, 60, currentY + 10);
    doc.fontSize(8).text(`Nome Fantasia:`, 60, currentY + 25);
    doc.text(`Endereço: ${nfseData.prestador.endereco}`, 60, currentY + 35);
    doc.text(`Cidade: ${nfseData.prestador.cidade} - ${nfseData.prestador.uf} - CEP: ${nfseData.prestador.cep}`, 60, currentY + 45);
    doc.text(`E-mail: ${nfseData.prestador.email || ''} - Fone: ${nfseData.prestador.telefone || ''} - Celular: - Site:`, 60, currentY + 55);
    doc.text(`Inscrição Estadual: - Inscrição Municipal: ${nfseData.prestador.inscricaoMunicipal} - CPF/CNPJ: ${formatCNPJCPF(nfseData.prestador.cnpj)}`, 60, currentY + 65);
    
    currentY += 80;
    
    // TOMADOR
    doc.rect(50, currentY, 510, 15).fill('#f0f0f0').stroke();
    doc.fontSize(10).fillColor(primaryColor).text('TOMADOR', 60, currentY + 4);
    
    currentY += 15;
    doc.rect(50, currentY, 510, 50).stroke();
    
    doc.fontSize(10).text(`Razão Social: ${nfseData.tomador.razaoSocial}`, 60, currentY + 10);
    doc.fontSize(8).text(`Endereço: ${nfseData.tomador.endereco || ''}`, 60, currentY + 25);
    doc.text(`Cidade: ${nfseData.tomador.cidade || ''} - UF: ${nfseData.tomador.uf || ''} - CEP: ${nfseData.tomador.cep || ''}`, 60, currentY + 35);
    doc.text(`E-mail: ${nfseData.tomador.email || ''} - Fone: ${nfseData.tomador.telefone || ''} - Celular:`, 60, currentY + 45);
    doc.text(`Inscrição Estadual: ${nfseData.tomador.inscricaoEstadual || ''} - CPF/CNPJ: ${formatCNPJCPF(nfseData.tomador.cnpjCpf || '')}`, 60, currentY + 55);
    
    currentY += 70;
    
    // SERVIÇO
    doc.rect(50, currentY, 510, 15).fill('#f0f0f0').stroke();
    doc.fontSize(10).fillColor(primaryColor).text('SERVIÇO', 60, currentY + 4);
    
    currentY += 15;
    doc.rect(50, currentY, 510, 100).stroke();
    
    doc.fontSize(8).text(`${nfseData.servico.itemListaServico} - ${nfseData.servico.discriminacao}`, 60, currentY + 10, {
      width: 480,
      align: 'left'
    });
    
    currentY += 110;
    
    // DISCRIMINAÇÃO DOS SERVIÇOS
    doc.rect(50, currentY, 510, 15).fill('#f0f0f0').stroke();
    doc.fontSize(10).fillColor(primaryColor).text('DISCRIMINAÇÃO DOS SERVIÇOS', 60, currentY + 4);
    
    currentY += 15;
    doc.rect(50, currentY, 510, 80).stroke();
    doc.fontSize(8).text('DIGITE AQUI A DISCRIMINAÇÃO DOS SERVIÇOS DA NOTA FISCAL', 60, currentY + 10);
    
    currentY += 90;
    
    // Tabela de valores
    const tableY = currentY;
    const colWidths = [85, 85, 85, 85, 85, 85];
    const colX = [50, 135, 220, 305, 390, 475];
    
    // Cabeçalho da tabela
    doc.rect(50, tableY, 510, 20).stroke();
    const headers = ['VALOR SERVIÇO (R$)', 'DEDUÇÕES (R$)', 'DESC. INCOD. (R$)', 'BASE DE CÁLCULO (R$)', 'ALÍQUOTA (%)', 'ISS (R$)'];
    
    doc.fontSize(8).fillColor(primaryColor);
    headers.forEach((header, i) => {
      doc.text(header, colX[i] + 5, tableY + 6, { width: colWidths[i] - 10, align: 'center' });
    });
    
    // Valores da tabela
    doc.rect(50, tableY + 20, 510, 20).stroke();
    const values = [
      formatCurrency(nfseData.servico.valorServico),
      '0,00',
      '0,00',
      formatCurrency(nfseData.servico.baseCalculo),
      nfseData.servico.aliquotaIss.toFixed(2),
      formatCurrency(nfseData.servico.valorIss)
    ];
    
    values.forEach((value, i) => {
      doc.text(value, colX[i] + 5, tableY + 26, { width: colWidths[i] - 10, align: 'center' });
    });
    
    currentY = tableY + 50;
    
    // Segunda linha de tabelas
    const table2Headers = ['INSS (R$)', 'IR (R$)', 'CSLL (R$)', 'COFINS (R$)', 'PIS (R$)', 'DESCONTOS DIVERSOS (R$)', 'VALOR LÍQUIDO (R$)'];
    const table2ColWidths = [73, 73, 73, 73, 73, 73, 73];
    const table2ColX = [50, 123, 196, 269, 342, 415, 488];
    
    // Cabeçalho
    doc.rect(50, currentY, 510, 15).fill('#f0f0f0').stroke();
    doc.fontSize(8).text('DEMONSTRATIVO DOS TRIBUTOS FEDERAIS', 60, currentY + 4);
    
    currentY += 15;
    doc.rect(50, currentY, 510, 20).stroke();
    
    table2Headers.slice(0, 6).forEach((header, i) => {
      doc.text(header, table2ColX[i] + 2, currentY + 6, { width: table2ColWidths[i] - 4, align: 'center' });
    });
    
    // Valores
    doc.rect(50, currentY + 20, 510, 20).stroke();
    const table2Values = [
      formatCurrency(nfseData.tributos.inss),
      formatCurrency(nfseData.tributos.ir),
      formatCurrency(nfseData.tributos.csll),
      formatCurrency(nfseData.tributos.cofins),
      formatCurrency(nfseData.tributos.pis),
      '0,00'
    ];
    
    table2Values.forEach((value, i) => {
      doc.text(value, table2ColX[i] + 2, currentY + 26, { width: table2ColWidths[i] - 4, align: 'center' });
    });
    
    // Valor Líquido (separado)
    doc.rect(488, currentY, 72, 40).stroke();
    doc.text('VALOR LÍQUIDO (R$)', 490, currentY + 6, { width: 68, align: 'center' });
    doc.fontSize(10).text(formatCurrency(nfseData.tributos.valorLiquido), 490, currentY + 26, { width: 68, align: 'center' });
    
    currentY += 50;
    
    // OUTRAS INFORMAÇÕES
    doc.rect(50, currentY, 510, 15).fill('#f0f0f0').stroke();
    doc.fontSize(10).fillColor(primaryColor).text('OUTRAS INFORMAÇÕES', 60, currentY + 4);
    
    currentY += 15;
    doc.rect(50, currentY, 510, 30).stroke();
    doc.fontSize(8).text('Valor Líquido = Valor Serviço - INSS - IR - CSLL - COFINS - PIS - Descontos Diversos - ISS Retido - Desconto Incondicional', 60, currentY + 10);
    
    currentY += 40;
    
    // Footer
    doc.fontSize(8).text(`Consulte a autenticidade deste documento acessando o site https://www.pmvc.ba.gov.br`, 50, currentY + 10, { align: 'center' });
    
    if (nfseData.codigoVerificacao) {
      doc.text(`Código de Verificação: ${nfseData.codigoVerificacao}`, 50, currentY + 25, { align: 'center' });
    }
    
    doc.end();
    
    // Aguarda a conclusão da escrita do arquivo
    await new Promise((resolve, reject) => {
      doc.on('end', resolve);
      doc.on('error', reject);
    });
    
    console.log('DANFSe gerado com sucesso:', pdfPath);
    
    const stats = fs.statSync(pdfPath);
    console.log('Tamanho do arquivo PDF:', stats.size, 'bytes');
    
    return {
      success: true,
      pdfPath: pdfPath
    };
    
  } catch (error) {
    console.error('Erro ao gerar DANFSe:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Erro desconhecido ao gerar DANFSe'
    };
  }
}