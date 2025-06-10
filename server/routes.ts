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
import { sendWelcomeEmail as sendWelcomeEmailResend } from "./resend-service";
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
  // Register endpoint
  app.post("/api/auth/register", async (req, res) => {
    try {
      // Verificar e criar tabela de usuários se necessário
      await storage.ensureUsersTableExists();
      
      const validatedData = registerSchema.parse(req.body);
      
      // Check if user already exists
      const existingUser = await storage.getUserByEmail(validatedData.email);
      if (existingUser) {
        return res.status(400).json({ message: "Email já está em uso" });
      }

      const existingUsername = await storage.getUserByUsername(validatedData.username);
      if (existingUsername) {
        return res.status(400).json({ message: "Nome de usuário já está em uso" });
      }

      // Hash password
      const saltRounds = 12;
      const hashedPassword = await bcrypt.hash(validatedData.password, saltRounds);

      // Create user
      const newUser = await storage.createUser({
        username: validatedData.username,
        email: validatedData.email,
        password: hashedPassword,
        name: validatedData.name,
        type: validatedData.type,
        status: 1,
      });

      // Buscar código do cliente no MySQL
      let codigoCliente = '';
      let nomeEmpresa = '';
      try {
        const [clienteResult] = await mysqlPool.execute('SELECT codigo, nome_fantasia as nome FROM cliente LIMIT 1') as any;
        if (clienteResult.length > 0) {
          codigoCliente = clienteResult[0].codigo || '';
          nomeEmpresa = clienteResult[0].nome || '';
        }
      } catch (error) {
        console.warn('Erro ao buscar código do cliente:', error);
      }

      // Enviar email de boas-vindas com Resend em background
      sendWelcomeEmailResend({
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
        return res.status(400).json({ 
          message: "Dados inválidos", 
          errors: error.errors 
        });
      }
      console.error("Registration error:", error);
      res.status(500).json({ message: "Erro interno do servidor" });
    }
  });

  // Login endpoint
  app.post("/api/auth/login", async (req, res) => {
    try {
      // Verificar e criar tabela de usuários se necessário
      await storage.ensureUsersTableExists();
      
      const validatedData = loginSchema.parse(req.body);

      // Find user by email
      const user = await storage.getUserByEmail(validatedData.email);
      if (!user) {
        return res.status(401).json({ message: "Email ou senha incorretos" });
      }

      // Verify password
      const isPasswordValid = await bcrypt.compare(validatedData.password, user.password);
      if (!isPasswordValid) {
        return res.status(401).json({ message: "Email ou senha incorretos" });
      }

      // Generate JWT token
      const token = jwt.sign(
        { id: user.id, email: user.email, username: user.username, type: user.type },
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
        return res.status(400).json({ 
          message: "Dados inválidos", 
          errors: error.errors 
        });
      }
      console.error("Login error:", error);
      res.status(500).json({ message: "Erro interno do servidor" });
    }
  });

  // Get current user endpoint
  app.get("/api/auth/me", authenticateToken, async (req: any, res) => {
    try {
      // Verificar e criar tabela de usuários se necessário
      await storage.ensureUsersTableExists();
      
      const user = await storage.getUser(req.user.id);
      if (!user) {
        return res.status(404).json({ message: "Usuário não encontrado" });
      }

      const { password, ...userWithoutPassword } = user;
      res.json({ user: userWithoutPassword });
    } catch (error) {
      console.error("Get user error:", error);
      res.status(500).json({ message: "Erro interno do servidor" });
    }
  });

  // Logout endpoint (client-side handles token removal)
  app.post("/api/auth/logout", authenticateToken, (req, res) => {
    res.json({ message: "Logout realizado com sucesso" });
  });

  // Test MySQL connection on startup
  await testMysqlConnection();

  // Companies endpoints
  app.get("/api/companies", authenticateToken, async (req: any, res) => {
    try {
      const {
        search = "",
        page = "1",
        limit = "10",
        sortBy = "company_id",
        sortOrder = "asc"
      } = req.query;

      const offset = (parseInt(page) - 1) * parseInt(limit);
      
      // Build search condition
      let searchCondition = "";
      const searchParams: any[] = [];
      
      if (search) {
        searchCondition = `WHERE 
          company_name LIKE ? OR 
          company_fantasy LIKE ? OR 
          company_cpf_cnpj LIKE ? OR 
          company_email LIKE ? OR 
          company_city LIKE ? OR 
          company_uf LIKE ?`;
        const searchTerm = `%${search}%`;
        searchParams.push(searchTerm, searchTerm, searchTerm, searchTerm, searchTerm, searchTerm);
      }

      // Count total records
      const countQuery = `SELECT COUNT(*) as total FROM company ${searchCondition}`;
      const [countResult] = await mysqlPool.execute(countQuery, searchParams) as any;
      const total = countResult[0].total;

      // Get companies with pagination and sorting
      const dataQuery = `
        SELECT 
          company_id,
          company_name,
          company_fantasy,
          company_cpf_cnpj,
          company_email,
          company_city,
          company_uf
        FROM company 
        ${searchCondition}
        ORDER BY ${sortBy} ${sortOrder.toUpperCase()}
        LIMIT ? OFFSET ?
      `;

      const [companies] = await mysqlPool.execute(dataQuery, [
        ...searchParams,
        parseInt(limit),
        offset
      ]) as any;

      const totalPages = Math.ceil(total / parseInt(limit));

      const response: CompanyResponse = {
        companies,
        total,
        page: parseInt(page),
        totalPages,
        limit: parseInt(limit)
      };

      res.json(response);
    } catch (error) {
      console.error("Companies fetch error:", error);
      res.status(500).json({ message: "Erro ao buscar empresas" });
    }
  });

  // Get single company
  app.get("/api/companies/:id", authenticateToken, async (req: any, res) => {
    try {
      const { id } = req.params;
      
      const query = `
        SELECT 
          company_id,
          company_name,
          company_fantasy,
          company_cpf_cnpj,
          company_email,
          company_city,
          company_uf
        FROM company 
        WHERE company_id = ?
      `;

      const [companies] = await mysqlPool.execute(query, [id]) as any;
      
      if (companies.length === 0) {
        return res.status(404).json({ message: "Empresa não encontrada" });
      }

      res.json({ company: companies[0] });
    } catch (error) {
      console.error("Company fetch error:", error);
      res.status(500).json({ message: "Erro ao buscar empresa" });
    }
  });

  // Update company
  app.put("/api/companies/:id", authenticateToken, async (req: any, res) => {
    try {
      const { id } = req.params;
      const { company_name, company_fantasy, company_cpf_cnpj, company_email, company_city, company_uf } = req.body;

      if (!company_name || !company_fantasy || !company_cpf_cnpj || !company_email || !company_city || !company_uf) {
        return res.status(400).json({ message: "Todos os campos são obrigatórios" });
      }

      const updateQuery = `
        UPDATE company 
        SET company_name = ?, company_fantasy = ?, company_cpf_cnpj = ?, company_email = ?, company_city = ?, company_uf = ?
        WHERE company_id = ?
      `;

      await mysqlPool.execute(updateQuery, [
        company_name, 
        company_fantasy, 
        company_cpf_cnpj, 
        company_email, 
        company_city, 
        company_uf, 
        parseInt(id)
      ]);

      res.json({ message: "Empresa atualizada com sucesso" });
    } catch (error) {
      console.error("Company update error:", error);
      res.status(500).json({ message: "Erro ao atualizar empresa" });
    }
  });

  // NFe Recebidas endpoints
  app.get("/api/nfe-recebidas", authenticateToken, async (req: any, res) => {
    try {
      console.log("NFe Recebidas - Starting request");
      const {
        search = "",
        status = "all",
        empresa = "",
        fornecedor = "",
        dataInicio = "",
        dataFim = "",
        page = "1",
        limit = "10",
        sortBy = "doc_num",
        sortOrder = "desc"
      } = req.query;
      
      console.log("NFe Recebidas - Query params:", { search, status, empresa, fornecedor, dataInicio, dataFim, page, limit, sortBy, sortOrder });

      const offset = (parseInt(page) - 1) * parseInt(limit);
      
      // Build search conditions
      let searchConditions: string[] = [];
      const searchParams: any[] = [];
      
      if (search) {
        searchConditions.push(`(
          doc_num LIKE ? OR 
          doc_dest_nome LIKE ? OR 
          doc_emit_nome LIKE ? OR 
          doc_emit_documento LIKE ? OR 
          doc_nat_op LIKE ? OR
          doc_id_integracao LIKE ?
        )`);
        const searchTerm = `%${search}%`;
        searchParams.push(searchTerm, searchTerm, searchTerm, searchTerm, searchTerm, searchTerm);
      }

      if (status !== "all") {
        if (status === "integrated") {
          searchConditions.push("doc_status_integracao = 1");
        } else if (status === "not_integrated") {
          searchConditions.push("doc_status_integracao = 0");
        }
      }

      if (empresa) {
        searchConditions.push("doc_dest_nome LIKE ?");
        searchParams.push(`%${empresa}%`);
      }

      if (fornecedor) {
        searchConditions.push("doc_emit_nome LIKE ?");
        searchParams.push(`%${fornecedor}%`);
      }

      if (dataInicio) {
        searchConditions.push("doc_date_emi >= ?");
        searchParams.push(dataInicio);
      }

      if (dataFim) {
        searchConditions.push("doc_date_emi <= ?");
        searchParams.push(dataFim);
      }

      const whereClause = searchConditions.length > 0 ? `WHERE ${searchConditions.join(" AND ")}` : "";

      // Count total records
      const countQuery = `SELECT COUNT(*) as total FROM doc ${whereClause}`;
      const [countResult] = await mysqlPool.execute(countQuery, searchParams) as any;
      const total = countResult[0].total;

      // Get NFes with pagination and sorting
      const dataQuery = `
        SELECT 
          doc_id,
          doc_num,
          doc_dest_nome,
          doc_emit_nome,
          doc_emit_documento,
          doc_date_emi,
          doc_valor,
          doc_nat_op,
          doc_status_integracao,
          doc_id_integracao,
          doc_codcfo
        FROM doc 
        ${whereClause}
        ORDER BY ${sortBy} ${sortOrder.toUpperCase()}
        LIMIT ${parseInt(limit)} OFFSET ${offset}
      `;

      const [nfes] = await mysqlPool.execute(dataQuery, searchParams) as any;

      const totalPages = Math.ceil(total / parseInt(limit));

      const response: NFeResponse = {
        nfes,
        total,
        page: parseInt(page),
        totalPages,
        limit: parseInt(limit)
      };

      res.json(response);
    } catch (error) {
      console.error("NFe fetch error:", error);
      res.status(500).json({ message: "Erro ao buscar NFe recebidas" });
    }
  });

  // Get single NFe
  app.get("/api/nfe-recebidas/:numero", authenticateToken, async (req: any, res) => {
    try {
      const { numero } = req.params;
      
      const query = `
        SELECT 
          doc_num,
          doc_dest_nome,
          doc_emit_nome,
          doc_emit_documento,
          doc_date_emi,
          doc_valor,
          doc_nat_op,
          doc_status_integracao,
          doc_id_integracao,
          doc_codcfo
        FROM doc 
        WHERE doc_num = ?
      `;

      const [nfes] = await mysqlPool.execute(query, [numero]) as any;
      
      if (nfes.length === 0) {
        return res.status(404).json({ message: "NFe não encontrada" });
      }

      res.json({ nfe: nfes[0] });
    } catch (error) {
      console.error("NFe fetch error:", error);
      res.status(500).json({ message: "Erro ao buscar NFe" });
    }
  });

  // NFSe Recebidas endpoints
  app.get("/api/nfse-recebidas", authenticateToken, async (req: any, res) => {
    try {
      const {
        search = "",
        status = "all",
        empresa = "",
        fornecedor = "",
        dataInicio = "",
        dataFim = "",
        page = "1",
        limit = "10",
        sortBy = "nfse_data_hora",
        sortOrder = "desc"
      } = req.query;

      const offset = (parseInt(page) - 1) * parseInt(limit);
      
      // Build search conditions (idêntico ao NFe Recebidas)
      let searchConditions: string[] = [];
      const searchParams: any[] = [];
      
      if (search) {
        searchConditions.push(`(
          nfse_emitente LIKE ? OR 
          nfse_doc LIKE ? OR 
          nfse_tomador LIKE ? OR 
          nfse_tipo LIKE ? OR 
          nfse_local_prestacao LIKE ? OR
          nfse_id_integracao LIKE ?
        )`);
        const searchTerm = `%${search}%`;
        searchParams.push(searchTerm, searchTerm, searchTerm, searchTerm, searchTerm, searchTerm);
      }

      if (status !== "all") {
        if (status === "integrated") {
          searchConditions.push("nfse_status_integracao = 1");
        } else if (status === "not_integrated") {
          searchConditions.push("nfse_status_integracao = 0");
        }
      }

      if (empresa) {
        searchConditions.push("nfse_tomador LIKE ?");
        searchParams.push(`%${empresa}%`);
      }

      if (fornecedor) {
        searchConditions.push("nfse_emitente LIKE ?");
        searchParams.push(`%${fornecedor}%`);
      }

      if (dataInicio) {
        searchConditions.push("DATE(nfse_data_hora) >= ?");
        searchParams.push(dataInicio);
      }

      if (dataFim) {
        searchConditions.push("DATE(nfse_data_hora) <= ?");
        searchParams.push(dataFim);
      }

      const whereClause = searchConditions.length > 0 ? `WHERE ${searchConditions.join(" AND ")}` : "";

      // Count total records
      const countQuery = `SELECT COUNT(*) as total FROM nfse ${whereClause}`;
      const [countResult] = await mysqlPool.execute(countQuery, searchParams) as any;
      const total = countResult[0].total;

      // Get NFSes with pagination and sorting  
      const dataQuery = `SELECT nfse_id, nfse_emitente, nfse_doc, nfse_tomador, nfse_tipo, nfse_local_prestacao, nfse_data_hora, nfse_valor_servico, nfse_status_integracao, nfse_id_integracao, nfse_codcfo FROM nfse ${whereClause} ORDER BY ${sortBy} ${sortOrder.toUpperCase()} LIMIT ${parseInt(limit)} OFFSET ${offset}`;
      
      const [nfses] = await mysqlPool.execute(dataQuery, searchParams) as any;

      const totalPages = Math.ceil(total / parseInt(limit));

      const response: NFSeResponse = {
        nfses: nfses,
        total,
        page: parseInt(page),
        totalPages,
        limit: parseInt(limit)
      };

      res.json(response);
    } catch (error) {
      console.error("Erro ao buscar NFSe recebidas:", error);
      res.status(500).json({ message: "Erro ao buscar NFSe recebidas" });
    }
  });

  // Usuários endpoints - PostgreSQL com Drizzle e controle de acesso
  app.get("/api/usuarios", authenticateToken, async (req: any, res) => {
    try {
      const {
        search = "",
        status = "all", 
        page = "1",
        limit = "10",
        sortBy = "name",
        sortOrder = "asc"
      } = req.query;

      const userType = req.user.type || 'user';
      const currentUserId = req.user.id;
      const offset = (parseInt(page) - 1) * parseInt(limit);
      
      // Construir condições WHERE usando Drizzle
      let whereConditions = [];

      // Controle de acesso baseado no tipo de usuário
      if (userType === 'user') {
        // Usuários do tipo 'user' só podem ver eles mesmos
        whereConditions.push(eq(users.id, currentUserId));
      } else if (userType === 'admin') {
        // Usuários do tipo 'admin' podem ver 'admin' e 'user'
        whereConditions.push(or(eq(users.type, 'admin'), eq(users.type, 'user')));
      }
      // Usuários do tipo 'system' podem ver todos (sem restrição)

      if (search) {
        whereConditions.push(
          or(
            ilike(users.name, `%${search}%`),
            ilike(users.email, `%${search}%`)
          )
        );
      }

      if (status !== "all") {
        const statusValue = status === "active" ? 1 : 0;
        whereConditions.push(eq(users.status, statusValue));
      }

      // Count total usando Drizzle
      const [countResult] = await db
        .select({ count: count() })
        .from(users)
        .where(whereConditions.length > 0 ? and(...whereConditions) : undefined);

      const total = countResult.count;

      // Buscar usuários usando Drizzle
      const orderByField = sortBy === "name" ? users.name : 
                          sortBy === "email" ? users.email :
                          sortBy === "type" ? users.type :
                          sortBy === "status" ? users.status : users.name;

      const orderDirection = sortOrder === "desc" ? desc(orderByField) : asc(orderByField);

      const allUsers = await db
        .select({
          id: users.id,
          name: users.name,
          email: users.email,
          type: users.type,
          status: users.status
        })
        .from(users)
        .where(whereConditions.length > 0 ? and(...whereConditions) : undefined)
        .orderBy(orderDirection)
        .limit(parseInt(limit))
        .offset(offset);

      const totalPages = Math.ceil(total / parseInt(limit));

      const response = {
        usuarios: allUsers.map((user: any) => ({
          id: user.id,
          nome: user.name,
          email: user.email,
          tipo: user.type || "user",
          ativo: user.status || 1
        })),
        total,
        page: parseInt(page),
        totalPages,
        limit: parseInt(limit)
      };

      res.json(response);
    } catch (error) {
      console.error("Erro ao buscar usuários:", error);
      res.status(500).json({ message: "Erro ao buscar usuários" });
    }
  });

  // Rota para criar usuário
  app.post("/api/usuarios", authenticateToken, async (req: any, res) => {
    try {
      const userType = req.user.type || 'user';
      
      // Apenas admins e system podem criar usuários
      if (userType !== 'admin' && userType !== 'system') {
        return res.status(403).json({ message: "Acesso negado" });
      }

      const { nome, email, password, tipo, ativo } = req.body;

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
        const [clienteResult] = await mysqlPool.execute('SELECT codigo, nome_fantasia as nome FROM cliente LIMIT 1') as any;
        if (clienteResult.length > 0) {
          codigoCliente = clienteResult[0].codigo || '';
          nomeEmpresa = clienteResult[0].nome || '';
        }
      } catch (error) {
        console.warn('Erro ao buscar código do cliente:', error);
      }

      // Enviar email de boas-vindas com Resend em background
      sendWelcomeEmailResend({
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

  // Rota para atualizar usuário
  app.put("/api/usuarios/:id", authenticateToken, async (req: any, res) => {
    try {
      const { id } = req.params;
      const userType = req.user.type || 'user';
      const currentUserId = req.user.id;
      
      // Users só podem editar eles mesmos
      if (userType === 'user' && parseInt(id) !== currentUserId) {
        return res.status(403).json({ message: "Acesso negado" });
      }

      const targetUser = await storage.getUser(parseInt(id));
      if (!targetUser) {
        return res.status(404).json({ message: "Usuário não encontrado" });
      }

      // Admins não podem editar usuários system
      if (userType === 'admin' && targetUser.type === 'system') {
        return res.status(403).json({ message: "Admins não podem editar usuários do tipo system" });
      }

      const { nome, email, password, tipo, ativo } = req.body;
      const updateData: any = {};

      if (nome) updateData.name = nome;
      if (email) {
        const existingUser = await storage.getUserByEmail(email);
        if (existingUser && existingUser.id !== parseInt(id)) {
          return res.status(400).json({ message: "Email já está em uso" });
        }
        updateData.email = email;
      }
      if (password) updateData.password = await bcrypt.hash(password, 10);
      
      // Users não podem alterar tipo e status
      if (userType !== 'user') {
        if (tipo !== undefined) {
          // Admins não podem criar/alterar para system
          if (userType === 'admin' && tipo === 'system') {
            return res.status(403).json({ message: "Admins não podem alterar usuários para tipo system" });
          }
          updateData.type = tipo;
        }
        if (ativo !== undefined) updateData.status = ativo;
      }

      await db.update(users)
        .set(updateData)
        .where(eq(users.id, parseInt(id)));

      res.json({ message: "Usuário atualizado com sucesso" });
    } catch (error) {
      console.error("Erro ao atualizar usuário:", error);
      res.status(500).json({ message: "Erro ao atualizar usuário" });
    }
  });

  // Rota para excluir usuário
  app.delete("/api/usuarios/:id", authenticateToken, async (req: any, res) => {
    try {
      const { id } = req.params;
      const userType = req.user.type || 'user';
      const currentUserId = req.user.id;
      
      // Users não podem excluir usuários
      if (userType === 'user') {
        return res.status(403).json({ message: "Acesso negado" });
      }

      // Não pode excluir a si mesmo
      if (parseInt(id) === currentUserId) {
        return res.status(400).json({ message: "Não é possível excluir seu próprio usuário" });
      }

      const targetUser = await storage.getUser(parseInt(id));
      if (!targetUser) {
        return res.status(404).json({ message: "Usuário não encontrado" });
      }

      // Admins não podem excluir usuários system
      if (userType === 'admin' && targetUser.type === 'system') {
        return res.status(403).json({ message: "Admins não podem excluir usuários do tipo system" });
      }

      await db.delete(users).where(eq(users.id, parseInt(id)));

      res.json({ message: "Usuário excluído com sucesso" });
    } catch (error) {
      console.error("Erro ao excluir usuário:", error);
      res.status(500).json({ message: "Erro ao excluir usuário" });
    }
  });

  // Dashboard endpoints
  app.get("/api/dashboard/stats", authenticateToken, async (req: any, res) => {
    try {
      // Consultas para obter estatísticas usando as tabelas corretas
      const [totalCNPJResult] = await mysqlPool.execute('SELECT COUNT(*) as total FROM company') as any;
      const [nfeRecebidasResult] = await mysqlPool.execute('SELECT COUNT(*) as total FROM doc') as any;
      const [nfeIntegradasResult] = await mysqlPool.execute('SELECT COUNT(*) as total FROM doc WHERE doc_status_integracao = 1') as any;
      const [nfseRecebidasResult] = await mysqlPool.execute('SELECT COUNT(*) as total FROM nfse') as any;
      const [nfseIntegradasResult] = await mysqlPool.execute('SELECT COUNT(*) as total FROM nfse WHERE nfse_status_integracao = 1') as any;
      const [fornecedoresSemERPResult] = await mysqlPool.execute('SELECT COUNT(*) as total FROM simplefcfo WHERE codigo_erp IS NULL OR codigo_erp = ""') as any;

      const stats = {
        totalCNPJ: totalCNPJResult[0]?.total || 0,
        nfeRecebidas: nfeRecebidasResult[0]?.total || 0,
        nfeIntegradas: nfeIntegradasResult[0]?.total || 0,
        nfseRecebidas: nfseRecebidasResult[0]?.total || 0,
        nfseIntegradas: nfseIntegradasResult[0]?.total || 0,
        fornecedoresSemERP: fornecedoresSemERPResult[0]?.total || 0
      };

      res.json(stats);
    } catch (error) {
      console.error('Erro ao obter estatísticas do dashboard:', error);
      res.status(500).json({ message: 'Erro interno do servidor' });
    }
  });

  // Rota para obter dados do gráfico de barras - Resumo dos Documentos Fiscais
  app.get("/api/dashboard/chart", authenticateToken, async (req: any, res) => {
    try {
      const { period = 'daily' } = req.query;
      let dateFormat, docGroupBy, nfseGroupBy, interval;
      
      switch (period) {
        case 'daily':
          dateFormat = '%d/%m';
          docGroupBy = 'DATE(doc_date_emi)';
          nfseGroupBy = 'DATE(nfse_data_hora)';
          interval = '7 DAY';
          break;
        case 'weekly':
          dateFormat = 'Sem %u';
          docGroupBy = 'YEARWEEK(doc_date_emi)';
          nfseGroupBy = 'YEARWEEK(nfse_data_hora)';
          interval = '8 WEEK';
          break;
        case 'monthly':
          dateFormat = '%m/%Y';
          docGroupBy = 'YEAR(doc_date_emi), MONTH(doc_date_emi)';
          nfseGroupBy = 'YEAR(nfse_data_hora), MONTH(nfse_data_hora)';
          interval = '12 MONTH';
          break;
        case 'yearly':
          dateFormat = '%Y';
          docGroupBy = 'YEAR(doc_date_emi)';
          nfseGroupBy = 'YEAR(nfse_data_hora)';
          interval = '5 YEAR';
          break;
        default:
          dateFormat = '%d/%m';
          docGroupBy = 'DATE(doc_date_emi)';
          nfseGroupBy = 'DATE(nfse_data_hora)';
          interval = '7 DAY';
      }

      // Consulta dados da tabela DOC (NFe)
      const [docData] = await mysqlPool.execute(`
        SELECT 
          DATE_FORMAT(doc_date_emi, ?) as date, 
          COUNT(*) as count 
        FROM doc 
        WHERE doc_date_emi IS NOT NULL 
          AND doc_date_emi >= DATE_SUB(NOW(), INTERVAL ${interval})
        GROUP BY ${docGroupBy}
        ORDER BY doc_date_emi DESC
        LIMIT 15
      `, [dateFormat]) as any;

      // Consulta dados da tabela NFSE
      const [nfseData] = await mysqlPool.execute(`
        SELECT 
          DATE_FORMAT(nfse_data_hora, ?) as date, 
          COUNT(*) as count 
        FROM nfse 
        WHERE nfse_data_hora IS NOT NULL 
          AND nfse_data_hora >= DATE_SUB(NOW(), INTERVAL ${interval})
        GROUP BY ${nfseGroupBy}
        ORDER BY nfse_data_hora DESC
        LIMIT 15
      `, [dateFormat]) as any;

      // Combina os dados das duas tabelas
      const dateMap: any = {};

      // Processa dados da tabela DOC (NFe)
      docData.forEach((item: any) => {
        dateMap[item.date] = { date: item.date, nfe: item.count, nfse: 0 };
      });

      // Processa dados da tabela NFSE
      nfseData.forEach((item: any) => {
        if (dateMap[item.date]) {
          dateMap[item.date].nfse = item.count;
        } else {
          dateMap[item.date] = { date: item.date, nfe: 0, nfse: item.count };
        }
      });

      // Converte para array e ordena por data
      const chartData = Object.values(dateMap).sort((a: any, b: any) => {
        return a.date.localeCompare(b.date);
      });

      res.json(chartData);
    } catch (error) {
      console.error('Erro ao obter dados do gráfico:', error);
      res.status(500).json({ message: 'Erro interno do servidor' });
    }
  });

  // Rota para obter últimos documentos
  app.get("/api/dashboard/ultimos-documentos", authenticateToken, async (req: any, res) => {
    try {
      const [nfeData] = await mysqlPool.execute(`
        SELECT 'NF-e' as tipo, doc_emit_nome as emitente, doc_valor as valor, 
               doc_date_emi as data, 
               CASE WHEN doc_status_integracao = 1 THEN 'Integrado' ELSE 'Não Integrado' END as status,
               doc_num as numero
        FROM doc 
        ORDER BY doc_date_emi DESC 
        LIMIT 5
      `) as any;

      const [nfseData] = await mysqlPool.execute(`
        SELECT 'NFS-e' as tipo, nfse_emitente as emitente, nfse_valor_servico as valor,
               nfse_data_hora as data,
               CASE WHEN nfse_status_integracao = 1 THEN 'Integrado' ELSE 'Não Integrado' END as status,
               nfse_doc as numero
        FROM nfse 
        ORDER BY nfse_data_hora DESC 
        LIMIT 5
      `) as any;

      const documentos = [...nfeData, ...nfseData]
        .map(doc => ({
          tipo: `${doc.tipo} ${doc.numero}`,
          emitente: doc.emitente,
          valor: doc.valor,
          data: doc.data,
          status: doc.status
        }))
        .sort((a, b) => new Date(b.data).getTime() - new Date(a.data).getTime())
        .slice(0, 10);

      res.json(documentos);
    } catch (error) {
      console.error('Erro ao obter últimos documentos:', error);
      res.status(500).json({ message: 'Erro interno do servidor' });
    }
  });

  // Rota para obter CNPJs ativos
  app.get("/api/dashboard/cnpj-ativos", authenticateToken, async (req: any, res) => {
    try {
      const [cnpjData] = await mysqlPool.execute(`
        SELECT company_cpf_cnpj as cnpj, company_name as nome, 
               'Ativo' as status, NOW() as ultimaCaptura
        FROM company 
        ORDER BY company_name 
        LIMIT 10
      `) as any;

      res.json(cnpjData);
    } catch (error) {
      console.error('Erro ao obter CNPJs ativos:', error);
      res.status(500).json({ message: 'Erro interno do servidor' });
    }
  });

  // Rota para buscar fornecedores
  app.get("/api/fornecedores", authenticateToken, async (req: any, res) => {
    try {
      const {
        search = "",
        page = "1",
        limit = "10",
        sortBy = "data_cadastro",
        sortOrder = "desc"
      } = req.query;

      const offset = (parseInt(page) - 1) * parseInt(limit);
      
      // Build search conditions
      let whereClause = "";
      const queryParams: any[] = [];

      if (search) {
        whereClause = "WHERE (nome LIKE ? OR cnpj LIKE ? OR codigo_erp LIKE ?)";
        queryParams.push(`%${search}%`, `%${search}%`, `%${search}%`);
      }

      // Count total records
      const countQuery = `SELECT COUNT(*) as total FROM simplefcfo ${whereClause}`;
      const [countResult] = await mysqlPool.execute(countQuery, queryParams) as any;
      const total = countResult[0].total;

      // Get fornecedores with pagination and sorting  
      const dataQuery = `SELECT id, nome, cnpj, codigo_erp, data_cadastro FROM simplefcfo ${whereClause} ORDER BY ${sortBy} ${sortOrder.toUpperCase()} LIMIT ${parseInt(limit)} OFFSET ${offset}`;
      
      const [fornecedores] = await mysqlPool.execute(dataQuery, queryParams) as any;

      const totalPages = Math.ceil(total / parseInt(limit));

      const response = {
        fornecedores: fornecedores,
        total,
        page: parseInt(page),
        totalPages,
        limit: parseInt(limit)
      };

      res.json(response);
    } catch (error) {
      console.error("Erro ao buscar fornecedores:", error);
      res.status(500).json({ message: "Erro ao buscar fornecedores" });
    }
  });

  // Rota para verificar cadastro no ERP
  app.post("/api/fornecedores/verificar-erp", authenticateToken, async (req: any, res) => {
    try {
      const { fornecedorId, cnpj } = req.body;

      // Validação básica
      if (!fornecedorId || !cnpj) {
        return res.status(400).json({ message: "ID do fornecedor e CNPJ são obrigatórios" });
      }

      // Verificar se o fornecedor existe
      const checkQuery = "SELECT id, nome, cnpj FROM simplefcfo WHERE id = ?";
      const [existing] = await mysqlPool.execute(checkQuery, [fornecedorId]) as any;
      
      if (!existing || existing.length === 0) {
        return res.status(404).json({ message: "Fornecedor não encontrado" });
      }

      const fornecedor = existing[0];

      try {
        // Fazer consulta ao webhook
        const webhookUrl = `https://webhook-n8n.simpleit.app.br/webhook/3f78d932-bba2-426b-995c-42dedea1c8ef?cnpj=${encodeURIComponent(cnpj)}`;
        
        console.log(`Consultando webhook para CNPJ: ${cnpj}`);
        
        const webhookResponse = await fetch(webhookUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          }
        });

        console.log(`Webhook response status: ${webhookResponse.status}`);

        if (webhookResponse.ok) {
          // Verificar se a resposta tem conteúdo
          const responseText = await webhookResponse.text();
          console.log(`Webhook response text: ${responseText}`);
          
          let webhookData = null;
          
          // Tentar fazer parse do JSON apenas se houver conteúdo
          if (responseText && responseText.trim() !== '') {
            try {
              webhookData = JSON.parse(responseText);
            } catch (jsonError) {
              console.error("Erro ao fazer parse do JSON:", jsonError);
              console.log("Response text que causou erro:", responseText);
            }
          }
          
          // Verificar se retornou CODCFO
          if (webhookData && webhookData.CODCFO) {
            // Fornecedor cadastrado no ERP - excluir da tabela
            const deleteQuery = "DELETE FROM simplefcfo WHERE id = ?";
            await mysqlPool.execute(deleteQuery, [fornecedorId]);
            
            console.log(`Fornecedor ${fornecedorId} removido da tabela - CODCFO: ${webhookData.CODCFO}`);
            
            res.json({ 
              cadastrado: true, 
              message: "Fornecedor cadastrado no ERP",
              codcfo: webhookData.CODCFO
            });
          } else {
            // Não retornou CODCFO ou resposta vazia
            res.json({ 
              cadastrado: false, 
              message: "Fornecedor não foi encontrado no ERP" 
            });
          }
        } else {
          // Webhook retornou erro
          console.log(`Webhook retornou erro: ${webhookResponse.status} - ${webhookResponse.statusText}`);
          res.json({ 
            cadastrado: false, 
            message: "Fornecedor não foi encontrado no ERP" 
          });
        }
      } catch (webhookError) {
        console.error("Erro ao consultar webhook:", webhookError);
        // Se houver erro no webhook, assumir que não está cadastrado
        res.json({ 
          cadastrado: false, 
          message: "Erro ao consultar o ERP. Tente novamente." 
        });
      }
    } catch (error) {
      console.error("Erro ao verificar cadastro no ERP:", error);
      res.status(500).json({ message: "Erro ao verificar cadastro no ERP" });
    }
  });

  // Rota para download de XML da NFe via API externa
  app.get("/api/nfe-download/:doc_id", authenticateToken, async (req: any, res) => {
    try {
      const { doc_id } = req.params;
      const apiUrl = `https://roboeac.simpledfe.com.br/api/doc_download_api.php?doc_id=${doc_id}`;
      
      // Fazer a chamada para a API externa
      const response = await fetch(apiUrl);
      
      if (!response.ok) {
        throw new Error(`Erro na API externa: ${response.status}`);
      }
      
      // Extrair o nome do arquivo do cabeçalho Content-Disposition
      const contentDisposition = response.headers.get('content-disposition');
      let filename = `nfe_${doc_id}.xml`; // fallback
      
      if (contentDisposition) {
        const filenameMatch = contentDisposition.match(/filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/);
        if (filenameMatch) {
          filename = filenameMatch[1].replace(/['"]/g, '');
        }
      }
      
      // Encaminhar o arquivo para o cliente
      const buffer = await response.arrayBuffer();
      
      res.setHeader('Content-Type', response.headers.get('content-type') || 'application/xml');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      res.send(Buffer.from(buffer));
      
    } catch (error) {
      console.error("Erro ao baixar XML da NFe:", error);
      res.status(500).json({ message: "Erro ao baixar XML da NFe" });
    }
  });

  // Rota para download de XML da NFSe via API externa
  app.get("/api/nfse-download/:nfse_id", authenticateToken, async (req: any, res) => {
    try {
      const { nfse_id } = req.params;
      const apiUrl = `https://roboeac.simpledfe.com.br/api/nfse_download_api.php?nfse_id=${nfse_id}`;
      
      // Fazer a chamada para a API externa
      const response = await fetch(apiUrl);
      
      if (!response.ok) {
        throw new Error(`Erro na API externa: ${response.status}`);
      }
      
      // Extrair o nome do arquivo do cabeçalho Content-Disposition
      const contentDisposition = response.headers.get('content-disposition');
      let filename = `nfse_${nfse_id}.xml`; // fallback
      
      if (contentDisposition) {
        const filenameMatch = contentDisposition.match(/filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/);
        if (filenameMatch) {
          filename = filenameMatch[1].replace(/['"]/g, '');
        }
      }
      
      // Encaminhar o arquivo para o cliente
      const buffer = await response.arrayBuffer();
      
      res.setHeader('Content-Type', response.headers.get('content-type') || 'application/xml');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      res.send(Buffer.from(buffer));
      
    } catch (error) {
      console.error("Erro ao baixar XML da NFSe:", error);
      res.status(500).json({ message: "Erro ao baixar XML da NFSe" });
    }
  });

  // Rota para gerar e exibir DANFE da NFe
  app.get("/api/nfe-danfe/:doc_id", authenticateToken, async (req: any, res) => {
    try {
      const { doc_id } = req.params;
      
      // Primeiro, baixar o XML da API externa
      const apiUrl = `https://roboeac.simpledfe.com.br/api/doc_download_api.php?doc_id=${doc_id}`;
      const response = await fetch(apiUrl);
      
      if (!response.ok) {
        throw new Error(`Erro ao baixar XML da API externa: ${response.status}`);
      }
      
      const xmlContent = await response.text();
      
      // Importar a função para gerar DANFE
      const { generateDANFE } = await import('./danfe-utils');
      
      // Gerar o PDF do DANFE
      const result = await generateDANFE(xmlContent);
      
      if (!result.success) {
        throw new Error(`Erro ao gerar DANFE: ${result.error}`);
      }
      
      // Ler o arquivo PDF gerado
      const fs = await import('fs');
      const pdfBuffer = fs.readFileSync(result.pdfPath!);
      
      // Definir headers para exibir o PDF no navegador
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `inline; filename="danfe_${doc_id}.pdf"`);
      res.send(pdfBuffer);
      
      // Limpar arquivo temporário
      fs.unlinkSync(result.pdfPath!);
      
    } catch (error) {
      console.error("Erro ao gerar DANFE:", error);
      res.status(500).json({ message: "Erro ao gerar DANFE", error: (error as Error).message });
    }
  });

  // Rota para gerar e exibir DANFSe da NFSe
  app.get("/api/nfse-danfse/:nfse_id", authenticateToken, async (req: any, res) => {
    try {
      const { nfse_id } = req.params;
      console.log('DANFSe - Requisição recebida para NFSe ID:', nfse_id);
      
      // Buscar o XML da NFSe na base de dados MySQL
      const query = "SELECT nfse_xml FROM nfse WHERE nfse_id = ?";
      console.log('Executando query MySQL:', query);
      
      const [results] = await mysqlPool.execute(query, [nfse_id]) as any[];
      console.log('Query executada, resultados:', results?.length || 0, 'registros');
      
      if (!results || results.length === 0) {
        console.log('NFSe não encontrada para ID:', nfse_id);
        return res.status(404).json({ message: "NFSe não encontrada" });
      }
      
      let xmlContent = results[0].nfse_xml;
      
      if (!xmlContent) {
        console.log('XML da NFSe não encontrado para ID:', nfse_id);
        return res.status(404).json({ message: "XML da NFSe não encontrado" });
      }
      
      // Converter para string se for Buffer
      if (Buffer.isBuffer(xmlContent)) {
        xmlContent = xmlContent.toString('utf-8');
        console.log('XML convertido de Buffer para string');
      } else if (typeof xmlContent !== 'string') {
        xmlContent = String(xmlContent);
        console.log('XML convertido para string, tipo original:', typeof results[0].nfse_xml);
      }
      
      console.log('XML encontrado, tamanho:', xmlContent.length, 'caracteres');
      console.log('Primeiros 100 caracteres do XML:', xmlContent.substring(0, 100));
      
      // Importar e usar a função para gerar DANFSe layout final
      const { generateDANFSE } = await import('./danfse-layout-final');
      
      // Gerar o PDF da DANFSe
      console.log('Iniciando geração da DANFSe...');
      const result = await generateDANFSE(xmlContent);
      
      if (!result.success) {
        console.error('Erro ao gerar DANFSe:', result.error);
        throw new Error(`Erro ao gerar DANFSe: ${result.error}`);
      }
      
      console.log('DANFSe gerada com sucesso:', result.pdfPath);
      
      // Ler o arquivo PDF gerado
      const fs = await import('fs');
      const pdfBuffer = fs.readFileSync(result.pdfPath!);
      
      console.log('PDF lido, tamanho:', pdfBuffer.length, 'bytes');
      
      // Definir headers para exibir o PDF no navegador
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `inline; filename="danfse_${nfse_id}.pdf"`);
      res.send(pdfBuffer);
      
      // Limpar arquivo temporário
      fs.unlinkSync(result.pdfPath!);
      console.log('Arquivo temporário removido');
      
    } catch (error) {
      console.error("Erro ao gerar DANFSe:", error);
      res.status(500).json({ message: "Erro ao gerar DANFSe", error: (error as Error).message });
    }
  });

  // Rota para gerar relatório de NFe
  app.post("/api/relatorios/nfe-resumo", authenticateToken, async (req: any, res) => {
    try {
      const { dataInicial, dataFinal, empresa } = req.body;
      
      // Primeiro, vamos verificar qual é o nome correto da tabela
      const [tables] = await mysqlPool.execute('SHOW TABLES') as any;
      console.log('Tabelas disponíveis:', tables);
      
      // Buscar tabelas relacionadas a NFe
      const nfeTables = tables.filter((table: any) => 
        Object.values(table)[0].toString().toLowerCase().includes('nfe')
      );
      console.log('Tabelas NFe encontradas:', nfeTables);
      
      let query = `
        SELECT 
          n.numero as numero_nfe,
          n.data_emissao,
          n.nome_emitente as fornecedor,
          n.cnpj_emitente as cnpj_fornecedor,
          n.valor_total as valor_total_nfe,
          c.nome as empresa_tomadora,
          c.cnpj as cnpj_tomadora
        FROM nfe n
        LEFT JOIN cliente c ON n.codigo_cliente = c.codigo
        WHERE n.data_emissao BETWEEN ? AND ?
      `;
      
      const params = [dataInicial, dataFinal];
      
      if (empresa && empresa !== 'all') {
        query += ' AND c.cnpj = ?';
        params.push(empresa);
      }
      
      query += ' ORDER BY c.nome, nfe.data_emissao';
      
      const [results] = await mysqlPool.execute(query, params) as any;
      
      // Agrupar por empresa
      const empresas = new Map();
      let totalGeral = 0;
      
      results.forEach((nfe: any) => {
        const empresaKey = nfe.cnpj_tomadora || 'sem_empresa';
        if (!empresas.has(empresaKey)) {
          empresas.set(empresaKey, {
            nome: nfe.empresa_tomadora || 'Empresa não identificada',
            cnpj: nfe.cnpj_tomadora || '',
            nfes: [],
            total: 0
          });
        }
        
        const empresa = empresas.get(empresaKey);
        empresa.nfes.push({
          numero: nfe.numero_nfe,
          dataEmissao: nfe.data_emissao,
          fornecedor: nfe.fornecedor,
          cnpjFornecedor: nfe.cnpj_fornecedor,
          valor: parseFloat(nfe.valor_total_nfe) || 0
        });
        empresa.total += parseFloat(nfe.valor_total_nfe) || 0;
        totalGeral += parseFloat(nfe.valor_total_nfe) || 0;
      });
      
      // Gerar PDF
      const { generateNFeRelatorioPDF } = await import('./nfe-relatorio-generator');
      const pdfResult = await generateNFeRelatorioPDF({
        dataInicial,
        dataFinal,
        empresas: Array.from(empresas.values()),
        totalGeral
      });
      
      if (!pdfResult.success) {
        throw new Error(pdfResult.error);
      }
      
      // Ler e enviar o PDF
      const fs = await import('fs');
      const pdfBuffer = fs.readFileSync(pdfResult.pdfPath!);
      
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="relatorio_nfe_${dataInicial}_${dataFinal}.pdf"`);
      res.send(pdfBuffer);
      
      // Limpar arquivo temporário
      fs.unlinkSync(pdfResult.pdfPath!);
      
    } catch (error) {
      console.error("Erro ao gerar relatório de NFe:", error);
      res.status(500).json({ message: "Erro ao gerar relatório", error: (error as Error).message });
    }
  });

  // Rota de teste para envio de email
  app.post("/api/test-email", authenticateToken, async (req: any, res) => {
    try {
      const { email, name } = req.body;
      const success = await sendWelcomeEmail(name || "Teste", email || "simpleit.solucoes@gmail.com");
      
      if (success) {
        res.json({ message: "Email de teste enviado com sucesso!" });
      } else {
        res.status(500).json({ message: "Erro ao enviar email de teste" });
      }
    } catch (error) {
      console.error("Erro no teste de email:", error);
      res.status(500).json({ message: "Erro interno do servidor" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
