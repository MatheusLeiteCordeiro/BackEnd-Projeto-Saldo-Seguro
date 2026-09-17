const express = require('express');
const router = express.Router();
const pool = require('../config/database');

// Atualizar ou salvar a meta de reserva financeira do usuário
/**
 * @swagger
 * /finance/{userId}:
 *   put:
 *     summary: Atualiza ou salva a meta de reserva financeira do usuário
 *     tags: [Configurações Financeiras]
 *     parameters:
 *       - in: path
 *         name: userId
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
 *             required:
 *               - savings_goal
 *               - monthly_income
 *             properties:
 *               savings_goal:
 *                 type: number
 *                 example: 2000.00
 *               monthly_income:
 *                 type: number
 *                 example: 3000.00
 *     responses:
 *       200:
 *         description: Dados financeiros atualizados com sucesso.
 *       400:
 *         description: Dados obrigatórios faltando.
 *       404:
 *         description: Perfil financeiro ou usuário não encontrado.
 *       500:
 *         description: Erro interno no servidor.
 */
router.put('/:userId', async (req, res) => {
  const { userId } = req.params;
  const { savings_goal } = req.body;

  // Validação básica
  if (savings_goal === undefined) {
    return res.status(400).json({ error: 'A meta de reserva é obrigatória.' });
  }

  if (savings_goal < 0) {
    return res.status(400).json({ error: 'O valor da meta não pode ser negativo.' });
  }

  try {
    // Atualiza apenas a meta de reserva na tabela financial_profiles
    const updateResult = await pool.query(
      `UPDATE financial_profiles 
       SET savings_goal = $1 
       WHERE user_id = $2 
       RETURNING *`,
      [savings_goal, userId]
    );

    if (updateResult.rows.length === 0) {
      return res.status(404).json({ error: 'Perfil financeiro não encontrado para este usuário.' });
    }

    return res.status(200).json({
      message: 'Meta financeira atualizada com sucesso!',
      financialProfile: updateResult.rows[0]
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'Erro interno no servidor.' });
  }
});

// Rota para consultar os dados financeiros do usuário (Perfil + Renda Total calculada)
/**
 * @swagger
 * /finance/{userId}:
 *   get:
 *     summary: Consulta os dados financeiros base do usuário (Perfil e Renda cadastrada)
 *     tags: [Configurações Financeiras]
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID único do usuário
 *     responses:
 *       200:
 *         description: Dados financeiros retornados com sucesso.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 id:
 *                   type: integer
 *                   example: 1
 *                 user_id:
 *                   type: integer
 *                   example: 1
 *                 savings_goal:
 *                   type: number
 *                   example: 2000.00
 *                 monthly_income:
 *                   type: number
 *                   example: 3000.00
 *       404:
 *         description: Perfil financeiro não encontrado.
 *       500:
 *         description: Erro interno no servidor.
 */

router.get('/:userId', async (req, res) => {
  const { userId } = req.params;

  try {
    // 1. Busca o perfil financeiro (meta de reserva)
    const profileResult = await pool.query('SELECT * FROM financial_profiles WHERE user_id = $1', [userId]);

    if (profileResult.rows.length === 0) {
      return res.status(404).json({ error: 'Perfil financeiro não encontrado.' });
    }

    // 2. Busca todas as fontes de renda na tabela 'incomes' para calcular o total mensal
    const incomesResult = await pool.query('SELECT SUM(amount) as total_income FROM source_of_incomes WHERE user_id = $1', [userId]);
    const totalMonthlyIncome = incomesResult.rows[0].total_income ? parseFloat(incomesResult.rows[0].total_income) : 0;

    // 3. Retorna os dados combinados
    return res.status(200).json({
      ...profileResult.rows[0],
      monthly_income: totalMonthlyIncome // Dinâmico, vindo da tabela incomes
    });

  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'Erro interno no servidor.' });
  }
});

module.exports = router;