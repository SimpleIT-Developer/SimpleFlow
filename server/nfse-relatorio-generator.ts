import { jsPDF } from 'jspdf';

interface NFSeRelatorialData {
  dataInicial: string;
  dataFinal: string;
  empresa: string;
  empresas: Map<string, {
    nome: string;
    cnpj: string;
    nfses: Array<{
      numero: string;
      dataEmissao: string;
      fornecedor: string;
      cnpjFornecedor: string;
      valor: number;
    }>;
    total: number;
  }>;
  totalGeral: number;
  totalNfses: number;
}

export async function generateNfseRelatorioPDF(data: NFSeRelatorialData): Promise<Buffer> {
  const doc = new jsPDF({
    orientation: 'landscape',
    unit: 'mm',
    format: 'a4'
  });

  // Configurações
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 15;
  const usableWidth = pageWidth - (margin * 2);
  let currentY = margin;

  // Função para adicionar nova página
  const addNewPage = () => {
    doc.addPage();
    currentY = margin;
    addHeader();
  };

  // Função para verificar se precisa de nova página
  const checkNewPage = (neededSpace: number) => {
    if (currentY + neededSpace > pageHeight - margin) {
      addNewPage();
    }
  };

  // Cabeçalho
  const addHeader = () => {
    // Logo/Título
    doc.setFontSize(20);
    doc.setFont('helvetica', 'bold');
    doc.text('SIMPLDFÉ', margin, currentY);
    
    // Título do relatório
    doc.setFontSize(16);
    doc.text('RELATÓRIO RESUMO DE NFSE', pageWidth / 2, currentY, { align: 'center' });
    
    currentY += 10;
    
    // Período
    doc.setFontSize(12);
    doc.setFont('helvetica', 'normal');
    const periodoText = `Período: ${formatDateBR(data.dataInicial)} a ${formatDateBR(data.dataFinal)}`;
    doc.text(periodoText, pageWidth / 2, currentY, { align: 'center' });
    
    currentY += 8;
    
    // Empresa filtro
    if (data.empresa && data.empresa !== 'all') {
      const empresaInfo = Array.from(data.empresas.values()).find(emp => emp.cnpj === data.empresa);
      if (empresaInfo) {
        doc.text(`Empresa: ${empresaInfo.nome} - CNPJ: ${formatCNPJ(empresaInfo.cnpj)}`, pageWidth / 2, currentY, { align: 'center' });
        currentY += 8;
      }
    }
    
    // Data de geração
    doc.setFontSize(10);
    doc.text(`Gerado em: ${new Date().toLocaleString('pt-BR')}`, pageWidth - margin, currentY, { align: 'right' });
    
    currentY += 15;
  };

  // Adicionar cabeçalho inicial
  addHeader();

  // Resumo geral
  checkNewPage(25);
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('RESUMO GERAL', margin, currentY);
  currentY += 8;

  doc.setFontSize(11);
  doc.setFont('helvetica', 'normal');
  doc.text(`Total de Empresas: ${data.empresas.size}`, margin, currentY);
  currentY += 5;
  doc.text(`Total de NFSe: ${data.totalNfses}`, margin, currentY);
  currentY += 5;
  doc.text(`Valor Total Geral: ${formatCurrency(data.totalGeral)}`, margin, currentY);
  currentY += 15;

  // Tabela por empresa
  const empresasArray = Array.from(data.empresas.entries());
  for (const [cnpj, empresa] of empresasArray) {
    checkNewPage(40);
    
    // Cabeçalho da empresa
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text(`${empresa.nome}`, margin, currentY);
    currentY += 5;
    
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(`CNPJ: ${formatCNPJ(empresa.cnpj)} | Total: ${formatCurrency(empresa.total)} | NFSe: ${empresa.nfses.length}`, margin, currentY);
    currentY += 10;

    // Cabeçalho da tabela
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    
    const colWidths = {
      numero: 35,
      data: 25,
      fornecedor: 80,
      cnpj: 45,
      valor: 25
    };
    
    let colX = margin;
    
    // Fundo do cabeçalho
    doc.setFillColor(240, 240, 240);
    doc.rect(margin, currentY - 2, usableWidth, 8, 'F');
    
    // Textos do cabeçalho
    doc.setTextColor(0, 0, 0);
    doc.text('Número NFSe', colX + 2, currentY + 3);
    colX += colWidths.numero;
    
    doc.text('Data Emissão', colX + 2, currentY + 3);
    colX += colWidths.data;
    
    doc.text('Fornecedor', colX + 2, currentY + 3);
    colX += colWidths.fornecedor;
    
    doc.text('CNPJ Fornecedor', colX + 2, currentY + 3);
    colX += colWidths.cnpj;
    
    doc.text('Valor', colX + 2, currentY + 3);
    
    currentY += 10;

    // Dados das NFSe
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    
    for (const nfse of empresa.nfses) {
      checkNewPage(8);
      
      colX = margin;
      
      // Zebra stripes
      if ((empresa.nfses.indexOf(nfse)) % 2 === 0) {
        doc.setFillColor(250, 250, 250);
        doc.rect(margin, currentY - 2, usableWidth, 6, 'F');
      }
      
      // Número NFSe
      doc.text(nfse.numero.toString(), colX + 2, currentY + 2);
      colX += colWidths.numero;
      
      // Data
      doc.text(formatDateBR(nfse.dataEmissao), colX + 2, currentY + 2);
      colX += colWidths.data;
      
      // Fornecedor (truncar se muito longo)
      const fornecedorText = nfse.fornecedor.length > 35 ? 
        nfse.fornecedor.substring(0, 32) + '...' : nfse.fornecedor;
      doc.text(fornecedorText, colX + 2, currentY + 2);
      colX += colWidths.fornecedor;
      
      // CNPJ
      doc.text(formatCNPJ(nfse.cnpjFornecedor), colX + 2, currentY + 2);
      colX += colWidths.cnpj;
      
      // Valor
      doc.text(formatCurrency(nfse.valor), colX + 2, currentY + 2);
      
      currentY += 6;
    }
    
    // Linha de total da empresa
    currentY += 3;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.text(`Subtotal ${empresa.nome}: ${formatCurrency(empresa.total)}`, pageWidth - margin - 60, currentY, { align: 'right' });
    currentY += 15;
  }

  // Total geral final
  checkNewPage(15);
  doc.setDrawColor(0, 0, 0);
  doc.line(margin, currentY, pageWidth - margin, currentY);
  currentY += 8;
  
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text(`TOTAL GERAL: ${formatCurrency(data.totalGeral)}`, pageWidth - margin, currentY, { align: 'right' });

  // Adicionar numeração de páginas
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.text(`Página ${i} de ${pageCount}`, pageWidth - margin, pageHeight - 5, { align: 'right' });
  }

  return Buffer.from(doc.output('arraybuffer'));
}

// Funções auxiliares
function formatCurrency(value: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  }).format(value);
}

function formatCNPJ(cnpj: string): string {
  if (!cnpj) return '';
  const cleaned = cnpj.replace(/\D/g, '');
  if (cleaned.length === 14) {
    return cleaned.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5');
  }
  return cnpj;
}

function formatDateBR(dateStr: string): string {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  return date.toLocaleDateString('pt-BR');
}