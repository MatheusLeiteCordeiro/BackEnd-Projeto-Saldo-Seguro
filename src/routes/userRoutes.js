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

// Rota para exportar todos os dados do usuário (Backup em JSON)
router.get('/:id/export', async (req, res) => {
  const { id } = req.params;

  try {
    // 1. Buscar dados do usuário
    const userResult = await pool.query('SELECT id, name, email, address FROM users WHERE id = $1', [id]);
    if (userResult.rows.length === 0) {
      return res.status(404).json({ error: 'Usuário não encontrado.' });
    }

    // 2. Buscar perfil financeiro
    const profileResult = await pool.query('SELECT monthly_income, savings_goal FROM financial_profiles WHERE user_id = $1', [id]);

    // 3. Buscar despesas
    const expensesResult = await pool.query('SELECT * FROM expenses WHERE user_id = $1', [id]);

    // 4. Buscar parcelamentos
    const installmentsResult = await pool.query('SELECT * FROM installments WHERE user_id = $1', [id]);

    // 5. Montar o pacote de exportação completo
    const exportData = {
      export_date: new Date().toISOString(),
      user: userResult.rows[0],
      financial_profile: profileResult.rows[0] || null,
      expenses: expensesResult.rows,
      installments: installmentsResult.rows
    };

    // Retorna o JSON para o front-end baixar/processar
    return res.status(200).json(exportData);

  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'Erro ao exportar os dados do usuário.' });
  }
});

// Rota para excluir todos os dados e a conta do usuário
router.delete('/:id', async (req, res) => {
  const { id } = req.params;

  try {
    // Iniciando uma transação para garantir que tudo seja apagado de forma segura
    await pool.query('BEGIN');

    // 1. Deletar despesas do usuário
    await pool.query('DELETE FROM expenses WHERE user_id = $1', [id]);

    // 2. Deletar parcelamentos do usuário
    await pool.query('DELETE FROM installments WHERE user_id = $1', [id]);

    // 3. Deletar perfil financeiro
    await pool.query('DELETE FROM financial_profiles WHERE user_id = $1', [id]);

    // 4. Por fim, deletar o usuário
    const deleteUser = await pool.query('DELETE FROM users WHERE id = $1 RETURNING id', [id]);

    if (deleteUser.rows.length === 0) {
      await pool.query('ROLLBACK');
      return res.status(404).json({ error: 'Usuário não encontrado.' });
    }

    // Confirma a transação
    await pool.query('COMMIT');

    return res.status(200).json({
      message: 'Todos os dados e a conta foram excluídos com sucesso.'
    });

  } catch (error) {
    await pool.query('ROLLBACK');
    console.error(error);
    return res.status(500).json({ error: 'Erro ao excluir os dados do usuário.' });
  }
});

module.exports = router;