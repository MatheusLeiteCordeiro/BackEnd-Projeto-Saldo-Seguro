const express = require('express');
const router = express.Router();
const pool = require('../config/database');

// 1. Cadastrar nova despesa
router.post('/', async (req, res) => {
  const { user_id, title, amount, category, date, is_recurring } = req.body;

  if (!user_id || !title || !amount || !category || !date) {
    return res.status(400).json({ error: 'Preencha todos os campos obrigatórios da despesa.' });
  }

  try {
    const newExpense = await pool.query(
      `INSERT INTO expenses (user_id, title, amount, category, date, is_recurring) 
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
      [user_id, title, amount, category, date, is_recurring || false]
    );

    return res.status(201).json({
      message: 'Despesa cadastrada com sucesso!',
      expense: newExpense.rows[0]
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'Erro ao cadastrar despesa.' });
  }
});

// 2. Listar extrato de despesas (com suporte a filtro por mês/ano e busca por texto)
router.get('/:userId', async (req, res) => {
  const { userId } = req.params;
  const { month, year, search } = req.query; // Ex: ?month=09&year=2026&search=Supermercado

  try {
    let query = 'SELECT * FROM expenses WHERE user_id = $1';
    let params = [userId];
    let paramIndex = 2;

    // Filtro por mês e ano 
    if (month && year) {
      query += ` AND EXTRACT(MONTH FROM date) = $${paramIndex} AND EXTRACT(YEAR FROM date) = $${paramIndex + 1}`;
      params.push(month, year);
      paramIndex += 2;
    }

    // Filtro de busca por texto (barra "Buscar despesa...")
    if (search) {
      query += ` AND title ILIKE $${paramIndex}`;
      params.push(`%${search}%`);
      paramIndex += 1;
    }

    query += ' ORDER BY date DESC';

    const expensesResult = await pool.query(query, params);

    // Calcular o total de despesas do período filtrado
    const totalExpenses = expensesResult.rows.reduce((acc, item) => acc + parseFloat(item.amount), 0);

    return res.status(200).json({
      total_expenses: totalExpenses,
      expenses: expensesResult.rows
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'Erro ao buscar extrato de despesas.' });
  }
});

// 3. Resumo por categoria (Para alimentar o gráfico de rosca)
router.get('/:userId/categories-summary', async (req, res) => {
  const { userId } = req.params;
  const { month, year } = req.query;

  try {
    let query = `
      SELECT category, SUM(amount) as total_amount 
      FROM expenses 
      WHERE user_id = $1
    `;
    let params = [userId];

    if (month && year) {
      query += ` AND EXTRACT(MONTH FROM date) = $2 AND EXTRACT(YEAR FROM date) = $3`;
      params.push(month, year);
    }

    query += ` GROUP BY category ORDER BY total_amount DESC`;

    const summaryResult = await pool.query(query, params);

    // Calcular o total geral para transformar em percentuais (ex: 56%, 20%...)
    const totalGeneral = summaryResult.rows.reduce((acc, item) => acc + parseFloat(item.total_amount), 0);

    const categoriesWithPercentage = summaryResult.rows.map(item => {
      const amount = parseFloat(item.total_amount);
      const percentage = totalGeneral > 0 ? ((amount / totalGeneral) * 100).toFixed(1) : 0;
      return {
        category: item.category,
        total_amount: amount,
        percentage: parseFloat(percentage)
      };
    });

    return res.status(200).json({
      total_general: totalGeneral,
      categories: categoriesWithPercentage
    });

  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'Erro ao gerar resumo por categorias.' });
  }
});

// 4. Deletar uma despesa
router.delete('/:id', async (req, res) => {
  const { id } = req.params;

  try {
    const deleteResult = await pool.query('DELETE FROM expenses WHERE id = $1 RETURNING id', [id]);

    if (deleteResult.rows.length === 0) {
      return res.status(404).json({ error: 'Despesa não encontrada.' });
    }

    return res.status(200).json({ message: 'Despesa removida com sucesso.' });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'Erro ao remover despesa.' });
  }
});

module.exports = router;