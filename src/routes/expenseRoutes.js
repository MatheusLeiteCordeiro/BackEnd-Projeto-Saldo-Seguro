const express = require('express');
const router = express.Router();
const pool = require('../config/database');

// 1. Cadastrar nova despesa
router.post('/', async (req, res) => {
  const { user_id, description, amount, category, type } = req.body;

  if (!user_id || !description || amount === undefined || !type) {
    return res.status(400).json({ error: 'Preencha todos os campos obrigatórios da despesa.' });
  }

  if (amount <= 0) {
    return res.status(400).json({ error: 'O valor da despesa deve ser maior que zero.' });
  }

  try {
    const newExpense = await pool.query(
      `INSERT INTO expenses (user_id, description, amount, category, type) 
       VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [user_id, description, amount, category, type]
    );

    return res.status(201).json({
      message: 'Despesa cadastrada com sucesso!',
      expense: newExpense.rows[0]
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'Erro interno no servidor.' });
  }
});

// 2. Listar todas as despesas de um usuário
router.get('/:userId', async (req, res) => {
  const { userId } = req.params;

  try {
    const expenses = await pool.query(
      'SELECT * FROM expenses WHERE user_id = $1 ORDER BY id DESC',
      [userId]
    );

    return res.status(200).json(expenses.rows);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'Erro interno no servidor.' });
  }
});

// 3. Editar uma despesa
router.put('/:id', async (req, res) => {
  const { id } = req.params;
  const { description, amount, category, type } = req.body;

  if (!description || amount === undefined || !type) {
    return res.status(400).json({ error: 'Preencha os campos obrigatórios para atualização.' });
  }

  try {
    const updatedExpense = await pool.query(
      `UPDATE expenses 
       SET description = $1, amount = $2, category = $3, type = $4 
       WHERE id = $5 RETURNING *`,
      [description, amount, category, type, id]
    );

    if (updatedExpense.rows.length === 0) {
      return res.status(404).json({ error: 'Despesa não encontrada.' });
    }

    return res.status(200).json({
      message: 'Despesa atualizada com sucesso!',
      expense: updatedExpense.rows[0]
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'Erro interno no servidor.' });
  }
});

// 4. Excluir uma despesa
router.delete('/:id', async (req, res) => {
  const { id } = req.params;

  try {
    const deletedExpense = await pool.query(
      'DELETE FROM expenses WHERE id = $1 RETURNING *',
      [id]
    );

    if (deletedExpense.rows.length === 0) {
      return res.status(404).json({ error: 'Despesa não encontrada.' });
    }

    return res.status(200).json({ message: 'Despesa excluída com sucesso!' });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'Erro interno no servidor.' });
  }
});

module.exports = router;