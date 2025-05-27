import { pgTable, text, serial, integer, boolean, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  email: text("email").notNull().unique(),
  password: text("password").notNull(),
  name: text("name").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  email: true,
  password: true,
  name: true,
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
