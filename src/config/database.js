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
        reset_token_expires TIMESTAMP,
        address TEXT
      );
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS sources_of_incomes (
      id SERIAL PRIMARY KEY,
      user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
      title TEXT NOT NULL,
      amount NUMERIC(10, 2) NOT NULL,
      category TEXT DEFAULT 'Salário',
      frequency TEXT DEFAULT 'Mensal', 
      receive_date INTEGER DEFAULT 1, 
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
`);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS financial_profiles (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        savings_goal NUMERIC(10, 2) DEFAULT 0.00 
      );
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS expenses (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        title TEXT NOT NULL,
        amount NUMERIC(10, 2) NOT NULL,
        category TEXT NOT NULL, 
        date DATE NOT NULL,     
        is_recurring BOOLEAN DEFAULT FALSE, 
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
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

    await pool.query(`
      CREATE TABLE IF NOT EXISTS goals (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        title TEXT NOT NULL,
        target_amount NUMERIC(10, 2) NOT NULL, -- Valor total da meta (ex: 12000.00)
        current_amount NUMERIC(10, 2) DEFAULT 0.00, -- Valor já acumulado (ex: 3000.00)
        category TEXT DEFAULT 'Personalizado', -- Ex: 'Carro', 'Viagem', 'Casa', etc.
        deadline DATE, -- Data limite opcional para atingir o objetivo
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
      `);

    console.log('Tabelas verificadas/criadas com sucesso no PostgreSQL!');
  } catch (error) {
    console.error('Erro ao criar tabelas:', error);
  }
}

createTables();

module.exports = pool;