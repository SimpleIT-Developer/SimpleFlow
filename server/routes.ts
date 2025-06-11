import type { Express } from "express";
import { storage } from "./storage";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { loginSchema, registerSchema, users, type Usuario, type UsuarioResponse, type DashboardStats, type FluxoCaixaData, type UltimosLancamentos } from "@shared/schema";
import { z } from "zod";
import { db } from "./db";
import { sendWelcomeEmail } from "./email-service";
import { sendWelcomeEmail as sendWelcomeEmailResend } from "./resend-service";
import { eq, ilike, or, and, count, desc, asc } from "drizzle-orm";

const JWT_SECRET = process.env.JWT_SECRET || "your-secret-key-change-in-production";

// Middleware para verificar JWT token
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

import { createServer } from "http";

export function registerRoutes(app: Express) {
  // Rota de registro
  app.post("/api/auth/register", async (req, res) => {
    try {
      const result = registerSchema.safeParse(req.body);
      if (!result.success) {
        return res.status(400).json({ message: "Dados inválidos", errors: result.error.errors });
      }

      const { username, email, password, name, type } = result.data;

      // Verificar se usuário já existe
      const existingUser = await storage.getUserByEmail(email);
      if (existingUser) {
        return res.status(400).json({ message: "Email já está em uso" });
      }

      // Hash da senha
      const hashedPassword = await bcrypt.hash(password, 10);

      // Criar usuário
      const user = await storage.createUser({
        username,
        email,
        password: hashedPassword,
        name,
        type: type || 'user',
        status: 1
      });

      // Enviar email de boas-vindas (opcional)
      try {
        if (process.env.RESEND_API_KEY) {
          await sendWelcomeEmailResend({ nome: name, email, senha: 'Definida pelo usuário' });
        } else {
          console.log("Resend API key não configurada - email não enviado");
        }
      } catch (emailError) {
        console.log("Erro ao enviar email de boas-vindas:", emailError);
      }

      // Gerar token JWT
      const token = jwt.sign(
        { userId: user.id, email: user.email, type: user.type },
        JWT_SECRET,
        { expiresIn: '24h' }
      );

      res.status(201).json({
        message: "Usuário criado com sucesso",
        user: { id: user.id, username: user.username, email: user.email, name: user.name, type: user.type },
        token
      });
    } catch (error) {
      console.error("Register error:", error);
      res.status(500).json({ message: "Erro interno do servidor" });
    }
  });

  // Rota de login
  app.post("/api/auth/login", async (req, res) => {
    try {
      const result = loginSchema.safeParse(req.body);
      if (!result.success) {
        return res.status(400).json({ message: "Dados inválidos" });
      }

      const { email, password } = result.data;

      const user = await storage.getUserByEmail(email);
      if (!user) {
        return res.status(401).json({ message: "Credenciais inválidas" });
      }

      const isPasswordValid = await bcrypt.compare(password, user.password);
      if (!isPasswordValid) {
        return res.status(401).json({ message: "Credenciais inválidas" });
      }

      const token = jwt.sign(
        { userId: user.id, email: user.email, type: user.type },
        JWT_SECRET,
        { expiresIn: '24h' }
      );

      res.json({
        message: "Login realizado com sucesso",
        user: { id: user.id, username: user.username, email: user.email, name: user.name, type: user.type },
        token
      });
    } catch (error) {
      console.error("Login error:", error);
      res.status(500).json({ message: "Erro interno do servidor" });
    }
  });

  // Rota para verificar se usuário está autenticado
  app.get("/api/auth/me", authenticateToken, async (req: any, res) => {
    try {
      const user = await storage.getUserByEmail(req.user.email);
      if (!user) {
        return res.status(404).json({ message: "Usuário não encontrado" });
      }

      res.json({
        user: { id: user.id, username: user.username, email: user.email, name: user.name, type: user.type }
      });
    } catch (error) {
      console.error("Auth verification error:", error);
      res.status(500).json({ message: "Erro interno do servidor" });
    }
  });

  // Rota de logout
  app.post("/api/auth/logout", authenticateToken, (req: any, res) => {
    res.json({ message: "Logout realizado com sucesso" });
  });

  // === ROTAS DO DASHBOARD DE FLUXO DE CAIXA ===

  // Estatísticas do dashboard
  app.get("/api/dashboard/stats", authenticateToken, async (req: any, res) => {
    try {
      // Mock data para demonstração - substituir por dados reais do ERP
      const stats: DashboardStats = {
        totalContas: 5,
        entradas: 125000.50,
        saidas: 78500.25,
        saldoTotal: 246800.75,
        contasPagar: 12,
        contasReceber: 8,
        lancamentosHoje: 5
      };

      res.json(stats);
    } catch (error) {
      console.error('Erro ao obter estatísticas do dashboard:', error);
      res.status(500).json({ message: 'Erro interno do servidor' });
    }
  });

  // Dados do gráfico de fluxo de caixa
  app.get("/api/dashboard/fluxo-caixa", authenticateToken, async (req: any, res) => {
    try {
      const { dataInicio, dataFim } = req.query;

      // Mock data para demonstração
      const fluxoData: FluxoCaixaData[] = [
        { data: "2024-06-05", entradas: 5000, saidas: 3200, saldo: 1800 },
        { data: "2024-06-06", entradas: 7500, saidas: 4100, saldo: 3400 },
        { data: "2024-06-07", entradas: 3200, saidas: 5800, saldo: -2600 },
        { data: "2024-06-08", entradas: 9800, saidas: 2100, saldo: 7700 },
        { data: "2024-06-09", entradas: 4500, saidas: 6200, saldo: -1700 },
        { data: "2024-06-10", entradas: 8200, saidas: 3500, saldo: 4700 },
        { data: "2024-06-11", entradas: 6800, saidas: 4200, saldo: 2600 }
      ];

      res.json(fluxoData);
    } catch (error) {
      console.error('Erro ao obter dados do fluxo de caixa:', error);
      res.status(500).json({ message: 'Erro interno do servidor' });
    }
  });

  // Últimos lançamentos
  app.get("/api/dashboard/ultimos-lancamentos", authenticateToken, async (req: any, res) => {
    try {
      const { limit = "10" } = req.query;

      // Mock data para demonstração
      const lancamentos: UltimosLancamentos[] = [
        { id: 1, descricao: "Venda de produtos", valor: 5800, tipo: "entrada", data: "2024-06-11", status: "pago", categoria: "vendas" },
        { id: 2, descricao: "Pagamento fornecedor", valor: -2300, tipo: "saida", data: "2024-06-11", status: "pago", categoria: "compras" },
        { id: 3, descricao: "Recebimento cliente", valor: 8900, tipo: "entrada", data: "2024-06-10", status: "pago", categoria: "vendas" },
        { id: 4, descricao: "Aluguel escritório", valor: -3200, tipo: "saida", data: "2024-06-10", status: "pago", categoria: "despesas" },
        { id: 5, descricao: "Prestação de serviços", valor: 4500, tipo: "entrada", data: "2024-06-09", status: "pendente", categoria: "servicos" }
      ];

      res.json(lancamentos.slice(0, parseInt(limit)));
    } catch (error) {
      console.error('Erro ao obter últimos lançamentos:', error);
      res.status(500).json({ message: 'Erro interno do servidor' });
    }
  });

  // === ROTAS DE CONTAS A PAGAR ===
  
  app.get("/api/contas/pagar", authenticateToken, async (req: any, res) => {
    try {
      // Mock data - substituir por consulta real ao ERP
      const contasPagar = [
        {
          id: 1,
          descricao: "Aluguel - Escritório Centro",
          valor: 3200.00,
          dataVencimento: "2024-06-15",
          status: "pendente",
          categoria: "despesas",
          fornecedor: "Imobiliária Santos"
        },
        {
          id: 2,
          descricao: "Energia Elétrica",
          valor: 450.75,
          dataVencimento: "2024-06-18",
          status: "pendente",
          categoria: "utilities",
          fornecedor: "CEMIG"
        }
      ];

      res.json({ lancamentos: contasPagar, total: contasPagar.length });
    } catch (error) {
      console.error('Erro ao obter contas a pagar:', error);
      res.status(500).json({ message: 'Erro interno do servidor' });
    }
  });

  // === ROTAS DE CONTAS A RECEBER ===
  
  app.get("/api/contas/receber", authenticateToken, async (req: any, res) => {
    try {
      // Mock data - substituir por consulta real ao ERP
      const contasReceber = [
        {
          id: 1,
          descricao: "Venda de Produtos - Pedido #1234",
          valor: 5800.00,
          dataVencimento: "2024-06-20",
          status: "pendente",
          categoria: "vendas",
          cliente: "Empresa ABC Ltda"
        },
        {
          id: 2,
          descricao: "Prestação de Serviços - Consultoria",
          valor: 12000.00,
          dataVencimento: "2024-06-15",
          status: "pendente",
          categoria: "servicos",
          cliente: "Tech Solutions Corp"
        }
      ];

      res.json({ lancamentos: contasReceber, total: contasReceber.length });
    } catch (error) {
      console.error('Erro ao obter contas a receber:', error);
      res.status(500).json({ message: 'Erro interno do servidor' });
    }
  });

  // === ROTAS DE EXTRATO ===
  
  app.get("/api/extrato", authenticateToken, async (req: any, res) => {
    try {
      const { contaId, dataInicio, dataFim } = req.query;

      // Mock data - substituir por consulta real ao ERP
      const extrato = [
        {
          id: 1,
          data: "2024-06-11",
          descricao: "Venda - Produtos diversos",
          valor: 5800.00,
          tipo: "entrada",
          saldoAnterior: 15200.00,
          saldoAtual: 21000.00,
          categoria: "vendas"
        },
        {
          id: 2,
          data: "2024-06-11",
          descricao: "Pagamento - Fornecedor ABC",
          valor: -2300.00,
          tipo: "saida",
          saldoAnterior: 21000.00,
          saldoAtual: 18700.00,
          categoria: "compras"
        }
      ];

      res.json({ lancamentos: extrato, total: extrato.length });
    } catch (error) {
      console.error('Erro ao obter extrato:', error);
      res.status(500).json({ message: 'Erro interno do servidor' });
    }
  });

  // === ROTAS DE RELATÓRIOS ===
  
  app.get("/api/relatorios/fluxo-caixa", authenticateToken, async (req: any, res) => {
    try {
      const { dataInicio, dataFim, contaId } = req.query;

      // Mock data para relatórios
      const relatorioData = {
        totalEntradas: 125000.50,
        totalSaidas: 78500.25,
        saldoLiquido: 46500.25,
        transacoes: 156,
        relatoriosGerados: 24,
        crescimentoMensal: 12.5
      };

      res.json(relatorioData);
    } catch (error) {
      console.error('Erro ao gerar relatório:', error);
      res.status(500).json({ message: 'Erro interno do servidor' });
    }
  });

  // === ROTAS DE IA ASSISTANT ===
  
  app.post("/api/ai/query", authenticateToken, async (req: any, res) => {
    try {
      const { query, context } = req.body;

      // Mock response - substituir por integração real com IA
      const responses: Record<string, string> = {
        'saldo': 'Seu saldo atual é de R$ 18.700,00 distribuído entre: Conta Corrente (R$ 12.500,00), Poupança (R$ 4.200,00) e Investimentos (R$ 2.000,00).',
        'contas': 'Você tem 3 contas vencendo esta semana: Aluguel (R$ 3.200,00 - vence 15/06), Energia (R$ 450,75 - vence 18/06) e Material de Escritório (R$ 890,30 - vencida em 12/06).',
        'projeção': 'Sua projeção para os próximos 30 dias mostra entrada estimada de R$ 45.000,00 e saídas de R$ 32.500,00, resultando em fluxo positivo de R$ 12.500,00.',
        'categoria': 'Sua categoria com maior gasto é "Despesas Operacionais" com R$ 8.500,00 (35% do total), seguida por "Fornecedores" com R$ 6.200,00 (26%).'
      };

      const lowerQuery = query.toLowerCase();
      let response = 'Entendi sua pergunta. Com base nos seus dados financeiros, posso fornecer análises detalhadas. Poderia ser mais específico sobre qual informação financeira você gostaria de saber?';

      if (lowerQuery.includes('saldo')) response = responses.saldo;
      else if (lowerQuery.includes('conta') || lowerQuery.includes('venc')) response = responses.contas;
      else if (lowerQuery.includes('projeção') || lowerQuery.includes('fluxo')) response = responses.projeção;
      else if (lowerQuery.includes('categoria') || lowerQuery.includes('gasto')) response = responses.categoria;

      res.json({
        response,
        suggestions: [
          'Gerar relatório detalhado',
          'Mostrar gráfico de tendências',
          'Comparar com mês anterior',
          'Sugerir otimizações'
        ]
      });
    } catch (error) {
      console.error('Erro no AI Assistant:', error);
      res.status(500).json({ message: 'Erro interno do servidor' });
    }
  });

  // === ROTAS DE USUÁRIOS (mantidas do sistema original) ===
  
  app.get("/api/usuarios", authenticateToken, async (req: any, res) => {
    try {
      const { search = "", status = "all", page = "1", limit = "10", sortBy = "name", sortOrder = "asc" } = req.query;

      const users = await storage.getUsers({
        search,
        status,
        page: parseInt(page),
        limit: parseInt(limit),
        sortBy,
        sortOrder
      });

      res.json(users);
    } catch (error) {
      console.error("Users fetch error:", error);
      res.status(500).json({ message: "Erro ao buscar usuários" });
    }
  });
}