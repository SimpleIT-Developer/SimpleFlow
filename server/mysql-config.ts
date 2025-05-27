import mysql from 'mysql2/promise';

// Configurações do MySQL - arquivo único para melhor manutenção
const mysqlConfig = {
  host: "45.132.157.52",
  database: "u994990997_roboeac",
  user: "u994990997_roboeac",
  password: "@n@R@quel110987",
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
};

// Pool de conexões MySQL
export const mysqlPool = mysql.createPool(mysqlConfig);

// Função para testar a conexão
export async function testMysqlConnection(): Promise<boolean> {
  try {
    const connection = await mysqlPool.getConnection();
    await connection.ping();
    connection.release();
    console.log('✅ Conexão MySQL estabelecida com sucesso');
    return true;
  } catch (error) {
    console.error('❌ Erro na conexão MySQL:', error);
    return false;
  }
}