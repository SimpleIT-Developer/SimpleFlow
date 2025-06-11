import { users, type User, type InsertUser, type UsuarioResponse } from "@shared/schema";
import { db } from "./db";
import { eq, ilike, or, and, count, desc, asc } from "drizzle-orm";
import { pool } from "./db";

export interface IStorage {
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(insertUser: InsertUser): Promise<User>;
  getUsers(filters: any): Promise<UsuarioResponse>;
  ensureUsersTableExists(): Promise<void>;
}

export class DatabaseStorage implements IStorage {
  async getUser(id: number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user || undefined;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user || undefined;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.email, email));
    return user || undefined;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(insertUser)
      .returning();
    return user;
  }

  async getUsers(filters: any): Promise<UsuarioResponse> {
    const { search = "", status = "all", page = 1, limit = 10, sortBy = "name", sortOrder = "asc" } = filters;
    
    let query = db.select().from(users);
    
    // Aplicar filtros
    if (search) {
      query = query.where(or(
        ilike(users.name, `%${search}%`),
        ilike(users.email, `%${search}%`),
        ilike(users.username, `%${search}%`)
      ));
    }
    
    if (status !== "all") {
      const statusValue = status === "active" ? 1 : 0;
      query = query.where(eq(users.status, statusValue));
    }
    
    // Ordenação
    const orderDirection = sortOrder === "desc" ? desc : asc;
    const orderField = users[sortBy as keyof typeof users] || users.name;
    query = query.orderBy(orderDirection(orderField));
    
    // Paginação
    const offset = (page - 1) * limit;
    const usersList = await query.limit(limit).offset(offset);
    
    // Contar total
    const [totalResult] = await db.select({ count: count() }).from(users);
    const total = totalResult.count;
    
    return {
      usuarios: usersList.map(user => ({
        id: user.id,
        nome: user.name,
        email: user.email,
        tipo: user.type || 'user',
        ativo: user.status || 1
      })),
      total,
      page,
      totalPages: Math.ceil(total / limit),
      limit
    };
  }

  async ensureUsersTableExists(): Promise<void> {
    try {
      // Verificar se a tabela existe no PostgreSQL
      const result = await pool.query(`
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_schema = 'public' 
          AND table_name = 'users'
        );
      `);
      
      const tableExists = result.rows[0].exists;
      
      if (!tableExists) {
        console.log('Tabela users não encontrada. Criando tabela...');
        
        // Criar tabela users
        await pool.query(`
          CREATE TABLE users (
            id SERIAL PRIMARY KEY,
            username TEXT NOT NULL UNIQUE,
            email TEXT NOT NULL UNIQUE,
            password TEXT NOT NULL,
            name TEXT NOT NULL,
            type TEXT,
            status INTEGER DEFAULT 1,
            created_at TIMESTAMP DEFAULT NOW() NOT NULL
          );
        `);
        
        console.log('Tabela users criada com sucesso');
      } else {
        console.log('Tabela users já existe');
      }
    } catch (error) {
      console.error('Erro ao verificar/criar tabela users:', error);
      throw error;
    }
  }
}

export const storage = new DatabaseStorage();