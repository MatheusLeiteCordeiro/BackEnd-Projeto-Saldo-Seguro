const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const pool = require('../config/database');
const crypto = require('crypto'); // Biblioteca nativa do Node.js para gerar tokens seguros
const sendEmail = require('../config/mailer');

// Rota de Cadastro de Usuário
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

// Rota de Login
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

// Solicitar a recuperação de senha (Envia o e-mail com o link/token)
router.post('/forgot-password', async (req, res) => {
  const { email } = req.body;

  if (!email) {
    return res.status(400).json({ error: 'Informe o e-mail cadastrado.' });
  }

  try {
    const userResult = await pool.query('SELECT * FROM users WHERE email = $1', [email]);

    if (userResult.rows.length === 0) {
      return res.status(404).json({ error: 'E-mail não encontrado no sistema.' });
    }

    // Gerar um token aleatório seguro e o tempo deexpiração (ex: 1 hora)
    const resetToken = crypto.randomBytes(32).toString('hex');
    const tokenExpires = new Date(Date.now() + 3600000); // 1 hora a partir de agora

    // Salvar o token e a expiração no banco
    await pool.query(
      'UPDATE users SET reset_token = $1, reset_token_expires = $2 WHERE email = $3',
      [resetToken, tokenExpires, email]
    );

    // Link que será enviado por e-mail (apontando para a tela do front-end da Jade)
    const resetLink = `http://localhost:5173/reset-password?token=${resetToken}&email=${email}`;

    const htmlMessage = `
      <div style="font-family: Arial, sans-serif; color: #333;">
        <h2 style="color: #0d5c36;">Saldo Seguro - Redefinição de Senha</h2>
        <p>Você solicitou a alteração da sua senha.</p>
        <p>Clique no botão abaixo para definir uma nova senha:</p>
        <a href="${resetLink}" style="background-color: #0d5c36; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; display: inline-block;">Redefinir Senha</a>
        <p><br>Se você não solicitou isso, pode ignorar este e-mail.</p>
      </div>
    `;

    await sendEmail(email, 'Redefinição de Senha - Saldo Seguro', htmlMessage);

    return res.status(200).json({
      message: 'E-mail de redefinição enviado com sucesso! Verifique sua caixa de entrada.'
    });

  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'Erro interno no servidor.' });
  }
});

// Cadastrar a nova senha (Valida o token e atualiza a senha escolhida pelo usuário)
router.post('/reset-password', async (req, res) => {
  const { email, token, newPassword } = req.body;

  if (!email || !token || !newPassword) {
    return res.status(400).json({ error: 'Todos os campos são obrigatórios.' });
  }

  try {
    // Busca o usuário e valida se o token confere e ainda não expirou
    const userResult = await pool.query(
      'SELECT * FROM users WHERE email = $1 AND reset_token = $2 AND reset_token_expires > NOW()',
      [email, token]
    );

    if (userResult.rows.length === 0) {
      return res.status(400).json({ error: 'Token inválido ou expirado.' });
    }

    // Criptografa a nova senha escolhida pelo usuário
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(newPassword, saltRounds);

    // Atualiza a senha e limpa os campos de token do banco
    await pool.query(
      'UPDATE users SET password = $1, reset_token = NULL, reset_token_expires = NULL WHERE email = $2',
      [hashedPassword, email]
    );

    return res.status(200).json({
      message: 'Senha alterada com sucesso! Faça login com sua nova senha.'
    });

  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'Erro interno no servidor.' });
  }
});

module.exports = router;