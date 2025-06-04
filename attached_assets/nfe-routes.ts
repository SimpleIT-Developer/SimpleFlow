import { Request, Response } from "express";
import { Express } from "express";
import { z } from "zod";
import multer from "multer";
import { storage } from "../storage";
import { DocumentStatus, DocumentType, InsertNfeDocument, ErpStatus } from "@shared/schema";
import { parseXml, identifyDocumentType, getXmlValue } from "../utils/xmlUtils";
import { consultSupplierInERP } from "../erp";
import { db } from "../db";
import { municipalities } from "@shared/schema";
import { eq } from "drizzle-orm";
import { checkDocumentErpStatus } from "../utils/erpStatusUtils";

// Configuração do multer para upload de arquivos
const upload = multer({ 
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 } // 10 MB limit
});

// Extrai informações de uma NFe XML
async function extractNfeInfo(xmlContent: string): Promise<Partial<InsertNfeDocument>> {
  try {
    const parsed = parseXml(xmlContent);
    
    // Determinar o tipo de documento
    const documentType = identifyDocumentType(xmlContent);
    if (documentType !== 'NFE') {
      throw new Error(`Documento XML não é uma NFe válida. Tipo detectado: ${documentType || 'Desconhecido'}`);
    }
    
    // Extrair os dados principais
    let number = '';
    let supplierName = '';
    let supplierCnpj = '';
    let issueDate = new Date();
    let value = '0.00';
    let chaveAcesso = '';
    let municipalityCode = '';
    
    // Extrair a chave de acesso da NFe
    chaveAcesso = getXmlValue(xmlContent, 'NFe/infNFe/@Id') || '';
    // Remover prefixo "NFe" se existir
    chaveAcesso = chaveAcesso.replace('NFe', '');
    
    // Extrair número da nota
    number = getXmlValue(xmlContent, 'NFe/infNFe/ide/nNF') || '';
    
    // Extrair informações do emitente (fornecedor)
    supplierName = getXmlValue(xmlContent, 'NFe/infNFe/emit/xNome') || '';
    supplierCnpj = getXmlValue(xmlContent, 'NFe/infNFe/emit/CNPJ') || '';
    
    // Extrair código do município do emitente
    municipalityCode = getXmlValue(xmlContent, 'NFe/infNFe/emit/enderEmit/cMun') || 
                       getXmlValue(xmlContent, 'NFe/infNFe/ide/cMunFG') || '';
    
    // Extrair data de emissão
    const dateString = getXmlValue(xmlContent, 'NFe/infNFe/ide/dhEmi') || 
                       getXmlValue(xmlContent, 'NFe/infNFe/ide/dEmi') || '';
    
    if (dateString) {
      // Formato ISO ou formato DD/MM/YYYY
      issueDate = new Date(dateString);
      if (isNaN(issueDate.getTime())) {
        // Tenta formato DD/MM/YYYY
        const parts = dateString.split('/');
        if (parts.length === 3) {
          issueDate = new Date(`${parts[2]}-${parts[1]}-${parts[0]}`);
        }
      }
    }
    
    // Extrair valor total
    value = getXmlValue(xmlContent, 'NFe/infNFe/total/ICMSTot/vNF') || '0.00';
    
    // Verificar se conseguimos extrair o mínimo necessário
    if (!number || !supplierCnpj) {
      throw new Error("Não foi possível extrair as informações básicas da NFe");
    }
    
    // Buscar nome do município a partir do código
    let municipalityName = '';
    if (municipalityCode) {
      municipalityName = await getMunicipalityNameByCode(municipalityCode);
    }
    
    return {
      number,
      supplierName,
      supplierCnpj,
      issueDate,
      value: value.toString(),
      chaveAcesso,
      xmlContent,
      status: "IMPORTED",
      municipalityCode,
      municipalityName,
    };
  } catch (error) {
    console.error("Erro ao extrair informações da NFe:", error);
    throw new Error(`Erro ao processar o XML: ${(error as Error).message}`);
  }
}

// Função para buscar nome do município pelo código IBGE
async function getMunicipalityNameByCode(code: string): Promise<string> {
  try {
    if (!code || code.trim() === '') return 'Não informado';
    
    // Buscar na tabela de municípios
    const result = await db.select().from(municipalities).where(eq(municipalities.code, code));
    
    if (result.length > 0) {
      // Retornar formato "Nome, UF"
      return `${result[0].name}, ${result[0].state}`;
    }
    
    return `Município ${code}`;
  } catch (error) {
    console.error('Erro ao buscar município:', error);
    return `Município ${code}`;
  }
}

// Helper para formatar erros Zod
function formatZodError(error: z.ZodError) {
  const errors = error.errors.map(e => {
    return `${e.path.join('.')}: ${e.message}`;
  });
  return errors.join(', ');
}

// Exporta as rotas relacionadas a NFe
export function registerNfeRoutes(app: Express) {
  // Rota para listar NFes com opção de filtragem e paginação
  app.get('/api/nfe-documents', async (req: Request, res: Response) => {
    try {
      // Obter parâmetros de paginação e filtros
      const page = parseInt(req.query.page as string) || 1;
      const pageSize = parseInt(req.query.pageSize as string) || 10;
      
      // Construir objeto de filtros
      const filters: Record<string, any> = {};
      
      // Filtros comuns
      if (req.query.search) {
        filters.search = req.query.search as string;
      }
      
      if (req.query.companyId && req.query.companyId !== '') {
        filters.companyId = parseInt(req.query.companyId as string);
      }
      
      // Filtro de data
      if (req.query.noDateFilter !== 'true') {
        const startDate = req.query.startDate ? new Date(req.query.startDate as string) : undefined;
        const endDate = req.query.endDate ? new Date(req.query.endDate as string) : undefined;
        
        if (startDate) {
          filters.startDate = startDate;
        }
        
        if (endDate) {
          filters.endDate = endDate;
        }
      }
      
      // Buscar documentos paginados
      const result = await storage.getNfeDocumentsPaginated(page, pageSize, filters);
      
      return res.json({
        documents: result.documents,
        page,
        pageSize,
        total: result.total,
        totalPages: Math.ceil(result.total / pageSize)
      });
    } catch (error) {
      console.error("Erro ao buscar documentos NFe:", error);
      return res.status(500).json({ error: (error as Error).message });
    }
  });

  // Rota para buscar um documento NFe específico
  app.get('/api/nfe-documents/:id', async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      const document = await storage.getNfeDocument(id);
      
      if (!document) {
        return res.status(404).json({ error: "Documento não encontrado" });
      }
      
      return res.json(document);
    } catch (error) {
      console.error("Erro ao buscar documento NFe:", error);
      return res.status(500).json({ error: (error as Error).message });
    }
  });

  // Rota para buscar documentos NFe de uma empresa específica
  app.get('/api/companies/:id/nfe-documents', async (req: Request, res: Response) => {
    try {
      const companyId = parseInt(req.params.id);
      const documents = await storage.getNfeDocumentsByCompany(companyId);
      
      return res.json(documents);
    } catch (error) {
      console.error("Erro ao buscar documentos NFe da empresa:", error);
      return res.status(500).json({ error: (error as Error).message });
    }
  });

  // Rota para importar XMLs de NFe
  app.post('/api/nfe-documents/import', upload.array('files'), async (req: Request, res: Response) => {
    console.log('[NFE-IMPORT] Iniciando importação de XML NFe');
    console.log('[NFE-IMPORT] Body:', JSON.stringify(req.body));
    console.log('[NFE-IMPORT] Files:', req.files ? (req.files as Express.Multer.File[]).map(f => f.originalname).join(', ') : 'nenhum');
    
    try {
      if (!req.files || !Array.isArray(req.files) || req.files.length === 0) {
        console.log('[NFE-IMPORT] Erro: Nenhum arquivo enviado');
        return res.status(400).json({ error: "Nenhum arquivo foi enviado" });
      }
      
      const companyId = parseInt(req.body.companyId);
      if (isNaN(companyId)) {
        return res.status(400).json({ error: "ID da empresa é obrigatório" });
      }
      
      // Verificar se a empresa existe
      const company = await storage.getCompany(companyId);
      if (!company) {
        return res.status(404).json({ error: "Empresa não encontrada" });
      }
      
      // Processar cada arquivo XML
      const results = [];
      for (const file of req.files as Express.Multer.File[]) {
        try {
          const xmlContent = file.buffer.toString('utf8');
          
          // Extrair informações do XML
          const nfeInfo = await extractNfeInfo(xmlContent);
          
          // Verificar se o fornecedor já existe ou buscá-lo no ERP
          const cnpj = nfeInfo.supplierCnpj as string;
          const supplierName = nfeInfo.supplierName as string;
          let supplier = await storage.getSupplierByCnpj(cnpj);
          
          if (!supplier) {
            // Tentar buscar no ERP
            const erpData = await consultSupplierInERP(cnpj);
            
            if (erpData) {
              // Criar fornecedor com dados do ERP
              supplier = await storage.createSupplier({
                name: erpData.NOME || supplierName,
                cnpj: cnpj,
                email: erpData.EMAIL,
                phone: erpData.TELEFONE,
                address: `${erpData.RUA || ''}, ${erpData.NUMERO || ''} - ${erpData.BAIRRO || ''}`,
                city: erpData.CIDADE,
                state: erpData.CODETD,
                zipCode: erpData.CEP,
                existsInErp: true,
                erpCode: erpData.CODCFO,
                lastErpCheck: new Date()
              });
            } else {
              // Criar fornecedor apenas com dados básicos do XML
              supplier = await storage.createSupplier({
                name: supplierName,
                cnpj: cnpj,
                existsInErp: false
              });
            }
          }
          
          // Criar documento NFe - nesse ponto o nfeInfo é um objeto, não mais uma promise
          // Verificar status no ERP antes de salvar o documento
          let statusErp: "PENDING" | "INTEGRATED" | "NOT_INTEGRATED" = ErpStatus.PENDING;
          const supplierErpCode = supplier?.erpCode || null;
          
          // Se o fornecedor tiver código ERP, verifica status no ERP
          if (supplierErpCode) {
            console.log(`[NFE-IMPORT] Verificando status ERP para ${nfeInfo.number} do fornecedor ${supplierErpCode}`);
            statusErp = await checkDocumentErpStatus(supplierErpCode, nfeInfo.number as string);
          }
          
          const nfeData = {
            number: nfeInfo.number,
            supplierName: nfeInfo.supplierName,
            supplierCnpj: nfeInfo.supplierCnpj,
            issueDate: nfeInfo.issueDate,
            value: nfeInfo.value,
            xmlContent: nfeInfo.xmlContent,
            chaveAcesso: nfeInfo.chaveAcesso,
            status: "IMPORTED",
            municipalityCode: nfeInfo.municipalityCode,
            municipalityName: nfeInfo.municipalityName,
            companyId,
            statusErp,
            erpSupplierCode: supplierErpCode,
            lastErpCheck: new Date()
          } as InsertNfeDocument;
          
          const document = await storage.createNfeDocument(nfeData);
          
          results.push({
            success: true,
            filename: file.originalname,
            documentId: document.id,
            statusErp
          });
          
        } catch (error) {
          console.error(`Erro ao processar arquivo ${(file as Express.Multer.File).originalname}:`, error);
          results.push({
            success: false,
            filename: (file as Express.Multer.File).originalname,
            error: (error as Error).message
          });
        }
      }
      
      // Contar sucessos e falhas
      const successCount = results.filter(r => r.success).length;
      const failCount = results.filter(r => !r.success).length;
      
      console.log(`[NFE-IMPORT] Concluído: ${successCount} documentos importados com sucesso, ${failCount} falhas`);
      return res.json({
        success: successCount > 0,
        message: `Importação concluída: ${successCount} arquivos processados com sucesso, ${failCount} falhas.`,
        imported: successCount,
        results
      });
      
    } catch (error) {
      console.error("[NFE-IMPORT] Erro na importação de XMLs NFe:", error);
      return res.status(500).json({ 
        success: false,
        error: (error as Error).message 
      });
    }
  });

  // Rota para excluir um documento NFe
  app.delete('/api/nfe-documents/:id', async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      const success = await storage.deleteNfeDocument(id);
      
      if (!success) {
        return res.status(404).json({ error: "Documento não encontrado" });
      }
      
      return res.json({ success: true });
    } catch (error) {
      console.error("Erro ao excluir documento NFe:", error);
      return res.status(500).json({ error: (error as Error).message });
    }
  });

  // Rota para excluir múltiplos documentos NFe
  app.post('/api/nfe-documents/bulk-delete', async (req: Request, res: Response) => {
    try {
      const schema = z.object({
        documentIds: z.array(z.number())
      });
      
      const result = schema.safeParse(req.body);
      
      if (!result.success) {
        return res.status(400).json({ error: formatZodError(result.error) });
      }
      
      const { documentIds } = result.data;
      
      if (documentIds.length === 0) {
        return res.status(400).json({ error: "Nenhum ID de documento fornecido" });
      }
      
      // Excluir cada documento
      const results = [];
      for (const id of documentIds) {
        try {
          const success = await storage.deleteNfeDocument(id);
          results.push({ id, success });
        } catch (error) {
          results.push({ id, success: false, error: (error as Error).message });
        }
      }
      
      // Contar sucessos e falhas
      const successCount = results.filter(r => r.success).length;
      const failCount = results.filter(r => !r.success).length;
      
      return res.json({
        success: successCount > 0,
        message: `${successCount} documentos excluídos com sucesso, ${failCount} falhas.`,
        results
      });
      
    } catch (error) {
      console.error("Erro na exclusão em lote de documentos NFe:", error);
      return res.status(500).json({ error: (error as Error).message });
    }
  });
}