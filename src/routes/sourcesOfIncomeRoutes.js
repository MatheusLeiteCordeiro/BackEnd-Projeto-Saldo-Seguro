const express = require('express');
const router = express.Router();
const pool = require('../config/database');

// 1. Listar todas as fontes de renda de um usuário (e calcular o total mensal)
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