import { users, type User, type InsertUser } from "@shared/schema";
import { db } from "./db";
import { eq } from "drizzle-orm";
import { pool } from "./db";

export interface IStorage {
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(insertUser: InsertUser): Promise<User>;
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