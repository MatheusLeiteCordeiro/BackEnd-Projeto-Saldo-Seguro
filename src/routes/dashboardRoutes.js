const express = require('express');
const router = express.Router();
const pool = require('../config/database');

// Rota para fornecer todos os dados agregados do Dashboard do usuário
/**
 * @swagger
 * /reports/{userId}:
 *   get:
 *     summary: Fornece todos os dados agregados do Dashboard e Relatórios do usuário
 *     tags: [Relatórios e Dashboard]
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID único do usuário
 *       - in: query
 *         name: month
 *         required: false
 *         schema:
 *           type: string
 *         description: Mês de referência (ex. 09)
 *       - in: query
 *         name: year
 *         required: false
 *         schema:
 *           type: string
 *         description: Ano de referência (ex. 2026)
 *     responses:
 *       200:
 *         description: Dados do relatório consolidados com sucesso.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 selected_period:
 *                   type: string
 *                   example: "09/2026"
 *                 summary:
 *                   type: object
 *                   properties:
 *                     total_receitas:
 *                       type: number
 *                       example: 3000.00
 *                     total_despesas:
 *                       type: number
 *                       example: 1750.00
 *                     saldo_mes:
 *                       type: number
 *                       example: 1250.00
 *                 historical_expenses:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       year_month:
 *                         type: string
 *                         example: "2026-09"
 *                       total_expense:
 *                         type: string
 *                         example: "1750.00"
 *       500:
 *         description: Erro interno ao gerar dados do relatório.
 */
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