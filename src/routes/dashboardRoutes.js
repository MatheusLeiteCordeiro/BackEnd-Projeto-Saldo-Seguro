const express = require('express');
const router = express.Router();
const pool = require('../config/database');

// Rota para fornecer todos os dados agregados do Dashboard do usuário
router.get('/:userId', async (req, res) => {
  const { userId } = req.params;

  try {
    // 1. Buscar perfil financeiro (renda e reserva)
    const profileResult = await pool.query(
      'SELECT monthly_income, savings_goal FROM financial_profiles WHERE user_id = $1',
      [userId]
    );

    if (profileResult.rows.length === 0) {
      return res.status(404).json({ error: 'Perfil financeiro não encontrado para este usuário.' });
    }

    const { monthly_income, savings_goal } = profileResult.rows[0];
    const income = Number(monthly_income);
    const savings = Number(savings_goal);

    // 2. Buscar todas as despesas
    const expensesResult = await pool.query(
      'SELECT * FROM expenses WHERE user_id = $1 ORDER BY id DESC',
      [userId]
    );
    const expenses = expensesResult.rows;
    const totalExpenses = expenses.reduce((acc, curr) => acc + Number(curr.amount), 0);

    // 3. Buscar todas as compras parceladas
    const installmentsResult = await pool.query(
      'SELECT * FROM installments WHERE user_id = $1 ORDER BY id DESC',
      [userId]
    );
    const installments = installmentsResult.rows;
    const totalInstallments = installments.reduce((acc, curr) => acc + Number(curr.installment_value), 0);

    // 4. Executar o cálculo do saldo disponível e limite semanal
    const availableBalance = income - savings - totalExpenses - totalInstallments;
    const remainingWeeks = 4;
    const weeklyLimit = availableBalance > 0 ? Number((availableBalance / remainingWeeks).toFixed(2)) : 0;

    // 5. Retornar o pacote completo para o Dashboard
    return res.status(200).json({
      user_id: Number(userId),
      financial_profile: {
        monthly_income: income,
        savings_goal: savings
      },
      totals: {
        expenses: Number(totalExpenses.toFixed(2)),
        installments: Number(totalInstallments.toFixed(2)),
        available_balance: Number(availableBalance.toFixed(2)),
        weekly_limit: weeklyLimit
      },
      lists: {
        expenses,
        installments
      }
    });

  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'Erro interno no servidor ao carregar o dashboard.' });
  }
});

module.exports = router;