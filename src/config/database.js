const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_DATABASE,
  password: process.env.DB_PASSWORD,
  port: process.env.DB_PORT,
});

// Testando a conexão com o banco
pool.connect((err, client, release) => {
  if (err) {
    return console.error('Erro ao conectar ao PostgreSQL:', err.stack);
  }
  console.log('Conectado ao PostgreSQL com sucesso!');
  release();
});

// cria as tabelas automaticamente no banco
async function createTables() {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        name TEXT NOT NULL,
        email TEXT UNIQUE NOT NULL,
        password TEXT NOT NULL,
        reset_token TEXT,
        reset_token_expires TIMESTAMP
      );
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS financial_profiles (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        monthly_income NUMERIC(10, 2) DEFAULT 0,
        savings_goal NUMERIC(10, 2) DEFAULT 0
      );
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS expenses (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        description TEXT NOT NULL,
        amount NUMERIC(10, 2) NOT NULL,
        category TEXT,
        type TEXT
      );
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS installments (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        description TEXT NOT NULL,
        total_amount NUMERIC(10, 2) NOT NULL,
        installments_count INTEGER NOT NULL,
        installment_value NUMERIC(10, 2) NOT NULL
      );
    `);

    console.log('Tabelas verificadas/criadas com sucesso no PostgreSQL!');
  } catch (error) {
    console.error('Erro ao criar tabelas:', error);
  }
}

createTables();

module.exports = pool;