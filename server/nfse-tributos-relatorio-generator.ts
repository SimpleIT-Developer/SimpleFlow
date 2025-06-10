import { jsPDF } from 'jspdf';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface NFSeTributo {
  numero: string;
  dataEmissao: string;
  fornecedor: string;
  cnpjFornecedor: string;
  valorServico: number;
  valorISS: number;
  valorPIS: number;
  valorCOFINS: number;
  valorINSS: number;
  valorIRRF: number;
  valorCSLL: number;
}

interface EmpresaTributos {
  nome: string;
  cnpj: string;
  nfses: NFSeTributo[];
  totais: {
    valorServico: number;
    valorISS: number;
    valorPIS: number;
    valorCOFINS: number;
    valorINSS: number;
    valorIRRF: number;
    valorCSLL: number;
  };
}

interface NFSeTributosData {
  dataInicial: string;
  dataFinal: string;
  empresa: string;
  empresas: EmpresaTributos[];
  totaisGerais: {
    valorServico: number;
    valorISS: number;
    valorPIS: number;
    valorCOFINS: number;
    valorINSS: number;
    valorIRRF: number;
    valorCSLL: number;
  };
  totalNfses: number;
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  }).format(value);
}

function formatCNPJ(cnpj: string): string {
  if (!cnpj) return '';
  const cleanCNPJ = cnpj.replace(/\D/g, '');
  if (cleanCNPJ.length === 14) {
    return cleanCNPJ.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, '$1.$2.$3/$4-$5');
  }
  return cnpj;
}

function formatDate(dateStr: string): string {
  try {
    const date = new Date(dateStr);
    return format(date, 'dd/MM/yyyy', { locale: ptBR });
  } catch (error) {
    return dateStr;
  }
}

export async function generateNfseTributosRelatorioPDF(data: NFSeTributosData): Promise<Buffer> {
  try {
    const doc = new jsPDF('landscape', 'mm', 'a4');
    const pageHeight = doc.internal.pageSize.height;
    const pageWidth = doc.internal.pageSize.width;
    const margin = 15;
    let currentY = margin;

    // Cabeçalho da página
    const addHeader = () => {
      doc.setFontSize(18);
      doc.setFont('helvetica', 'bold');
      doc.text('RELATÓRIO DE TRIBUTOS NFSe', pageWidth / 2, currentY, { align: 'center' });
      
      currentY += 12;
      doc.setFontSize(11);
      doc.setFont('helvetica', 'normal');
      doc.text(`Período: ${formatDate(data.dataInicial)} a ${formatDate(data.dataFinal)}`, pageWidth / 2, currentY, { align: 'center' });
      
      currentY += 8;
      doc.text(`Gerado em: ${format(new Date(), 'dd/MM/yyyy HH:mm', { locale: ptBR })}`, pageWidth / 2, currentY, { align: 'center' });
      
      currentY += 15;
    };

    // Função para adicionar nova página
    const addNewPage = () => {
      doc.addPage();
      currentY = margin;
      addHeader();
    };

    // Função para verificar se precisa de nova página
    const checkNewPage = (requiredSpace: number) => {
      if (currentY + requiredSpace > pageHeight - 25) {
        addNewPage();
      }
    };

    // Adicionar cabeçalho inicial
    addHeader();

    // Resumo geral dos tributos
    checkNewPage(50);
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('RESUMO GERAL DE TRIBUTOS', margin, currentY);
    currentY += 10;

    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    
    const resumoY = currentY;
    doc.text(`Total de NFSe: ${data.totalNfses}`, margin, currentY);
    currentY += 5;
    doc.text(`Valor Total Serviços: ${formatCurrency(data.totaisGerais.valorServico)}`, margin, currentY);
    currentY += 5;
    doc.text(`Total ISS: ${formatCurrency(data.totaisGerais.valorISS)}`, margin, currentY);
    
    // Coluna direita do resumo
    currentY = resumoY;
    const coluna2X = pageWidth / 2;
    doc.text(`Total PIS: ${formatCurrency(data.totaisGerais.valorPIS)}`, coluna2X, currentY);
    currentY += 5;
    doc.text(`Total COFINS: ${formatCurrency(data.totaisGerais.valorCOFINS)}`, coluna2X, currentY);
    currentY += 5;
    doc.text(`Total INSS: ${formatCurrency(data.totaisGerais.valorINSS)}`, coluna2X, currentY);
    
    // Coluna 3
    currentY = resumoY;
    const coluna3X = pageWidth - 80;
    doc.text(`Total IRRF: ${formatCurrency(data.totaisGerais.valorIRRF)}`, coluna3X, currentY);
    currentY += 5;
    doc.text(`Total CSLL: ${formatCurrency(data.totaisGerais.valorCSLL)}`, coluna3X, currentY);
    
    currentY += 15;

    // Iterar por cada empresa
    data.empresas.forEach((empresa, empresaIndex) => {
      // Verificar espaço para cabeçalho da empresa
      checkNewPage(45);

      // Cabeçalho da empresa
      doc.setFontSize(12);
      doc.setFont('helvetica', 'bold');
      doc.text(`EMPRESA: ${empresa.nome}`, margin, currentY);
      currentY += 6;
      
      if (empresa.cnpj) {
        doc.setFontSize(9);
        doc.setFont('helvetica', 'normal');
        doc.text(`CNPJ: ${formatCNPJ(empresa.cnpj)}`, margin, currentY);
        currentY += 10;
      } else {
        currentY += 6;
      }

      // Cabeçalho da tabela
      checkNewPage(25);
      
      doc.setFontSize(7);
      doc.setFont('helvetica', 'bold');
      
      const rowHeight = 5;
      
      // Colunas da tabela (mais estreitas para caber todos os tributos)
      const columns = [
        { title: 'NFSe', x: margin, width: 20 },
        { title: 'Data', x: margin + 22, width: 22 },
        { title: 'Fornecedor', x: margin + 46, width: 65 },
        { title: 'Valor Serv.', x: margin + 113, width: 25 },
        { title: 'ISS', x: margin + 140, width: 20 },
        { title: 'PIS', x: margin + 162, width: 20 },
        { title: 'COFINS', x: margin + 184, width: 20 },
        { title: 'INSS', x: margin + 206, width: 20 },
        { title: 'IRRF', x: margin + 228, width: 20 },
        { title: 'CSLL', x: margin + 250, width: 20 }
      ];

      // Desenhar fundo do cabeçalho
      doc.setFillColor(230, 230, 230);
      doc.rect(margin, currentY - 1, pageWidth - (2 * margin), rowHeight + 1, 'F');
      
      // Texto do cabeçalho
      doc.setTextColor(0, 0, 0);
      columns.forEach((col, index) => {
        if (index >= 3) { // Colunas de valores alinhadas à direita
          doc.text(col.title, col.x + col.width - 2, currentY + 3, { align: 'right' });
        } else {
          doc.text(col.title, col.x + 1, currentY + 3);
        }
      });

      currentY += rowHeight + 1;

      // Itens da tabela
      empresa.nfses.forEach((nfse, index) => {
        checkNewPage(6);

        // Alternar cor de fundo das linhas
        if (index % 2 === 0) {
          doc.setFillColor(248, 248, 248);
          doc.rect(margin, currentY - 1, pageWidth - (2 * margin), rowHeight, 'F');
        }

        doc.setFont('helvetica', 'normal');
        doc.setFontSize(6);
        
        // Dados da NFSe
        doc.text(String(nfse.numero || ''), columns[0].x + 1, currentY + 2.5);
        doc.text(formatDate(nfse.dataEmissao), columns[1].x + 1, currentY + 2.5);
        
        // Fornecedor (truncar se muito longo)
        let fornecedor = nfse.fornecedor || '';
        if (fornecedor.length > 30) {
          fornecedor = fornecedor.substring(0, 27) + '...';
        }
        doc.text(fornecedor, columns[2].x + 1, currentY + 2.5);
        
        // Valores com alinhamento à direita
        doc.text(formatCurrency(nfse.valorServico), columns[3].x + columns[3].width - 2, currentY + 2.5, { align: 'right' });
        doc.text(formatCurrency(nfse.valorISS), columns[4].x + columns[4].width - 2, currentY + 2.5, { align: 'right' });
        doc.text(formatCurrency(nfse.valorPIS), columns[5].x + columns[5].width - 2, currentY + 2.5, { align: 'right' });
        doc.text(formatCurrency(nfse.valorCOFINS), columns[6].x + columns[6].width - 2, currentY + 2.5, { align: 'right' });
        doc.text(formatCurrency(nfse.valorINSS), columns[7].x + columns[7].width - 2, currentY + 2.5, { align: 'right' });
        doc.text(formatCurrency(nfse.valorIRRF), columns[8].x + columns[8].width - 2, currentY + 2.5, { align: 'right' });
        doc.text(formatCurrency(nfse.valorCSLL), columns[9].x + columns[9].width - 2, currentY + 2.5, { align: 'right' });

        currentY += rowHeight;
      });

      // Subtotais da empresa
      currentY += 3;
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8);
      
      doc.text('SUBTOTAIS:', columns[2].x + 1, currentY + 2.5);
      doc.text(formatCurrency(empresa.totais.valorServico), columns[3].x + columns[3].width - 2, currentY + 2.5, { align: 'right' });
      doc.text(formatCurrency(empresa.totais.valorISS), columns[4].x + columns[4].width - 2, currentY + 2.5, { align: 'right' });
      doc.text(formatCurrency(empresa.totais.valorPIS), columns[5].x + columns[5].width - 2, currentY + 2.5, { align: 'right' });
      doc.text(formatCurrency(empresa.totais.valorCOFINS), columns[6].x + columns[6].width - 2, currentY + 2.5, { align: 'right' });
      doc.text(formatCurrency(empresa.totais.valorINSS), columns[7].x + columns[7].width - 2, currentY + 2.5, { align: 'right' });
      doc.text(formatCurrency(empresa.totais.valorIRRF), columns[8].x + columns[8].width - 2, currentY + 2.5, { align: 'right' });
      doc.text(formatCurrency(empresa.totais.valorCSLL), columns[9].x + columns[9].width - 2, currentY + 2.5, { align: 'right' });
      
      currentY += 10;

      // Separador entre empresas (exceto a última)
      if (empresaIndex < data.empresas.length - 1) {
        checkNewPage(8);
        doc.line(margin, currentY, pageWidth - margin, currentY);
        currentY += 8;
      }
    });

    // Totalizador geral
    checkNewPage(25);
    currentY += 8;
    
    // Linha separadora
    doc.setLineWidth(1);
    doc.line(margin, currentY, pageWidth - margin, currentY);
    currentY += 8;
    
    // Totais gerais
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('TOTAIS GERAIS', pageWidth / 2, currentY, { align: 'center' });
    currentY += 8;
    
    doc.setFontSize(10);
    doc.text(`Valor Total Serviços: ${formatCurrency(data.totaisGerais.valorServico)}`, pageWidth / 2, currentY, { align: 'center' });
    currentY += 5;
    doc.text(`Total Tributos: ${formatCurrency(data.totaisGerais.valorISS + data.totaisGerais.valorPIS + data.totaisGerais.valorCOFINS + data.totaisGerais.valorINSS + data.totaisGerais.valorIRRF + data.totaisGerais.valorCSLL)}`, pageWidth / 2, currentY, { align: 'center' });

    // Rodapé
    const totalPages = doc.getNumberOfPages();
    for (let i = 1; i <= totalPages; i++) {
      doc.setPage(i);
      doc.setFontSize(8);
      doc.setFont('helvetica', 'normal');
      doc.text(`Página ${i} de ${totalPages}`, pageWidth / 2, pageHeight - 8, { align: 'center' });
      doc.text('SimpleDFe - Sistema de Gestão de Documentos Fiscais', pageWidth / 2, pageHeight - 4, { align: 'center' });
    }

    // Retornar PDF como Buffer
    const pdfOutput = doc.output('arraybuffer');
    return Buffer.from(pdfOutput);

  } catch (error) {
    console.error('Erro ao gerar PDF do relatório NFSe Tributos:', error);
    throw new Error(`Erro ao gerar PDF: ${(error as Error).message}`);
  }
}