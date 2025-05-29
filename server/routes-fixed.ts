import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { loginSchema, registerSchema, users, type Company, type CompanyFilters, type CompanyResponse, type NFeRecebida, type NFeFilters, type NFeResponse, type NFSeRecebida, type NFSeResponse, type Usuario, type UsuarioResponse, type FornecedorResponse } from "@shared/schema";
import { z } from "zod";
import { mysqlPool, testMysqlConnection } from "./mysql-config";
import { db } from "./db";
import { sendWelcomeEmail } from "./email-service";
import { sendWelcomeEmail as sendWelcomeEmailSG } from "./sendgrid-service";
import { eq, ilike, or, and, count, desc, asc } from "drizzle-orm";

const JWT_SECRET = process.env.JWT_SECRET || "your-secret-key-change-in-production";

// Middleware to verify JWT token
function authenticateToken(req: any, res: any, next: any) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ message: 'Token de acesso requerido' });
  }

  jwt.verify(token, JWT_SECRET, (err: any, user: any) => {
    if (err) {
      return res.status(403).json({ message: 'Token inválido' });
    }
    req.user = user;
    next();
  });
}

export async function registerRoutes(app: Express): Promise<Server> {
  const httpServer = createServer(app);

  // Registration endpoint
  app.post("/api/auth/register", async (req, res) => {
    try {
      const validatedData = registerSchema.parse(req.body);

      // Check if user already exists
      const existingUser = await storage.getUserByEmail(validatedData.email);
      if (existingUser) {
        return res.status(400).json({ message: "Email já está em uso" });
      }

      // Hash password
      const hashedPassword = await bcrypt.hash(validatedData.password, 10);

      // Create user
      const newUser = await storage.createUser({
        username: validatedData.username,
        email: validatedData.email,
        password: hashedPassword,
        name: validatedData.name,
      });

      // Buscar código do cliente no MySQL
      let codigoCliente = '';
      let nomeEmpresa = '';
      try {
        const [clienteResult] = await mysqlPool.execute('SELECT codigo, nome_fantasia FROM cliente LIMIT 1') as any;
        if (clienteResult.length > 0) {
          codigoCliente = clienteResult[0].codigo || '';
          nomeEmpresa = clienteResult[0].nome_fantasia || '';
        }
      } catch (error) {
        console.warn('Erro ao buscar código do cliente:', error);
      }

      // Enviar email de boas-vindas com SendGrid em background
      sendWelcomeEmailSG({
        nome: newUser.name,
        email: newUser.email,
        senha: validatedData.password,
        codigoCliente,
        nomeEmpresa
      }).catch(error => {
        console.error('Erro ao enviar email de boas-vindas:', error);
      });

      // Generate JWT token
      const token = jwt.sign(
        { id: newUser.id, email: newUser.email, username: newUser.username },
        JWT_SECRET,
        { expiresIn: '24h' }
      );

      // Return user data without password
      const { password, ...userWithoutPassword } = newUser;
      res.status(201).json({
        message: "Usuário criado com sucesso",
        user: userWithoutPassword,
        token
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Dados inválidos", errors: error.errors });
      }
      console.error("Registration error:", error);
      res.status(500).json({ message: "Erro interno do servidor" });
    }
  });

  // Login endpoint
  app.post("/api/auth/login", async (req, res) => {
    try {
      const validatedData = loginSchema.parse(req.body);

      // Find user by email
      const user = await storage.getUserByEmail(validatedData.email);
      if (!user) {
        return res.status(401).json({ message: "Credenciais inválidas" });
      }

      // Check password
      const isValidPassword = await bcrypt.compare(validatedData.password, user.password);
      if (!isValidPassword) {
        return res.status(401).json({ message: "Credenciais inválidas" });
      }

      // Generate JWT token
      const token = jwt.sign(
        { id: user.id, email: user.email, username: user.username },
        JWT_SECRET,
        { expiresIn: '24h' }
      );

      // Return user data without password
      const { password, ...userWithoutPassword } = user;
      res.json({
        message: "Login realizado com sucesso",
        user: userWithoutPassword,
        token
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Dados inválidos", errors: error.errors });
      }
      console.error("Login error:", error);
      res.status(500).json({ message: "Erro interno do servidor" });
    }
  });

  // Check auth status
  app.get("/api/auth/me", authenticateToken, async (req, res) => {
    try {
      const user = await storage.getUser(req.user.id);
      if (!user) {
        return res.status(404).json({ message: "Usuário não encontrado" });
      }

      const { password, ...userWithoutPassword } = user;
      res.json({ user: userWithoutPassword });
    } catch (error) {
      console.error("Auth check error:", error);
      res.status(500).json({ message: "Erro interno do servidor" });
    }
  });

  // Logout endpoint
  app.post("/api/auth/logout", (req, res) => {
    res.json({ message: "Logout realizado com sucesso" });
  });

  // Companies routes
  app.get("/api/companies", authenticateToken, async (req, res) => {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 10;
      const search = req.query.search as string || '';
      const sortBy = req.query.sortBy as keyof Company || 'company_name';
      const sortOrder = req.query.sortOrder as 'asc' | 'desc' || 'asc';

      const offset = (page - 1) * limit;

      let countQuery = 'SELECT COUNT(*) as total FROM empresa';
      let dataQuery = `SELECT company_id, company_name, company_fantasy, company_cpf_cnpj, company_email, company_city, company_uf FROM empresa`;
      const queryParams: any[] = [];

      if (search) {
        const searchCondition = ' WHERE company_name LIKE ? OR company_fantasy LIKE ? OR company_cpf_cnpj LIKE ?';
        countQuery += searchCondition;
        dataQuery += searchCondition;
        const searchParam = `%${search}%`;
        queryParams.push(searchParam, searchParam, searchParam);
      }

      dataQuery += ` ORDER BY ${sortBy} ${sortOrder.toUpperCase()}`;
      dataQuery += ` LIMIT ? OFFSET ?`;

      const [countResult] = await mysqlPool.execute(countQuery, queryParams) as any;
      const total = countResult[0].total;

      queryParams.push(limit, offset);
      const [companies] = await mysqlPool.execute(dataQuery, queryParams) as any;

      const response: CompanyResponse = {
        companies,
        total,
        page,
        totalPages: Math.ceil(total / limit),
        limit
      };

      res.json(response);
    } catch (error) {
      console.error("Error fetching companies:", error);
      res.status(500).json({ message: "Erro ao buscar empresas" });
    }
  });

  // NFe Recebidas routes
  app.get("/api/nfe-recebidas", authenticateToken, async (req, res) => {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 10;
      const search = req.query.search as string || '';
      const status = req.query.status as string || 'all';
      const empresa = req.query.empresa as string || '';
      const fornecedor = req.query.fornecedor as string || '';
      const dataInicio = req.query.dataInicio as string || '';
      const dataFim = req.query.dataFim as string || '';
      const sortBy = req.query.sortBy as keyof NFeRecebida || 'doc_date_emi';
      const sortOrder = req.query.sortOrder as 'asc' | 'desc' || 'desc';

      const offset = (page - 1) * limit;

      let countQuery = 'SELECT COUNT(*) as total FROM nfe_recebidas';
      let dataQuery = `SELECT doc_num, doc_dest_nome, doc_emit_nome, doc_emit_documento, doc_date_emi, doc_valor, doc_nat_op, doc_status_integracao, doc_id_integracao FROM nfe_recebidas`;
      const queryParams: any[] = [];
      const conditions: string[] = [];

      if (search) {
        conditions.push('(doc_num LIKE ? OR doc_dest_nome LIKE ? OR doc_emit_nome LIKE ? OR doc_emit_documento LIKE ?)');
        const searchParam = `%${search}%`;
        queryParams.push(searchParam, searchParam, searchParam, searchParam);
      }

      if (status !== 'all') {
        if (status === 'integrated') {
          conditions.push('doc_status_integracao = 1');
        } else if (status === 'not_integrated') {
          conditions.push('doc_status_integracao = 0');
        }
      }

      if (empresa) {
        conditions.push('doc_dest_nome LIKE ?');
        queryParams.push(`%${empresa}%`);
      }

      if (fornecedor) {
        conditions.push('doc_emit_nome LIKE ?');
        queryParams.push(`%${fornecedor}%`);
      }

      if (dataInicio) {
        conditions.push('DATE(doc_date_emi) >= ?');
        queryParams.push(dataInicio);
      }

      if (dataFim) {
        conditions.push('DATE(doc_date_emi) <= ?');
        queryParams.push(dataFim);
      }

      if (conditions.length > 0) {
        const whereClause = ' WHERE ' + conditions.join(' AND ');
        countQuery += whereClause;
        dataQuery += whereClause;
      }

      dataQuery += ` ORDER BY ${sortBy} ${sortOrder.toUpperCase()}`;
      dataQuery += ` LIMIT ? OFFSET ?`;

      const [countResult] = await mysqlPool.execute(countQuery, queryParams) as any;
      const total = countResult[0].total;

      queryParams.push(limit, offset);
      const [nfes] = await mysqlPool.execute(dataQuery, queryParams) as any;

      const response: NFeResponse = {
        nfes,
        total,
        page,
        totalPages: Math.ceil(total / limit),
        limit
      };

      res.json(response);
    } catch (error) {
      console.error("Error fetching NFe:", error);
      res.status(500).json({ message: "Erro ao buscar NFe recebidas" });
    }
  });

  // NFSe Recebidas routes
  app.get("/api/nfse-recebidas", authenticateToken, async (req, res) => {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 10;
      const search = req.query.search as string || '';
      const status = req.query.status as string || 'all';
      const empresa = req.query.empresa as string || '';
      const fornecedor = req.query.fornecedor as string || '';
      const local = req.query.local as string || '';
      const dataInicio = req.query.dataInicio as string || '';
      const dataFim = req.query.dataFim as string || '';
      const sortBy = req.query.sortBy as keyof NFSeRecebida || 'nfse_data_hora';
      const sortOrder = req.query.sortOrder as 'asc' | 'desc' || 'desc';

      const offset = (page - 1) * limit;

      let countQuery = 'SELECT COUNT(*) as total FROM nfse_recebidas';
      let dataQuery = `SELECT nfse_emitente, nfse_doc, nfse_tomador, nfse_tipo, nfse_local_prestacao, nfse_data_hora, nfse_valor_servico, nfse_status_integracao, nfse_id_integracao FROM nfse_recebidas`;
      const queryParams: any[] = [];
      const conditions: string[] = [];

      if (search) {
        conditions.push('(nfse_doc LIKE ? OR nfse_emitente LIKE ? OR nfse_tomador LIKE ?)');
        const searchParam = `%${search}%`;
        queryParams.push(searchParam, searchParam, searchParam);
      }

      if (status !== 'all') {
        if (status === 'integrated') {
          conditions.push('nfse_status_integracao = 1');
        } else if (status === 'not_integrated') {
          conditions.push('nfse_status_integracao = 0');
        }
      }

      if (empresa) {
        conditions.push('nfse_tomador LIKE ?');
        queryParams.push(`%${empresa}%`);
      }

      if (fornecedor) {
        conditions.push('nfse_emitente LIKE ?');
        queryParams.push(`%${fornecedor}%`);
      }

      if (local) {
        conditions.push('nfse_local_prestacao LIKE ?');
        queryParams.push(`%${local}%`);
      }

      if (dataInicio) {
        conditions.push('DATE(nfse_data_hora) >= ?');
        queryParams.push(dataInicio);
      }

      if (dataFim) {
        conditions.push('DATE(nfse_data_hora) <= ?');
        queryParams.push(dataFim);
      }

      if (conditions.length > 0) {
        const whereClause = ' WHERE ' + conditions.join(' AND ');
        countQuery += whereClause;
        dataQuery += whereClause;
      }

      dataQuery += ` ORDER BY ${sortBy} ${sortOrder.toUpperCase()}`;
      dataQuery += ` LIMIT ? OFFSET ?`;

      const [countResult] = await mysqlPool.execute(countQuery, queryParams) as any;
      const total = countResult[0].total;

      queryParams.push(limit, offset);
      const [nfses] = await mysqlPool.execute(dataQuery, queryParams) as any;

      const response: NFSeResponse = {
        nfses,
        total,
        page,
        totalPages: Math.ceil(total / limit),
        limit
      };

      res.json(response);
    } catch (error) {
      console.error("Error fetching NFSe:", error);
      res.status(500).json({ message: "Erro ao buscar NFSe recebidas" });
    }
  });

  // Dashboard stats
  app.get("/api/dashboard/stats", authenticateToken, async (req, res) => {
    try {
      const [totalCNPJResult] = await mysqlPool.execute('SELECT COUNT(DISTINCT company_cpf_cnpj) as total FROM empresa') as any;
      const [nfeRecebidasResult] = await mysqlPool.execute('SELECT COUNT(*) as total FROM nfe_recebidas') as any;
      const [nfeIntegradasResult] = await mysqlPool.execute('SELECT COUNT(*) as total FROM nfe_recebidas WHERE doc_status_integracao = 1') as any;
      const [nfseRecebidasResult] = await mysqlPool.execute('SELECT COUNT(*) as total FROM nfse_recebidas') as any;
      const [nfseIntegradasResult] = await mysqlPool.execute('SELECT COUNT(*) as total FROM nfse_recebidas WHERE nfse_status_integracao = 1') as any;
      const [fornecedoresSemERPResult] = await mysqlPool.execute('SELECT COUNT(*) as total FROM fornecedor WHERE codigo_erp IS NULL OR codigo_erp = ""') as any;

      res.json({
        totalCNPJ: totalCNPJResult[0].total,
        nfeRecebidas: nfeRecebidasResult[0].total,
        nfeIntegradas: nfeIntegradasResult[0].total,
        nfseRecebidas: nfseRecebidasResult[0].total,
        nfseIntegradas: nfseIntegradasResult[0].total,
        fornecedoresSemERP: fornecedoresSemERPResult[0].total
      });
    } catch (error) {
      console.error("Error fetching dashboard stats:", error);
      res.status(500).json({ message: "Erro ao buscar estatísticas" });
    }
  });

  // Dashboard chart data
  app.get("/api/dashboard/chart", authenticateToken, async (req, res) => {
    try {
      const period = req.query.period as string || 'week';
      
      let dateFormat = '';
      let dateInterval = '';
      
      switch (period) {
        case 'day':
          dateFormat = '%H:00';
          dateInterval = 'INTERVAL 24 HOUR';
          break;
        case 'week':
          dateFormat = '%d/%m';
          dateInterval = 'INTERVAL 7 DAY';
          break;
        case 'month':
          dateFormat = '%d/%m';
          dateInterval = 'INTERVAL 30 DAY';
          break;
        case 'year':
          dateFormat = '%m/%Y';
          dateInterval = 'INTERVAL 12 MONTH';
          break;
        default:
          dateFormat = '%d/%m';
          dateInterval = 'INTERVAL 7 DAY';
      }

      const query = `
        SELECT 
          DATE_FORMAT(data, '${dateFormat}') as date,
          SUM(nfe_count) as nfe,
          SUM(nfse_count) as nfse
        FROM (
          SELECT 
            DATE(doc_date_emi) as data,
            COUNT(*) as nfe_count,
            0 as nfse_count
          FROM nfe_recebidas 
          WHERE doc_date_emi >= DATE_SUB(NOW(), ${dateInterval})
          GROUP BY DATE(doc_date_emi)
          
          UNION ALL
          
          SELECT 
            DATE(nfse_data_hora) as data,
            0 as nfe_count,
            COUNT(*) as nfse_count
          FROM nfse_recebidas 
          WHERE nfse_data_hora >= DATE_SUB(NOW(), ${dateInterval})
          GROUP BY DATE(nfse_data_hora)
        ) combined
        GROUP BY data, date
        ORDER BY data
      `;

      const [chartData] = await mysqlPool.execute(query) as any;
      res.json(chartData);
    } catch (error) {
      console.error("Error fetching chart data:", error);
      res.status(500).json({ message: "Erro ao buscar dados do gráfico" });
    }
  });

  // Dashboard últimos documentos
  app.get("/api/dashboard/ultimos-documentos", authenticateToken, async (req, res) => {
    try {
      const query = `
        SELECT 
          CONCAT(tipo, ' ', numero) as tipo,
          emitente,
          valor,
          data,
          CASE 
            WHEN status = 1 THEN 'Integrado'
            ELSE 'Pendente'
          END as status
        FROM (
          SELECT 
            'NF-e' as tipo,
            doc_num as numero,
            doc_emit_nome as emitente,
            doc_valor as valor,
            doc_date_emi as data,
            doc_status_integracao as status
          FROM nfe_recebidas
          
          UNION ALL
          
          SELECT 
            'NFS-e' as tipo,
            nfse_doc as numero,
            nfse_emitente as emitente,
            nfse_valor_servico as valor,
            nfse_data_hora as data,
            nfse_status_integracao as status
          FROM nfse_recebidas
        ) combined
        ORDER BY data DESC
        LIMIT 5
      `;

      const [documents] = await mysqlPool.execute(query) as any;
      res.json(documents);
    } catch (error) {
      console.error("Error fetching últimos documentos:", error);
      res.status(500).json({ message: "Erro ao buscar últimos documentos" });
    }
  });

  // Dashboard CNPJs ativos
  app.get("/api/dashboard/cnpj-ativos", authenticateToken, async (req, res) => {
    try {
      const query = `
        SELECT DISTINCT
          company_cpf_cnpj as cnpj,
          company_name as nome,
          '2024-12-15' as ultimaCaptura,
          'Ativo' as status
        FROM empresa
        LIMIT 10
      `;

      const [cnpjs] = await mysqlPool.execute(query) as any;
      res.json(cnpjs);
    } catch (error) {
      console.error("Error fetching CNPJs ativos:", error);
      res.status(500).json({ message: "Erro ao buscar CNPJs ativos" });
    }
  });

  // Usuários routes
  app.get("/api/usuarios", authenticateToken, async (req, res) => {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 10;
      const search = req.query.search as string || '';
      const status = req.query.status as string || 'all';
      const sortBy = req.query.sortBy as string || 'id';
      const sortOrder = req.query.sortOrder as 'asc' | 'desc' || 'asc';

      const offset = (page - 1) * limit;
      const userId = req.user.id;

      // Buscar o tipo do usuário atual
      const currentUser = await storage.getUser(userId);
      if (!currentUser) {
        return res.status(404).json({ message: "Usuário não encontrado" });
      }

      const userType = currentUser.type;

      let whereConditions: any[] = [];
      let queryParams: any[] = [];

      // Controle de acesso baseado no tipo de usuário
      if (userType === 'user') {
        // Users só podem ver a si mesmos
        whereConditions.push('id = ?');
        queryParams.push(userId);
      } else if (userType === 'admin') {
        // Admins podem ver admin e user, mas não system
        whereConditions.push('type IN (?, ?)');
        queryParams.push('admin', 'user');
      }
      // System users podem ver todos (sem restrições)

      if (search) {
        whereConditions.push('(username LIKE ? OR email LIKE ? OR name LIKE ?)');
        const searchParam = `%${search}%`;
        queryParams.push(searchParam, searchParam, searchParam);
      }

      if (status !== 'all') {
        if (status === 'active') {
          whereConditions.push('status = ?');
          queryParams.push(1);
        } else if (status === 'inactive') {
          whereConditions.push('status = ?');
          queryParams.push(0);
        }
      }

      const whereClause = whereConditions.length > 0 ? ` WHERE ${whereConditions.join(' AND ')}` : '';

      const [countResult] = await db.execute(`SELECT COUNT(*) as total FROM users${whereClause}`, queryParams);
      const total = (countResult as any)[0].total;

      queryParams.push(limit, offset);
      const [usuarios] = await db.execute(
        `SELECT id, username as nome, email, type as tipo, status as ativo FROM users${whereClause} ORDER BY ${sortBy} ${sortOrder.toUpperCase()} LIMIT ? OFFSET ?`,
        queryParams
      );

      const response: UsuarioResponse = {
        usuarios: usuarios as Usuario[],
        total,
        page,
        totalPages: Math.ceil(total / limit),
        limit
      };

      res.json(response);
    } catch (error) {
      console.error("Error fetching usuarios:", error);
      res.status(500).json({ message: "Erro ao buscar usuários" });
    }
  });

  // Create usuario
  app.post("/api/usuarios", authenticateToken, async (req, res) => {
    try {
      const { nome, email, password, tipo, ativo } = req.body;
      const userId = req.user.id;

      // Buscar o tipo do usuário atual
      const currentUser = await storage.getUser(userId);
      if (!currentUser) {
        return res.status(404).json({ message: "Usuário não encontrado" });
      }

      const userType = currentUser.type;

      // Users não podem criar usuários
      if (userType === 'user') {
        return res.status(403).json({ message: "Usuários não têm permissão para criar outros usuários" });
      }

      // Validar campos obrigatórios
      if (!nome || !email || !password || !tipo) {
        return res.status(400).json({ message: "Todos os campos são obrigatórios" });
      }

      // Admins só podem criar users e admins
      if (userType === 'admin' && tipo === 'system') {
        return res.status(403).json({ message: "Admins não podem criar usuários do tipo system" });
      }

      // Verificar se email já existe
      const existingUser = await storage.getUserByEmail(email);
      if (existingUser) {
        return res.status(400).json({ message: "Email já está em uso" });
      }

      const hashedPassword = await bcrypt.hash(password, 10);
      
      const newUser = await storage.createUser({
        username: nome,
        email,
        password: hashedPassword,
        name: nome,
        type: tipo,
        status: ativo !== undefined ? ativo : 1
      });

      // Buscar código do cliente no MySQL
      let codigoCliente = '';
      let nomeEmpresa = '';
      try {
        const [clienteResult] = await mysqlPool.execute('SELECT codigo, nome_fantasia FROM cliente LIMIT 1') as any;
        if (clienteResult.length > 0) {
          codigoCliente = clienteResult[0].codigo || '';
          nomeEmpresa = clienteResult[0].nome_fantasia || '';
        }
      } catch (error) {
        console.warn('Erro ao buscar código do cliente:', error);
      }

      // Enviar email de boas-vindas com SendGrid em background
      sendWelcomeEmailSG({
        nome: newUser.name,
        email: newUser.email,
        senha: password, // Senha original antes do hash
        codigoCliente,
        nomeEmpresa
      }).catch(error => {
        console.error('Erro ao enviar email de boas-vindas:', error);
      });

      res.status(201).json({ 
        message: "Usuário criado com sucesso",
        usuario: {
          id: newUser.id,
          nome: newUser.username,
          email: newUser.email,
          tipo: newUser.type,
          ativo: newUser.status
        }
      });
    } catch (error) {
      console.error("Erro ao criar usuário:", error);
      res.status(500).json({ message: "Erro ao criar usuário" });
    }
  });

  // Update usuario
  app.put("/api/usuarios/:id", authenticateToken, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const { nome, email, password, tipo, ativo } = req.body;
      const userId = req.user.id;

      // Buscar o usuário atual
      const currentUser = await storage.getUser(userId);
      if (!currentUser) {
        return res.status(404).json({ message: "Usuário não encontrado" });
      }

      const userType = currentUser.type;

      // Users só podem editar a si mesmos
      if (userType === 'user' && userId !== id) {
        return res.status(403).json({ message: "Usuários só podem editar seu próprio perfil" });
      }

      // Buscar o usuário a ser editado
      const targetUser = await storage.getUser(id);
      if (!targetUser) {
        return res.status(404).json({ message: "Usuário não encontrado" });
      }

      // Admins não podem editar users do tipo system
      if (userType === 'admin' && targetUser.type === 'system') {
        return res.status(403).json({ message: "Admins não podem editar usuários do tipo system" });
      }

      // Preparar dados para atualização
      const updateData: any = {};
      if (nome) updateData.username = nome;
      if (email) updateData.email = email;
      if (password) updateData.password = await bcrypt.hash(password, 10);
      if (tipo && userType !== 'user') updateData.type = tipo; // Users não podem mudar o tipo
      if (ativo !== undefined && userType !== 'user') updateData.status = ativo; // Users não podem mudar status

      // Verificar se email já existe (se estiver sendo alterado)
      if (email && email !== targetUser.email) {
        const existingUser = await storage.getUserByEmail(email);
        if (existingUser && existingUser.id !== id) {
          return res.status(400).json({ message: "Email já está em uso" });
        }
      }

      // Atualizar usuário no banco de dados
      const [result] = await db.execute(
        `UPDATE users SET ${Object.keys(updateData).map(key => `${key} = ?`).join(', ')} WHERE id = ?`,
        [...Object.values(updateData), id]
      );

      res.json({ 
        message: "Usuário atualizado com sucesso",
        usuario: {
          id,
          nome: nome || targetUser.username,
          email: email || targetUser.email,
          tipo: updateData.type || targetUser.type,
          ativo: updateData.status !== undefined ? updateData.status : targetUser.status
        }
      });
    } catch (error) {
      console.error("Erro ao atualizar usuário:", error);
      res.status(500).json({ message: "Erro ao atualizar usuário" });
    }
  });

  // Delete usuario
  app.delete("/api/usuarios/:id", authenticateToken, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const userId = req.user.id;

      // Buscar o usuário atual
      const currentUser = await storage.getUser(userId);
      if (!currentUser) {
        return res.status(404).json({ message: "Usuário não encontrado" });
      }

      const userType = currentUser.type;

      // Users não podem deletar usuários
      if (userType === 'user') {
        return res.status(403).json({ message: "Usuários não têm permissão para deletar outros usuários" });
      }

      // Não permitir auto-exclusão
      if (userId === id) {
        return res.status(400).json({ message: "Não é possível deletar seu próprio usuário" });
      }

      // Buscar o usuário a ser deletado
      const targetUser = await storage.getUser(id);
      if (!targetUser) {
        return res.status(404).json({ message: "Usuário não encontrado" });
      }

      // Admins não podem deletar users do tipo system
      if (userType === 'admin' && targetUser.type === 'system') {
        return res.status(403).json({ message: "Admins não podem deletar usuários do tipo system" });
      }

      // Deletar usuário
      await db.execute('DELETE FROM users WHERE id = ?', [id]);

      res.json({ message: "Usuário deletado com sucesso" });
    } catch (error) {
      console.error("Erro ao deletar usuário:", error);
      res.status(500).json({ message: "Erro ao deletar usuário" });
    }
  });

  // Fornecedores routes
  app.get("/api/fornecedores", authenticateToken, async (req, res) => {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 10;
      const search = req.query.search as string || '';
      const nome = req.query.nome as string || '';
      const cnpj = req.query.cnpj as string || '';
      const sortBy = req.query.sortBy as string || 'data_cadastro';
      const sortOrder = req.query.sortOrder as 'asc' | 'desc' || 'desc';

      const offset = (page - 1) * limit;

      let countQuery = 'SELECT COUNT(*) as total FROM fornecedor';
      let dataQuery = `SELECT id, nome, cnpj, codigo_erp, data_cadastro FROM fornecedor`;
      const queryParams: any[] = [];
      const conditions: string[] = [];

      if (search) {
        conditions.push('(nome LIKE ? OR cnpj LIKE ?)');
        const searchParam = `%${search}%`;
        queryParams.push(searchParam, searchParam);
      }

      if (nome) {
        conditions.push('nome LIKE ?');
        queryParams.push(`%${nome}%`);
      }

      if (cnpj) {
        conditions.push('cnpj LIKE ?');
        queryParams.push(`%${cnpj}%`);
      }

      if (conditions.length > 0) {
        const whereClause = ' WHERE ' + conditions.join(' AND ');
        countQuery += whereClause;
        dataQuery += whereClause;
      }

      dataQuery += ` ORDER BY ${sortBy} ${sortOrder.toUpperCase()}`;
      dataQuery += ` LIMIT ? OFFSET ?`;

      const [countResult] = await mysqlPool.execute(countQuery, queryParams) as any;
      const total = countResult[0].total;

      queryParams.push(limit, offset);
      const [fornecedores] = await mysqlPool.execute(dataQuery, queryParams) as any;

      const response: FornecedorResponse = {
        fornecedores,
        total,
        page,
        totalPages: Math.ceil(total / limit),
        limit
      };

      res.json(response);
    } catch (error) {
      console.error("Error fetching fornecedores:", error);
      res.status(500).json({ message: "Erro ao buscar fornecedores" });
    }
  });

  // Test connections
  app.get("/api/test-connections", async (req, res) => {
    try {
      const mysqlConnected = await testMysqlConnection();
      
      res.json({
        mysql: mysqlConnected ? 'Connected' : 'Failed',
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error("Error testing connections:", error);
      res.status(500).json({ message: "Erro ao testar conexões" });
    }
  });

  return httpServer;
}