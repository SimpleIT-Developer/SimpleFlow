import { jsPDF } from 'jspdf';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface NFSe {
  numero: string;
  dataEmissao: string;
  fornecedor: string;
  cnpjFornecedor: string;
  valor: number;
}

interface Empresa {
  nome: string;
  cnpj: string;
  nfses: NFSe[];
  total: number;
}

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

export async function generateNfseRelatorioPDF(data: NFSeRelatorialData): Promise<Buffer> {
  try {
    const doc = new jsPDF('landscape', 'mm', 'a4');
    const pageHeight = doc.internal.pageSize.height;
    const pageWidth = doc.internal.pageSize.width;
    const margin = 20;
    let currentY = margin;

    // Converter Map para Array de empresas
    const empresas: Empresa[] = Array.from(data.empresas.values());

    // Cabeçalho da página
    const addHeader = () => {
      doc.setFontSize(20);
      doc.setFont('helvetica', 'bold');
      doc.text('RELATÓRIO DE NFSe - RESUMO', pageWidth / 2, currentY, { align: 'center' });
      
      currentY += 15;
      doc.setFontSize(12);
      doc.setFont('helvetica', 'normal');
      doc.text(`Período: ${formatDate(data.dataInicial)} a ${formatDate(data.dataFinal)}`, pageWidth / 2, currentY, { align: 'center' });
      
      currentY += 10;
      doc.text(`Gerado em: ${format(new Date(), 'dd/MM/yyyy HH:mm', { locale: ptBR })}`, pageWidth / 2, currentY, { align: 'center' });
      
      currentY += 20;
    };

    // Função para adicionar nova página
    const addNewPage = () => {
      doc.addPage();
      currentY = margin;
      addHeader();
    };

    // Função para verificar se precisa de nova página
    const checkNewPage = (requiredSpace: number) => {
      if (currentY + requiredSpace > pageHeight - 30) {
        addNewPage();
      }
    };

    // Adicionar cabeçalho inicial
    addHeader();

    // Iterar por cada empresa
    empresas.forEach((empresa, empresaIndex) => {
      // Verificar espaço para cabeçalho da empresa
      checkNewPage(40);

      // Cabeçalho da empresa
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.text(`EMPRESA: ${empresa.nome}`, margin, currentY);
      currentY += 8;
      
      if (empresa.cnpj) {
        doc.setFontSize(10);
        doc.setFont('helvetica', 'normal');
        doc.text(`CNPJ: ${formatCNPJ(empresa.cnpj)}`, margin, currentY);
        currentY += 12;
      } else {
        currentY += 8;
      }

      // Cabeçalho da tabela
      checkNewPage(25);
      
      doc.setFontSize(8);
      doc.setFont('helvetica', 'bold');
      
      // Desenhar cabeçalho da tabela
      const tableStartY = currentY;
      const rowHeight = 6;
      
      // Colunas da tabela com layout ajustado para paisagem
      const columns = [
        { title: 'NFSe', x: margin, width: 25 },
        { title: 'Data', x: margin + 27, width: 28 },
        { title: 'Fornecedor', x: margin + 57, width: 100 },
        { title: 'CNPJ', x: margin + 159, width: 45 },
        { title: 'Valor (R$)', x: margin + 206, width: 35 }
      ];

      // Desenhar fundo do cabeçalho
      doc.setFillColor(230, 230, 230);
      doc.rect(margin, currentY - 2, pageWidth - (2 * margin), rowHeight + 2, 'F');
      
      // Texto do cabeçalho
      doc.setTextColor(0, 0, 0);
      columns.forEach((col, index) => {
        if (index === 4) { // Coluna "Valor" alinhada à direita
          doc.text(col.title, col.x + col.width - 2, currentY + 3, { align: 'right' });
        } else {
          doc.text(col.title, col.x + 2, currentY + 3);
        }
      });

      currentY += rowHeight + 2;

      // Itens da tabela
      empresa.nfses.forEach((nfse, index) => {
        checkNewPage(8);

        // Alternar cor de fundo das linhas
        if (index % 2 === 0) {
          doc.setFillColor(248, 248, 248);
          doc.rect(margin, currentY - 1, pageWidth - (2 * margin), rowHeight, 'F');
        }

        doc.setFont('helvetica', 'normal');
        doc.setFontSize(7);
        
        // Dados da NFSe
        doc.text(String(nfse.numero || ''), columns[0].x + 2, currentY + 3);
        doc.text(formatDate(nfse.dataEmissao), columns[1].x + 2, currentY + 3);
        
        // Fornecedor (truncar se muito longo)
        let fornecedor = nfse.fornecedor || '';
        if (fornecedor.length > 45) {
          fornecedor = fornecedor.substring(0, 42) + '...';
        }
        doc.text(fornecedor, columns[2].x + 2, currentY + 3);
        
        doc.text(formatCNPJ(nfse.cnpjFornecedor || ''), columns[3].x + 2, currentY + 3);
        
        // Valor com alinhamento à direita
        const valorFormatado = formatCurrency(nfse.valor || 0);
        doc.text(valorFormatado, columns[4].x + columns[4].width - 2, currentY + 3, { align: 'right' });

        currentY += rowHeight;
      });

      // Total da empresa
      currentY += 5;
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9);
      doc.text(`Total da Empresa: ${formatCurrency(empresa.total)}`, pageWidth - margin - 50, currentY, { align: 'right' });
      
      currentY += 15;

      // Separador entre empresas (exceto a última)
      if (empresaIndex < empresas.length - 1) {
        checkNewPage(10);
        doc.line(margin, currentY, pageWidth - margin, currentY);
        currentY += 10;
      }
    });

    // Totalizador geral
    checkNewPage(30);
    currentY += 10;
    
    // Linha separadora
    doc.setLineWidth(1);
    doc.line(margin, currentY, pageWidth - margin, currentY);
    currentY += 10;
    
    // Total geral
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text(`TOTAL GERAL: ${formatCurrency(data.totalGeral)}`, pageWidth / 2, currentY, { align: 'center' });

    // Rodapé
    const totalPages = doc.getNumberOfPages();
    for (let i = 1; i <= totalPages; i++) {
      doc.setPage(i);
      doc.setFontSize(8);
      doc.setFont('helvetica', 'normal');
      doc.text(`Página ${i} de ${totalPages}`, pageWidth / 2, pageHeight - 10, { align: 'center' });
      doc.text('SimpleDFe - Sistema de Gestão de Documentos Fiscais', pageWidth / 2, pageHeight - 5, { align: 'center' });
    }

    // Retornar PDF como Buffer
    const pdfOutput = doc.output('arraybuffer');
    return Buffer.from(pdfOutput);

  } catch (error) {
    console.error('Erro ao gerar PDF do relatório NFSe:', error);
    throw new Error(`Erro ao gerar PDF: ${(error as Error).message}`);
  }
}