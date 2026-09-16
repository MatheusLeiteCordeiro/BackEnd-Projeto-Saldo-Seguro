const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const pool = require('../config/database');

// 1. Rota de Cadastro de Usuário
router.post('/register', async (req, res) => {
  const { name, email, password, confirmPassword } = req.body;

  // Validação básica dos campos obrigatórios
  if (!name || !email || !password || !confirmPassword) {
    return res.status(400).json({ error: 'Todos os campos são obrigatórios.' });
  }

  // Validação se a senha e a confirmação de senha conferem
  if (password !== confirmPassword) {
    return res.status(400).json({ error: 'As senhas não coincidem.' });
  }

  try {
    // Criptografando a senha antes de salvar
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    // Inserindo o usuário com o nome na tabela users
    const newUser = await pool.query(
      'INSERT INTO users (name, email, password) VALUES ($1, $2, $3) RETURNING id, name, email',
      [name, email, hashedPassword]
    );

    // Criando automaticamente o perfil financeiro vazio para este usuário
    await pool.query(
      'INSERT INTO financial_profiles (user_id) VALUES ($1)',
      [newUser.rows[0].id]
    );

    return res.status(201).json({
      message: 'Usuário cadastrado com sucesso!',
      user: newUser.rows[0]
    });
  } catch (error) {
    if (error.code === '23505') { // Violação de UNIQUE (e-mail duplicado)
      return res.status(400).json({ error: 'Este e-mail já está cadastrado.' });
    }
    console.error(error);
    return res.status(500).json({ error: 'Erro interno no servidor.' });
  }
});

// 2. Rota de Login
router.post('/login', async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'E-mail e senha são obrigatórios.' });
  }

  try {
    // Buscando o usuário pelo e-mail
    const userResult = await pool.query('SELECT * FROM users WHERE email = $1', [email]);

    if (userResult.rows.length === 0) {
      return res.status(401).json({ error: 'E-mail ou senha inválidos.' });
    }

    const user = userResult.rows[0];

    // Comparando a senha informada com o hash salvo no banco
    const match = await bcrypt.compare(password, user.password);

    if (!match) {
      return res.status(401).json({ error: 'E-mail ou senha inválidos.' });
    }

    return res.status(200).json({
      message: 'Login realizado com sucesso!',
      userId: user.id,
      email: user.email
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'Erro interno no servidor.' });
  }
});

module.exports = router;