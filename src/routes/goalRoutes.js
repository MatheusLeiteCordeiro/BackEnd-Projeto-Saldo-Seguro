const express = require('express');
const router = express.Router();
const pool = require('../config/database');

// 1. Listar todos os objetivos do usuário (e calcular o total acumulado geral)
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