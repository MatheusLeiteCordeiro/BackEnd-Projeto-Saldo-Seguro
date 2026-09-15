const express = require('express');
const router = express.Router();
const pool = require('../config/database');

// Rota para listar todos os usuários cadastrados
router.get('/', async (req, res) => {
  try {
    // Busca todos os usuários, mas por segurança omitimos o campo 'password'
    const result = await pool.query('SELECT id, email FROM users ORDER BY id ASC');

    return res.status(200).json({
      total: result.rows.length,
      users: result.rows
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'Erro interno no servidor.' });
  }
});

// 1. Rota para Editar Usuário (E-mail ou Senha)
router.put('/:id', async (req, res) => {
  const { id } = req.params;
  const { email, password } = req.body;

  if (!email && !password) {
    return res.status(400).json({ error: 'Informe ao menos um campo (e-mail ou senha) para atualizar.' });
  }

  try {
    // Se o usuário mandou uma nova senha, precisamos criptografá-la
    if (password) {
      const saltRounds = 10;
      const hashedPassword = await bcrypt.hash(password, saltRounds);

      const updatedUser = await pool.query(
        'UPDATE users SET email = COALESCE($1, email), password = $2 WHERE id = $3 RETURNING id, email',
        [email, hashedPassword, id]
      );

      if (updatedUser.rows.length === 0) {
        return res.status(404).json({ error: 'Usuário não encontrado.' });
      }

      return res.status(200).json({
        message: 'Usuário atualizado com sucesso!',
        user: updatedUser.rows[0]
      });
    } else {
      // Se mandou apenas o e-mail para atualizar
      const updatedUser = await pool.query(
        'UPDATE users SET email = $1 WHERE id = $2 RETURNING id, email',
        [email, id]
      );

      if (updatedUser.rows.length === 0) {
        return res.status(404).json({ error: 'Usuário não encontrado.' });
      }

      return res.status(200).json({
        message: 'Usuário atualizado com sucesso!',
        user: updatedUser.rows[0]
      });
    }
  } catch (error) {
    if (error.code === '23505') {
      return res.status(400).json({ error: 'Este e-mail já está em uso por outro usuário.' });
    }
    console.error(error);
    return res.status(500).json({ error: 'Erro interno no servidor.' });
  }
});

// 2. Rota para Deletar Usuário
router.delete('/:id', async (req, res) => {
  const { id } = req.params;

  try {
    const deletedUser = await pool.query(
      'DELETE FROM users WHERE id = $1 RETURNING id, email',
      [id]
    );

    if (deletedUser.rows.length === 0) {
      return res.status(404).json({ error: 'Usuário não encontrado.' });
    }

    return res.status(200).json({
      message: 'Usuário deletado com sucesso!',
      user: deletedUser.rows[0]
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'Erro interno no servidor.' });
  }
});

module.exports = router;