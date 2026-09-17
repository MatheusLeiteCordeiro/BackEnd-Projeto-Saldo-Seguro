const express = require('express');
const router = express.Router();
const pool = require('../config/database');

// 1. Listar todas as fontes de renda de um usuário (e calcular o total mensal)
/**
 * @swagger
 * /incomes/{userId}:
 *   get:
 *     summary: Lista todas as fontes de renda de um usuário e calcula o total mensal
 *     tags: [Fontes de Renda]
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID único do usuário
 *     responses:
 *       200:
 *         description: Lista de fontes de renda retornada com sucesso.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 total_income:
 *                   type: number
 *                   example: 3000.00
 *                 incomes:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: integer
 *                         example: 1
 *                       title:
 *                         type: string
 *                         example: "Salário Principal"
 *                       amount:
 *                         type: number
 *                         example: 3000.00
 *                       category:
 *                         type: string
 *                         example: "Salário"
 *       500:
 *         description: Erro interno no servidor.
 */

router.get('/:userId', async (req, res) => {
  const { userId } = req.params;

  try {
    const incomesResult = await pool.query(
      'SELECT * FROM sources_of_incomes WHERE user_id = $1 ORDER BY id DESC',
      [userId]
    );

    // Calcular a renda mensal total somando as fontes
    const totalIncome = incomesResult.rows.reduce((acc, item) => acc + parseFloat(item.amount), 0);

    return res.status(200).json({
      total_monthly_income: totalIncome,
      incomes: incomesResult.rows
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'Erro ao buscar fontes de renda.' });
  }
});

// 2. Adicionar uma nova fonte de renda
/**
 * @swagger
 * /incomes:
 *   post:
 *     summary: Adiciona uma nova fonte de renda
 *     tags: [Fontes de Renda]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - user_id
 *               - title
 *               - amount
 *             properties:
 *               user_id:
 *                 type: integer
 *                 example: 1
 *               title:
 *                 type: string
 *                 example: "Freelance de Desenvolvimento"
 *               amount:
 *                 type: number
 *                 example: 1500.00
 *               category:
 *                 type: string
 *                 example: "Extra"
 *     responses:
 *       201:
 *         description: Fonte de renda cadastrada com sucesso!
 *       400:
 *         description: Campos obrigatórios faltando.
 *       500:
 *         description: Erro interno no servidor.
 */

router.post('/', async (req, res) => {
  const { user_id, title, amount, frequency, receive_date } = req.body;

  if (!user_id || !title || !amount) {
    return res.status(400).json({ error: 'Usuário, título e valor são obrigatórios.' });
  }

  try {
    const newIncome = await pool.query(
      `INSERT INTO sources_of_incomes (user_id, title, amount, frequency, receive_date) 
       VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [user_id, title, amount, frequency || 'Mensal', receive_date || 1]
    );

    return res.status(201).json({
      message: 'Fonte de renda cadastrada com sucesso!',
      income: newIncome.rows[0]
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'Erro ao cadastrar fonte de renda.' });
  }
});

// 3. Deletar uma fonte de renda
/**
 * @swagger
 * /incomes/{id}:
 *   delete:
 *     summary: Remove uma fonte de renda pelo ID
 *     tags: [Fontes de Renda]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID único da fonte de renda
 *     responses:
 *       200:
 *         description: Fonte de renda removida com sucesso.
 *       404:
 *         description: Fonte de renda não encontrada.
 *       500:
 *         description: Erro interno no servidor.
 */

router.delete('/:id', async (req, res) => {
  const { id } = req.params;

  try {
    const deleteResult = await pool.query('DELETE FROM sources_of_incomes WHERE id = $1 RETURNING id', [id]);

    if (deleteResult.rows.length === 0) {
      return res.status(404).json({ error: 'Fonte de renda não encontrada.' });
    }

    return res.status(200).json({ message: 'Fonte de renda removida com sucesso.' });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'Erro ao remover fonte de renda.' });
  }
});

module.exports = router;