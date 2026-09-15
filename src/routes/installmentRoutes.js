const express = require('express');
const router = express.Router();
const pool = require('../config/database');

// 1. Cadastrar nova compra parcelada
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