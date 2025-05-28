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

// Types for Company (MySQL table)
export interface Company {
  company_id: number;
  company_name: string;
  company_fantasy: string;
  company_cpf_cnpj: string;
  company_email: string;
  company_city: string;
  company_uf: string;
}

export interface CompanyFilters {
  search?: string;
  page?: number;
  limit?: number;
  sortBy?: keyof Company;
  sortOrder?: 'asc' | 'desc';
}

export interface CompanyResponse {
  companies: Company[];
  total: number;
  page: number;
  totalPages: number;
  limit: number;
}

// Types for NFe Recebidas (MySQL table)
export interface NFeRecebida {
  doc_num: string;
  doc_dest_nome: string;
  doc_emit_nome: string;
  doc_emit_documento: string;
  doc_date_emi: string;
  doc_valor: number;
  doc_nat_op: string;
  doc_status_integracao: number;
  doc_id_integracao: string | null;
}

export interface NFeFilters {
  search?: string;
  status?: 'all' | 'integrated' | 'not_integrated';
  empresa?: string;
  fornecedor?: string;
  dataInicio?: string;
  dataFim?: string;
  page?: number;
  limit?: number;
  sortBy?: keyof NFeRecebida;
  sortOrder?: 'asc' | 'desc';
}

export interface NFeResponse {
  nfes: NFeRecebida[];
  total: number;
  page: number;
  totalPages: number;
  limit: number;
}

// NFSe Recebidas interfaces
export interface NFSeRecebida {
  nfse_emitente: string;
  nfse_doc: string;
  nfse_tomador: string;
  nfse_tipo: string;
  nfse_local_prestacao: string;
  nfse_data_hora: string;
  nfse_valor_servico: number;
  nfse_status_integracao: number;
  nfse_id_integracao: string | null;
}

export interface NFSeFilters {
  search?: string;
  status?: 'all' | 'integrated' | 'not_integrated';
  empresa?: string;
  fornecedor?: string;
  local?: string;
  dataInicio?: string;
  dataFim?: string;
  page?: number;
  limit?: number;
  sortBy?: keyof NFSeRecebida;
  sortOrder?: 'asc' | 'desc';
}

export interface NFSeResponse {
  nfses: NFSeRecebida[];
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

// Dashboard Statistics
export interface DashboardStats {
  totalCNPJ: number;
  nfeRecebidas: number;
  nfeIntegradas: number;
  nfseRecebidas: number;
  nfseIntegradas: number;
  fornecedoresSemERP: number;
}

export interface ChartData {
  date: string;
  nfe: number;
  nfse: number;
}

export interface PieChartData {
  name: string;
  value: number;
  color: string;
}

export interface UltimosDocumentos {
  tipo: string;
  emitente: string;
  valor: number;
  data: string;
  status: string;
}

export interface CNPJAtivo {
  cnpj: string;
  nome: string;
  ultimaCaptura: string;
  status: string;
}

// Fornecedores interfaces
export interface Fornecedor {
  id: number;
  nome: string;
  cnpj: string;
  codigo_erp: string | null;
  data_cadastro: string;
}

export interface FornecedorFilters {
  search?: string;
  nome?: string;
  cnpj?: string;
  page?: number;
  limit?: number;
  sortBy?: keyof Fornecedor;
  sortOrder?: 'asc' | 'desc';
}

export interface FornecedorResponse {
  fornecedores: Fornecedor[];
  total: number;
  page: number;
  totalPages: number;
  limit: number;
}
