import { pgTable, text, serial, integer, boolean, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  email: text("email").notNull().unique(),
  password: text("password").notNull(),
  name: text("name").notNull(),
  type: text("type"),
  status: integer("status").default(1),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  email: true,
  password: true,
  name: true,
  type: true,
  status: true,
});

export const loginSchema = z.object({
  email: z.string().email("Email inválido"),
  password: z.string().min(1, "Senha é obrigatória"),
});

export const registerSchema = insertUserSchema.extend({
  password: z.string().min(8, "Senha deve ter pelo menos 8 caracteres"),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Senhas não coincidem",
  path: ["confirmPassword"],
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;
export type LoginData = z.infer<typeof loginSchema>;
export type RegisterData = z.infer<typeof registerSchema>;

// Types for Contas (PostgreSQL tables)
export const contas = pgTable("contas", {
  id: serial("id").primaryKey(),
  nome: text("nome").notNull(),
  tipo: text("tipo").notNull(), // 'corrente', 'poupanca', 'investimento', etc.
  saldo: integer("saldo").default(0), // Valor em centavos
  ativo: boolean("ativo").default(true),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const lancamentos = pgTable("lancamentos", {
  id: serial("id").primaryKey(),
  contaId: integer("conta_id").references(() => contas.id).notNull(),
  descricao: text("descricao").notNull(),
  valor: integer("valor").notNull(), // Valor em centavos (positivo = entrada, negativo = saída)
  tipo: text("tipo").notNull(), // 'entrada', 'saida'
  categoria: text("categoria"), // 'vendas', 'compras', 'salarios', etc.
  dataVencimento: timestamp("data_vencimento"),
  dataPagamento: timestamp("data_pagamento"),
  status: text("status").default('pendente'), // 'pendente', 'pago', 'cancelado'
  observacoes: text("observacoes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export interface Conta {
  id: number;
  nome: string;
  tipo: string;
  saldo: number;
  ativo: boolean;
  createdAt: string;
}

export interface Lancamento {
  id: number;
  contaId: number;
  descricao: string;
  valor: number;
  tipo: string;
  categoria?: string;
  dataVencimento?: string;
  dataPagamento?: string;
  status: string;
  observacoes?: string;
  createdAt: string;
}

// Schemas e tipos para inserção
export const insertContaSchema = createInsertSchema(contas).omit({ id: true, createdAt: true });
export const insertLancamentoSchema = createInsertSchema(lancamentos).omit({ id: true, createdAt: true });

export type InsertConta = z.infer<typeof insertContaSchema>;
export type InsertLancamento = z.infer<typeof insertLancamentoSchema>;

// Filtros e respostas para lançamentos
export interface LancamentoFilters {
  search?: string;
  contaId?: number;
  tipo?: 'entrada' | 'saida' | 'all';
  status?: 'pendente' | 'pago' | 'cancelado' | 'all';
  categoria?: string;
  dataInicio?: string;
  dataFim?: string;
  page?: number;
  limit?: number;
  sortBy?: keyof Lancamento;
  sortOrder?: 'asc' | 'desc';
}

export interface LancamentoResponse {
  lancamentos: Lancamento[];
  total: number;
  page: number;
  totalPages: number;
  limit: number;
}

// Filtros para contas
export interface ContaFilters {
  search?: string;
  tipo?: string;
  ativo?: boolean;
  page?: number;
  limit?: number;
  sortBy?: keyof Conta;
  sortOrder?: 'asc' | 'desc';
}

export interface ContaResponse {
  contas: Conta[];
  total: number;
  page: number;
  totalPages: number;
  limit: number;
}

// Usuários interfaces
export interface Usuario {
  id: number;
  nome: string;
  email: string;
  tipo: string;
  ativo: number;
}

export interface CreateUsuarioData {
  nome: string;
  email: string;
  password: string;
  tipo: 'user' | 'admin' | 'system';
}

export interface UpdateUsuarioData {
  nome?: string;
  email?: string;
  password?: string;
  tipo?: 'user' | 'admin' | 'system';
  ativo?: number;
}

export interface UsuarioFilters {
  search?: string;
  status?: 'all' | 'active' | 'inactive';
  page?: number;
  limit?: number;
  sortBy?: keyof Usuario;
  sortOrder?: 'asc' | 'desc';
}

export interface UsuarioResponse {
  usuarios: Usuario[];
  total: number;
  page: number;
  totalPages: number;
  limit: number;
}

// Dashboard Statistics para Fluxo de Caixa
export interface DashboardStats {
  totalContas: number;
  entradas: number;
  saidas: number;
  saldoTotal: number;
  contasPagar: number;
  contasReceber: number;
  lancamentosHoje: number;
}

export interface FluxoCaixaData {
  data: string;
  entradas: number;
  saidas: number;
  saldo: number;
}

export interface ResumoFinanceiro {
  periodo: string;
  totalEntradas: number;
  totalSaidas: number;
  saldoLiquido: number;
  maiorEntrada: number;
  maiorSaida: number;
}

export interface UltimosLancamentos {
  id: number;
  descricao: string;
  valor: number;
  tipo: string;
  data: string;
  status: string;
  categoria: string;
}

export interface ContaPorTipo {
  tipo: string;
  quantidade: number;
  saldoTotal: number;
}

// Interface para IA Assistant
export interface AIQuery {
  query: string;
  context?: string;
}

export interface AIResponse {
  response: string;
  suggestions?: string[];
  data?: any;
}
