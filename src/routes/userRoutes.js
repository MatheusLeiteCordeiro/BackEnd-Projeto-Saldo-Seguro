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

// 1. Rota para Editar Usuário (E-mail ou Senha ou Endereço)
router.put('/:id', async (req, res) => {
  const { id } = req.params;
  const { name, email, address } = req.body;

  try {
    const updatedUser = await pool.query(
      `UPDATE users 
       SET name = COALESCE($1, name), 
           email = COALESCE($2, email), 
           address = COALESCE($3, address) 
       WHERE id = $4 
       RETURNING id, name, email, address`,
      [name, email, address, id]
    );

    if (updatedUser.rows.length === 0) {
      return res.status(404).json({ error: 'Usuário não encontrado.' });
    }

    return res.status(200).json({
      message: 'Perfil atualizado com sucesso!',
      user: updatedUser.rows[0]
    });
  } catch (error) {
    if (error.code === '23505') {
      return res.status(400).json({ error: 'Este e-mail já está em uso por outro usuário.' });
    }
    console.error(error);
    return res.status(500).json({ error: 'Erro ao atualizar perfil.' });
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