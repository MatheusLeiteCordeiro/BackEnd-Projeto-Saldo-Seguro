const express = require('express');
const router = express.Router();
const pool = require('../config/database');

// 1. Cadastrar nova compra parcelada
/**
 * @swagger
 * /installments:
 *   post:
 *     summary: Cadastra uma nova compra parcelada
 *     tags: [Parcelamentos]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - user_id
 *               - title
 *               - total_amount
 *               - installments_count
 *               - category
 *               - first_due_date
 *             properties:
 *               user_id:
 *                 type: integer
 *                 example: 1
 *               title:
 *                 type: string
 *                 example: "Smartphone Novo"
 *               total_amount:
 *                 type: number
 *                 example: 1200.00
 *               installments_count:
 *                 type: integer
 *                 example: 10
 *               category:
 *                 type: string
 *                 example: "Eletrônicos"
 *               first_due_date:
 *                 type: string
 *                 format: date
 *                 example: "2026-10-10"
 *     responses:
 *       201:
 *         description: Compra parcelada cadastrada com sucesso!
 *       400:
 *         description: Campos obrigatórios faltando.
 *       500:
 *         description: Erro interno no servidor.
 */

router.post('/', async (req, res) => {
  const { user_id, description, total_amount, installments_count } = req.body;

  if (!user_id || !description || total_amount === undefined || !installments_count) {
    return res.status(400).json({ error: 'Preencha todos os campos obrigatórios da compra parcelada.' });
  }

  if (total_amount <= 0 || installments_count <= 0) {
    return res.status(400).json({ error: 'O valor total e a quantidade de parcelas devem ser maiores que zero.' });
  }

  try {
    // Cálculo automático do valor de cada parcela
    const installment_value = Number((total_amount / installments_count).toFixed(2));

    const newInstallment = await pool.query(
      `INSERT INTO installments (user_id, description, total_amount, installments_count, installment_value) 
       VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [user_id, description, total_amount, installments_count, installment_value]
    );

    return res.status(201).json({
      message: 'Compra parcelada cadastrada com sucesso!',
      installment: newInstallment.rows[0]
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'Erro interno no servidor.' });
  }
});

// 2. Listar todas as compras parceladas de um usuário
/**
 * @swagger
 * /installments/{userId}:
 *   get:
 *     summary: Lista todas as compras parceladas de um usuário
 *     tags: [Parcelamentos]
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID único do usuário
 *     responses:
 *       200:
 *         description: Lista de compras parceladas retornada com sucesso.
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
 *                   title:
 *                     type: string
 *                     example: "Smartphone Novo"
 *                   total_amount:
 *                     type: number
 *                     example: 1200.00
 *                   installments_count:
 *                     type: integer
 *                     example: 10
 *                   installment_value:
 *                     type: number
 *                     example: 120.00
 *                   category:
 *                     type: string
 *                     example: "Eletrônicos"
 *       500:
 *         description: Erro interno no servidor.
 */

router.get('/:userId', async (req, res) => {
  const { userId } = req.params;

  try {
    const installments = await pool.query(
      'SELECT * FROM installments WHERE user_id = $1 ORDER BY id DESC',
      [userId]
    );

    return res.status(200).json(installments.rows);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'Erro interno no servidor.' });
  }
});

// 3. Excluir uma compra parcelada
/**
 * @swagger
 * /installments/{id}:
 *   delete:
 *     summary: Remove uma compra parcelada pelo ID
 *     tags: [Parcelamentos]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID único da compra parcelada
 *     responses:
 *       200:
 *         description: Compra parcelada removida com sucesso.
 *       404:
 *         description: Compra parcelada não encontrada.
 *       500:
 *         description: Erro interno no servidor.
 */

router.delete('/:id', async (req, res) => {
  const { id } = req.params;

  try {
    const deleted = await pool.query(
      'DELETE FROM installments WHERE id = $1 RETURNING *',
      [id]
    );

    if (deleted.rows.length === 0) {
      return res.status(404).json({ error: 'Compra parcelada não encontrada.' });
    }

    return res.status(200).json({ message: 'Compra parcelada excluída com sucesso!' });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'Erro interno no servidor.' });
  }
});

module.exports = router;