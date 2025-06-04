import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import PDFDocument from 'pdfkit';
import * as xml2js from 'xml2js';

interface NFEData {
  numero: string;
  serie: string;
  chaveAcesso: string;
  dataEmissao: string;
  emitente: {
    nome: string;
    cnpj: string;
    endereco: string;
    municipio: string;
    uf: string;
    ie: string;
  };
  destinatario: {
    nome: string;
    cnpj: string;
    endereco: string;
    municipio: string;
    uf: string;
  };
  produtos: Array<{
    codigo: string;
    descricao: string;
    quantidade: string;
    valor: string;
    total: string;
  }>;
  totais: {
    valorProdutos: string;
    valorTotal: string;
    icms: string;
    ipi: string;
  };
  protocolo?: string;
  dataAutorizacao?: string;
}

/**
 * Extrai dados estruturados do XML da NFe
 */
async function extractNFEData(xmlContent: string): Promise<NFEData> {
  const parser = new xml2js.Parser({ explicitArray: false, ignoreAttrs: false });
  const result = await parser.parseStringPromise(xmlContent);
  
  let nfeRoot;
  if (result.nfeProc) {
    nfeRoot = result.nfeProc.NFe || result.nfeProc;
  } else if (result.NFe) {
    nfeRoot = result.NFe;
  } else {
    throw new Error('Estrutura XML da NFe não reconhecida');
  }

  const infNFe = nfeRoot.infNFe || nfeRoot;
  const ide = infNFe.ide || {};
  const emit = infNFe.emit || {};
  const dest = infNFe.dest || {};
  const total = infNFe.total?.ICMSTot || {};
  
  // Extrair produtos
  const produtos = [];
  const dets = Array.isArray(infNFe.det) ? infNFe.det : [infNFe.det].filter(Boolean);
  
  for (const det of dets) {
    if (det?.prod) {
      produtos.push({
        codigo: det.prod.cProd || '',
        descricao: det.prod.xProd || '',
        quantidade: det.prod.qCom || '0',
        valor: det.prod.vUnCom || '0',
        total: det.prod.vProd || '0'
      });
    }
  }

  // Extrair protocolo se disponível
  let protocolo = '';
  let dataAutorizacao = '';
  if (result.nfeProc?.protNFe?.infProt) {
    protocolo = result.nfeProc.protNFe.infProt.nProt || '';
    dataAutorizacao = result.nfeProc.protNFe.infProt.dhRecbto || '';
  }

  return {
    numero: ide.nNF || '',
    serie: ide.serie || '',
    chaveAcesso: (infNFe.$ && infNFe.$.Id ? infNFe.$.Id.replace('NFe', '') : '') || '',
    dataEmissao: ide.dhEmi || ide.dEmi || '',
    emitente: {
      nome: emit.xNome || '',
      cnpj: emit.CNPJ || '',
      endereco: `${emit.enderEmit?.xLgr || ''}, ${emit.enderEmit?.nro || ''}`,
      municipio: emit.enderEmit?.xMun || '',
      uf: emit.enderEmit?.UF || '',
      ie: emit.IE || ''
    },
    destinatario: {
      nome: dest.xNome || '',
      cnpj: dest.CNPJ || dest.CPF || '',
      endereco: `${dest.enderDest?.xLgr || ''}, ${dest.enderDest?.nro || ''}`,
      municipio: dest.enderDest?.xMun || '',
      uf: dest.enderDest?.UF || ''
    },
    produtos,
    totais: {
      valorProdutos: total.vProd || '0',
      valorTotal: total.vNF || '0',
      icms: total.vICMS || '0',
      ipi: total.vIPI || '0'
    },
    protocolo,
    dataAutorizacao
  };
}

/**
 * Formata valores monetários
 */
function formatCurrency(value: string): string {
  const num = parseFloat(value || '0');
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  }).format(num);
}

/**
 * Formata datas
 */
function formatDate(dateString: string): string {
  if (!dateString) return '';
  try {
    const date = new Date(dateString);
    return date.toLocaleDateString('pt-BR');
  } catch {
    return dateString;
  }
}

/**
 * Gera um PDF do DANFE a partir do XML da NFe usando PDFKit
 */
export async function generateDANFE(xmlContent: string): Promise<{ success: boolean, pdfPath?: string, error?: string }> {
  try {
    if (!xmlContent) {
      throw new Error('Conteúdo XML não fornecido');
    }

    console.log('Gerando DANFE para XML de tamanho:', xmlContent.length);
    
    // Extrair dados da NFe
    const nfeData = await extractNFEData(xmlContent);
    
    // Criar arquivo PDF temporário
    const tempDir = os.tmpdir();
    const pdfPath = path.join(tempDir, `danfe_${Date.now()}.pdf`);
    
    // Criar documento PDF
    const doc = new PDFDocument({ margin: 30, size: 'A4' });
    const stream = fs.createWriteStream(pdfPath);
    doc.pipe(stream);
    
    // Configurar fontes
    const regularFont = 'Helvetica';
    const boldFont = 'Helvetica-Bold';
    
    // Cabeçalho DANFE
    doc.fontSize(16).font(boldFont);
    doc.text('DANFE', 30, 30);
    doc.text('Documento Auxiliar da Nota Fiscal Eletrônica', 30, 50);
    
    // Informações básicas
    doc.fontSize(10).font(regularFont);
    doc.text(`Número: ${nfeData.numero}`, 400, 30);
    doc.text(`Série: ${nfeData.serie}`, 400, 45);
    doc.text(`Data de Emissão: ${formatDate(nfeData.dataEmissao)}`, 400, 60);
    
    // Chave de acesso
    if (nfeData.chaveAcesso) {
      doc.fontSize(8);
      doc.text('Chave de Acesso:', 30, 90);
      doc.text(nfeData.chaveAcesso, 30, 105);
    }
    
    // Protocolo de autorização
    if (nfeData.protocolo) {
      doc.text(`Protocolo: ${nfeData.protocolo}`, 400, 90);
      doc.text(`Data Autorização: ${formatDate(nfeData.dataAutorizacao || '')}`, 400, 105);
    }
    
    let yPos = 140;
    
    // Dados do emitente
    doc.fontSize(12).font(boldFont);
    doc.text('EMITENTE', 30, yPos);
    yPos += 20;
    
    doc.fontSize(10).font(regularFont);
    doc.text(`Nome/Razão Social: ${nfeData.emitente.nome}`, 30, yPos);
    yPos += 15;
    doc.text(`CNPJ: ${nfeData.emitente.cnpj}`, 30, yPos);
    doc.text(`IE: ${nfeData.emitente.ie}`, 300, yPos);
    yPos += 15;
    doc.text(`Endereço: ${nfeData.emitente.endereco}`, 30, yPos);
    yPos += 15;
    doc.text(`Município: ${nfeData.emitente.municipio}`, 30, yPos);
    doc.text(`UF: ${nfeData.emitente.uf}`, 300, yPos);
    yPos += 30;
    
    // Dados do destinatário
    doc.fontSize(12).font(boldFont);
    doc.text('DESTINATÁRIO', 30, yPos);
    yPos += 20;
    
    doc.fontSize(10).font(regularFont);
    doc.text(`Nome/Razão Social: ${nfeData.destinatario.nome}`, 30, yPos);
    yPos += 15;
    doc.text(`CNPJ/CPF: ${nfeData.destinatario.cnpj}`, 30, yPos);
    yPos += 15;
    doc.text(`Endereço: ${nfeData.destinatario.endereco}`, 30, yPos);
    yPos += 15;
    doc.text(`Município: ${nfeData.destinatario.municipio}`, 30, yPos);
    doc.text(`UF: ${nfeData.destinatario.uf}`, 300, yPos);
    yPos += 30;
    
    // Produtos/Serviços
    doc.fontSize(12).font(boldFont);
    doc.text('PRODUTOS/SERVIÇOS', 30, yPos);
    yPos += 20;
    
    // Cabeçalho da tabela
    doc.fontSize(8).font(boldFont);
    doc.text('CÓD', 30, yPos);
    doc.text('DESCRIÇÃO', 80, yPos);
    doc.text('QTD', 350, yPos);
    doc.text('VALOR UNIT', 400, yPos);
    doc.text('TOTAL', 480, yPos);
    yPos += 15;
    
    // Linha de separação
    doc.moveTo(30, yPos).lineTo(550, yPos).stroke();
    yPos += 10;
    
    // Produtos
    doc.font(regularFont);
    for (const produto of nfeData.produtos) {
      if (yPos > 700) { // Nova página se necessário
        doc.addPage();
        yPos = 50;
      }
      
      doc.text(produto.codigo.substring(0, 10), 30, yPos);
      doc.text(produto.descricao.substring(0, 40), 80, yPos);
      doc.text(produto.quantidade, 350, yPos);
      doc.text(formatCurrency(produto.valor), 400, yPos);
      doc.text(formatCurrency(produto.total), 480, yPos);
      yPos += 12;
    }
    
    yPos += 20;
    
    // Totais
    doc.fontSize(10).font(boldFont);
    doc.text('TOTAIS DA NOTA FISCAL', 30, yPos);
    yPos += 20;
    
    doc.font(regularFont);
    doc.text(`Valor dos Produtos: ${formatCurrency(nfeData.totais.valorProdutos)}`, 30, yPos);
    yPos += 15;
    doc.text(`ICMS: ${formatCurrency(nfeData.totais.icms)}`, 30, yPos);
    doc.text(`IPI: ${formatCurrency(nfeData.totais.ipi)}`, 200, yPos);
    yPos += 15;
    
    doc.fontSize(12).font(boldFont);
    doc.text(`VALOR TOTAL DA NOTA: ${formatCurrency(nfeData.totais.valorTotal)}`, 30, yPos);
    
    // Rodapé
    yPos = 750;
    doc.fontSize(8).font(regularFont);
    doc.text('DANFE gerado pelo Sistema SimpleDFe', 30, yPos);
    doc.text(`Gerado em: ${new Date().toLocaleString('pt-BR')}`, 400, yPos);
    
    // Finalizar documento
    doc.end();
    
    // Aguardar conclusão
    await new Promise((resolve, reject) => {
      stream.on('finish', resolve);
      stream.on('error', reject);
    });
    
    console.log(`DANFE gerado com sucesso: ${pdfPath}`);
    
    return {
      success: true,
      pdfPath
    };

  } catch (error) {
    console.error('Erro ao gerar DANFE:', error);
    return {
      success: false,
      error: (error as Error).message
    };
  }
}