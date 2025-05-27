import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { loginSchema, registerSchema, type Company, type CompanyFilters, type CompanyResponse } from "@shared/schema";
import { z } from "zod";
import { mysqlPool, testMysqlConnection } from "./mysql-config";

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

  const httpServer = createServer(app);
  return httpServer;
}
