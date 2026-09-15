const express = require('express');
const router = express.Router();
const pool = require('../config/database');

// Atualizar ou salvar a renda mensal e a reserva financeira do usuário
router.put('/:userId', async (req, res) => {
  const { userId } = req.params;
  const { monthly_income, savings_goal } = req.body;

  // Validações básicas
  if (monthly_income === undefined || savings_goal === undefined) {
    return res.status(400).json({ error: 'Renda mensal e meta de reserva são obrigatórias.' });
  }

  if (monthly_income < 0 || savings_goal < 0) {
    return res.status(400).json({ error: 'Os valores financeiros não podem ser negativos.' });
  }

  try {
    // Atualiza os dados na tabela financial_profiles para o usuário específico
    const updateResult = await pool.query(
      `UPDATE financial_profiles 
       SET monthly_income = $1, savings_goal = $2 
       WHERE user_id = $3 
       RETURNING *`,
      [monthly_income, savings_goal, userId]
    );

    if (updateResult.rows.length === 0) {
      return res.status(404).json({ error: 'Perfil financeiro não encontrado para este usuário.' });
    }

    return res.status(200).json({
      message: 'Dados financeiros atualizados com sucesso!',
      financialProfile: updateResult.rows.shift()
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'Erro interno no servidor.' });
  }
});

// Rota para consultar os dados financeiros do usuário
router.get('/:userId', async (req, res) => {
  const { userId } = req.params;

  try {
    const result = await pool.query('SELECT * FROM financial_profiles WHERE user_id = $1', [userId]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Perfil financeiro não encontrado.' });
    }

    return res.status(200).json(result.rows[0]);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'Erro interno no servidor.' });
  }
});

module.exports = router;