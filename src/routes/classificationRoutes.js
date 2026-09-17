const express = require('express');
const router = express.Router();
const pool = require('../config/database');

// Rota para analisar os dados financeiros e retornar a classificação da situação do usuário
/**
 * @swagger
 * /classification/{userId}:
 *   get:
 *     summary: Analisa os dados financeiros e retorna a classificação da situação do usuário
 *     tags: [Classificação Financeira]
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID único do usuário
 *     responses:
 *       200:
 *         description: Análise e classificação financeira realizadas com sucesso.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: "Saudável"
 *                 message:
 *                   type: string
 *                   example: "Suas finanças estão sob controle. Parabéns!"
 *                 total_income:
 *                   type: number
 *                   example: 3000.00
 *                 total_expenses:
 *                   type: number
 *                   example: 1250.00
 *                 expense_percentage:
 *                   type: number
 *                   example: 41.7
 *       404:
 *         description: Dados financeiros ou usuário não encontrados.
 *       500:
 *         description: Erro interno no servidor.
 */
router.get('/:userId', async (req, res) => {
  // ... seu código atual da rota ...
});
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

    // Se a renda for zero, tratamos o cenário inicial para evitar divisão por zero
    if (income <= 0) {
      return res.status(200).json({
        user_id: Number(userId),
        classification: 'Crítico',
        message: 'A renda mensal cadastrada é zero ou inválida.',
        available_balance: 0
      });
    }

    // 2. Somar despesas
    const expensesResult = await pool.query(
      'SELECT SUM(amount) as total_expenses FROM expenses WHERE user_id = $1',
      [userId]
    );
    const totalExpenses = Number(expensesResult.rows[0].total_expenses || 0);

    // 3. Somar parcelamentos
    const installmentsResult = await pool.query(
      'SELECT SUM(installment_value) as total_installments FROM installments WHERE user_id = $1',
      [userId]
    );
    const totalInstallments = Number(installmentsResult.rows[0].total_installments || 0);

    // 4. Calcular o Saldo Disponível
    const availableBalance = income - savings - totalExpenses - totalInstallments;

    // 5. Aplicar as Regras de Classificação Financeira
    let status = 'Crítico';
    let descriptionMessage = 'Os gastos se aproximam ou ultrapassam a renda disponível.';
    const marginPercentage = (availableBalance / income) * 100;

    if (availableBalance > 0) {
      if (marginPercentage >= 30) {
        status = 'Saudável';
        descriptionMessage = 'Você possui uma margem confortável de dinheiro disponível após considerar suas despesas e reserva.';
      } else {
        status = 'Atenção';
        descriptionMessage = 'Uma parcela significativa da sua renda está comprometida.';
      }
    }

    return res.status(200).json({
      user_id: Number(userId),
      available_balance: Number(availableBalance.toFixed(2)),
      margin_percentage: Number(marginPercentage.toFixed(2)),
      classification: status,
      message: descriptionMessage
    });

  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'Erro interno no servidor ao processar a classificação financeira.' });
  }
});

module.exports = router;