const express = require('express');
const router = express.Router();
const pool = require('../config/database');

// 1. Listar todos os objetivos do usuário (e calcular o total acumulado geral)
/**
 * @swagger
 * /goals/{userId}:
 *   get:
 *     summary: Lista todos os objetivos do usuário e calcula o total acumulado geral
 *     tags: [Objetivos]
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID único do usuário
 *     responses:
 *       200:
 *         description: Lista de objetivos retornada com sucesso.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 total_accumulated:
 *                   type: number
 *                   example: 3250.00
 *                 goals:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: integer
 *                         example: 1
 *                       title:
 *                         type: string
 *                         example: "Comprar um carro"
 *                       target_amount:
 *                         type: number
 *                         example: 12000.00
 *                       current_amount:
 *                         type: number
 *                         example: 3000.00
 *                       percentage:
 *                         type: integer
 *                         example: 25
 *       500:
 *         description: Erro interno no servidor.
 */

router.get('/:userId', async (req, res) => {
  const { userId } = req.params;

  try {
    const goalsResult = await pool.query(
      'SELECT * FROM goals WHERE user_id = $1 ORDER BY id DESC',
      [userId]
    );

    // Calcular o total acumulado em *todos* os objetivos
    const totalAccumulated = goalsResult.rows.reduce(
      (acc, item) => acc + parseFloat(item.current_amount), 
      0
    );

    // Adicionar a porcentagem de progresso de cada objetivo individualmente
    const goalsWithProgress = goalsResult.rows.map(goal => {
      const target = parseFloat(goal.target_amount);
      const current = parseFloat(goal.current_amount);
      const percentage = target > 0 ? Math.min(Math.round((current / target) * 100), 100) : 0;

      return {
        ...goal,
        percentage
      };
    });

    return res.status(200).json({
      total_accumulated: totalAccumulated,
      goals: goalsWithProgress
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'Erro ao buscar objetivos.' });
  }
});

// 2. Criar um novo objetivo
/**
 * @swagger
 * /goals:
 *   post:
 *     summary: Cria um novo objetivo financeiro
 *     tags: [Objetivos]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - user_id
 *               - title
 *               - target_amount
 *             properties:
 *               user_id:
 *                 type: integer
 *                 example: 1
 *               title:
 *                 type: string
 *                 example: "Comprar um carro"
 *               target_amount:
 *                 type: number
 *                 example: 12000.00
 *               current_amount:
 *                 type: number
 *                 example: 3000.00
 *               category:
 *                 type: string
 *                 example: "Carro"
 *               deadline:
 *                 type: string
 *                 format: date
 *                 example: "2027-12-31"
 *     responses:
 *       201:
 *         description: Objetivo criado com sucesso!
 *       400:
 *         description: Campos obrigatórios faltando.
 *       500:
 *         description: Erro interno no servidor.
 */

router.post('/', async (req, res) => {
  const { user_id, title, target_amount, current_amount, category, deadline } = req.body;

  if (!user_id || !title || !target_amount) {
    return res.status(400).json({ error: 'Usuário, título e valor alvo são obrigatórios.' });
  }

  try {
    const newGoal = await pool.query(
      `INSERT INTO goals (user_id, title, target_amount, current_amount, category, deadline) 
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
      [
        user_id, 
        title, 
        target_amount, 
        current_amount || 0.00, 
        category || 'Personalizado', 
        deadline || null
      ]
    );

    return res.status(201).json({
      message: 'Objetivo criado com sucesso!',
      goal: newGoal.rows[0]
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'Erro ao criar objetivo.' });
  }
});

// 3. Atualizar o valor acumulado de um objetivo (ex: quando o usuário guarda mais dinheiro nele)
/**
 * @swagger
 * /goals/{id}/deposit:
 *   put:
 *     summary: Atualiza o valor acumulado (depósito) de um objetivo específico
 *     tags: [Objetivos]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID único do objetivo
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - amount_added
 *             properties:
 *               amount_added:
 *                 type: number
 *                 example: 500.00
 *     responses:
 *       200:
 *         description: Progresso do objetivo atualizado com sucesso.
 *       400:
 *         description: Valor inválido informado.
 *       404:
 *         description: Objetivo não encontrado.
 *       500:
 *         description: Erro interno no servidor.
 */

router.put('/:id/deposit', async (req, res) => {
  const { id } = req.params;
  const { amount_added } = req.body;

  if (amount_added === undefined || amount_added <= 0) {
    return res.status(400).json({ error: 'Informe um valor válido para adicionar ao objetivo.' });
  }

  try {
    const updateResult = await pool.query(
      `UPDATE goals 
       SET current_amount = current_amount + $1 
       WHERE id = $2 
       RETURNING *`,
      [amount_added, id]
    );

    if (updateResult.rows.length === 0) {
      return res.status(404).json({ error: 'Objetivo não encontrado.' });
    }

    return res.status(200).json({
      message: 'Progresso do objetivo atualizado com sucesso!',
      goal: updateResult.rows[0]
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'Erro ao atualizar objetivo.' });
  }
});

// 4. Deletar um objetivo
/**
 * @swagger
 * /goals/{id}:
 *   delete:
 *     summary: Remove um objetivo pelo ID
 *     tags: [Objetivos]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID único do objetivo
 *     responses:
 *       200:
 *         description: Objetivo removido com sucesso.
 *       404:
 *         description: Objetivo não encontrado.
 *       500:
 *         description: Erro interno no servidor.
 */

router.delete('/:id', async (req, res) => {
  const { id } = req.params;

  try {
    const deleteResult = await pool.query('DELETE FROM goals WHERE id = $1 RETURNING id', [id]);

    if (deleteResult.rows.length === 0) {
      return res.status(404).json({ error: 'Objetivo não encontrado.' });
    }

    return res.status(200).json({ message: 'Objetivo removido com sucesso.' });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'Erro ao remover objetivo.' });
  }
});

module.exports = router;