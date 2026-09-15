const express = require('express');
const router = express.Router();
const pool = require('../config/database');

// Rota para calcular o saldo disponível e o limite semanal do usuário
router.get('/:userId', async (req, res) => {
  const { userId } = req.params;

  try {
    // 1. Buscar renda mensal e reserva financeira do usuário
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

    // 2. Somar todas as despesas do usuário
    const expensesResult = await pool.query(
      'SELECT SUM(amount) as total_expenses FROM expenses WHERE user_id = $1',
      [userId]
    );
    const totalExpenses = Number(expensesResult.rows[0].total_expenses || 0);

    // 3. Somar o valor das parcelas ativas do usuário
    const installmentsResult = await pool.query(
      'SELECT SUM(installment_value) as total_installments FROM installments WHERE user_id = $1',
      [userId]
    );
    const totalInstallments = Number(installmentsResult.rows[0].total_installments || 0);

    // 4. Aplicar o Cálculo Principal: Saldo Disponível
    // Fórmula: Saldo disponível = Renda mensal - Valor reservado - Despesas - Parcelamentos
    const availableBalance = income - savings - totalExpenses - totalInstallments;

    // 5. Calcular o Limite Semanal (considerando 4 semanas restantes no mês)
    const remainingWeeks = 4;
    const weeklyLimit = availableBalance > 0 ? Number((availableBalance / remainingWeeks).toFixed(2)) : 0;

    return res.status(200).json({
      user_id: Number(userId),
      summary: {
        monthly_income: income,
        savings_goal: savings,
        total_expenses: totalExpenses,
        total_installments: totalInstallments
      },
      calculations: {
        available_balance: Number(availableBalance.toFixed(2)),
        weekly_limit: weeklyLimit,
        weeks_considered: remainingWeeks
      }
    });

  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'Erro interno no servidor ao realizar cálculos financeiros.' });
  }
});

module.exports = router;