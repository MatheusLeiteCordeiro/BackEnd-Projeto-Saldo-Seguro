const express = require('express');
const router = express.Router();
const pool = require('../config/database');

// Rota para listar todos os usuários cadastrados
/**
 * @swagger
 * /users:
 *   get:
 *     summary: Lista todos os usuários cadastrados no sistema
 *     tags: [Usuários]
 *     responses:
 *       200:
 *         description: Lista de usuários retornada com sucesso.
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   id:
 *                     type: integer
 *                     example: 1
 *                   name:
 *                     type: string
 *                     example: "Matheus Emanuel"
 *                   email:
 *                     type: string
 *                     example: "matheus@teste.com"
 *                   address:
 *                     type: string
 *                     example: "Belo Jardim - PE"
 *       500:
 *         description: Erro interno no servidor.
 */

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
/**
 * @swagger
 * /users/{id}:
 *   put:
 *     summary: Atualiza os dados de um usuário (e-mail, senha ou endereço)
 *     tags: [Usuários]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID único do usuário
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *                 example: "Matheus Emanuel Leite"
 *               email:
 *                 type: string
 *                 example: "matheus.novo@teste.com"
 *               password:
 *                 type: string
 *                 example: "novaSenha123"
 *               address:
 *                 type: string
 *                 example: "Sanharó - PE"
 *     responses:
 *       200:
 *         description: Usuário atualizado com sucesso.
 *       404:
 *         description: Usuário não encontrado.
 *       500:
 *         description: Erro interno no servidor.
 */

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
/**
 * @swagger
 * /users/{id}:
 *   delete:
 *     summary: Exclui a conta e todos os dados associados do usuário
 *     tags: [Usuários]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID único do usuário
 *     responses:
 *       200:
 *         description: Conta e dados do usuário excluídos com sucesso.
 *       404:
 *         description: Usuário não encontrado.
 *       500:
 *         description: Erro interno no servidor.
 */

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
/**
 * @swagger
 * /users/{id}/export:
 *   get:
 *     summary: Exporta todos os dados do usuário em formato JSON (Backup completo)
 *     tags: [Usuários]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID único do usuário
 *     responses:
 *       200:
 *         description: Dados exportados com sucesso em formato JSON.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 user_profile:
 *                   type: object
 *                 incomes:
 *                   type: array
 *                 expenses:
 *                   type: array
 *                 goals:
 *                   type: array
 *       404:
 *         description: Usuário não encontrado.
 *       500:
 *         description: Erro interno no servidor.
 */

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

module.exports = router;