const express = require('express');
const router = express.Router();
const pool = require('../config/database');

/**
 * @swagger
 * /home/{userId}:
 *   get:
 *     summary: Retorna todos os dados consolidados para a Tela Inicial (Home) do usuário
 *     tags: [Tela Inicial]
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
 *         description: Dados da tela inicial carregados com sucesso.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 greeting_name:
 *                   type: string
 *                   example: "Jade Andrade"
 *                 summary_cards:
 *                   type: object
 *                   properties:
 *                     available_balance:
 *                       type: number
 *                       example: 1250.00
 *                     monthly_income:
 *                       type: number
 *                       example: 3000.00
 *                     total_expenses:
 *                       type: number
 *                       example: 1750.00
 *                 month_summary:
 *                   type: object
 *                   properties:
 *                     days_completed:
 *                       type: integer
 *                       example: 16
 *                     days_remaining:
 *                       type: integer
 *                       example: 14
 *                     progress_percentage:
 *                       type: integer
 *                       example: 53
 *                     status:
 *                       type: string
 *                       example: "Situação saudável"
 *                 recent_expenses:
 *                   type: array
 *                   items:
 *                     type: object
 *                 main_goal:
 *                   type: object
 *                   properties:
 *                     title:
 *                       type: string
 *                       example: "Reserva de emergência"
 *                     current_amount:
 *                       type: number
 *                       example: 500.00
 *                     target_amount:
 *                       type: number
 *                       example: 2000.00
 *                     percentage:
 *                       type: integer
 *                       example: 25
 *       404:
 *         description: Usuário não encontrado.
 *       500:
 *         description: Erro interno no servidor.
 */

// Retorna todos os dados consolidados para a Tela Inicial (Home) do usuário
router.get('/:userId', async (req, res) => {
  const { userId } = req.params;
  const { month, year } = req.query; // Ex: ?month=09&year=2026

  const targetMonth = parseInt(month) || new Date().getMonth() + 1;
  const targetYear = parseInt(year) || new Date().getFullYear();
  const currentYM = `${targetYear}-${String(targetMonth).padStart(2, '0')}`;

  try {
    // 1. Dados do Usuário 
    const userResult = await pool.query('SELECT name FROM users WHERE id = $1', [userId]);
    const userName = userResult.rows.length > 0 ? userResult.rows[0].name : 'Usuário';

    // 2. Renda Mensal Total
    const incomeResult = await pool.query('SELECT SUM(amount) as total FROM sources_of_incomes WHERE user_id = $1', [userId]);
    const totalIncome = incomeResult.rows[0].total ? parseFloat(incomeResult.rows[0].total) : 0;

    // 3. Despesas do Mês Atual
    const expenseResult = await pool.query(
      `SELECT SUM(amount) as total FROM expenses 
       WHERE user_id = $1 AND TO_CHAR(date, 'YYYY-MM') = $2`,
      [userId, currentYM]
    );
    const totalExpenses = expenseResult.rows[0].total ? parseFloat(expenseResult.rows[0].total) : 0;

    // 4. Saldo Disponível
    const availableBalance = totalIncome - totalExpenses;

    // 5. Extrato Recente (Últimas 3 despesas para a listagem da Home)
    const recentExpenses = await pool.query(
      `SELECT * FROM expenses 
       WHERE user_id = $1 AND TO_CHAR(date, 'YYYY-MM') = $2 
       ORDER BY date DESC LIMIT 3`,
      [userId, currentYM]
    );

    // 6. Objetivo Principal (Ex: Reserva de emergência ou o primeiro objetivo cadastrado)
    const goalResult = await pool.query(
      'SELECT * FROM goals WHERE user_id = $1 ORDER BY id ASC LIMIT 1',
      [userId]
    );
    
    let mainGoal = null;
    if (goalResult.rows.length > 0) {
      const g = goalResult.rows[0];
      const target = parseFloat(g.target_amount);
      const current = parseFloat(g.current_amount);
      const percentage = target > 0 ? Math.min(Math.round((current / target) * 100), 100) : 0;
      mainGoal = {
        title: g.title,
        current_amount: current,
        target_amount: target,
        percentage: percentage
      };
    }

    // 7. Cálculo de Dias do Mês (Para o card "Resumo do mês": dias concluídos e restantes)
    const today = new Date();
    const currentDay = today.getDate();
    const totalDaysInMonth = new Date(targetYear, targetMonth, 0).getDate();
    const remainingDays = Math.max(totalDaysInMonth - currentDay, 0);

    // Porcentagem do mês decorrida (para o gráfico circular de 68%)
    const monthProgressPercentage = Math.round((currentDay / totalDaysInMonth) * 100);

    // Status da saúde financeira (simples baseada no consumo da renda)
    const expenseRatio = totalIncome > 0 ? (totalExpenses / totalIncome) * 100 : 0;
    let financialStatus = "Situação saudável";
    if (expenseRatio > 80) financialStatus = "Atenção aos gastos";
    else if (expenseRatio > 50) financialStatus = "Situação estável";

    // --- RESPOSTA CONSOLIDADA PARA A TELA INICIAL ---
    return res.status(200).json({
      greeting_name: userName,
      summary_cards: {
        available_balance: availableBalance,
        monthly_income: totalIncome,
        total_expenses: totalExpenses
      },
      month_summary: {
        days_completed: currentDay,
        days_remaining: remainingDays,
        progress_percentage: monthProgressPercentage,
        status: financialStatus
      },
      recent_expenses: recentExpenses.rows,
      main_goal: mainGoal
    });

  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'Erro ao carregar dados da tela inicial.' });
  }
});

module.exports = router;