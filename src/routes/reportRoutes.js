const express = require('express');
const router = express.Router();
const pool = require('../config/database');

// Rota de Relatório Consolidado para o Dashboard/Relatórios
router.get('/:userId', async (req, res) => {
  const { userId } = req.params;
  const { month, year } = req.query; 

  // Se não passar mês/ano, pega o mês atual do sistema
  const currentMonth = month || String(new Date().getMonth() + 1).padStart(2, '0');
  const currentYear = year || String(new Date().getFullYear());

  try {
    // 1. Total de Receitas do mês selecionado
    const incomeResult = await pool.query(
      'SELECT SUM(amount) as total FROM sources_of_incomes WHERE user_id = $1',
      [userId]
    );
    const totalReceitas = incomeResult.rows[0].total ? parseFloat(incomeResult.rows[0].total) : 0;

    // 2. Total de Despesas do mês selecionado
    const expenseResult = await pool.query(
      `SELECT SUM(amount) as total FROM expenses 
       WHERE user_id = $1 AND EXTRACT(MONTH FROM date) = $2 AND EXTRACT(YEAR FROM date) = $3`,
      [userId, currentMonth, currentYear]
    );
    const totalDespesas = expenseResult.rows[0].total ? parseFloat(expenseResult.rows[0].total) : 0;

    // 3. Cálculo do Saldo do Mês (Receitas - Despesas)
    const saldoMes = totalReceitas - totalDespesas;

    // 4. Histórico para o Gráfico de Barras (Últimos meses: Receitas x Despesas)
    const historyResult = await pool.query(
      `SELECT 
         TO_CHAR(date, 'YYYY-MM') as year_month,
         SUM(amount) as total_expense
       FROM expenses 
       WHERE user_id = $1 
       GROUP BY year_month 
       ORDER BY year_month ASC 
       LIMIT 6`,
      [userId]
    );

    return res.status(200).json({
      selected_period: `${currentMonth}/${currentYear}`,
      summary: {
        total_receitas: totalReceitas,
        total_despesas: totalDespesas,
        saldo_mes: saldoMes
      },
      historical_expenses: historyResult.rows
    });

  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'Erro ao gerar dados do relatório.' });
  }
});

// 1. Rota para o Gráfico de Barras: Comparativo Histórico (Receitas x Despesas por mês)
router.get('/:userId/chart-comparison', async (req, res) => {
  const { userId } = req.params;

  try {
    
    const incomeResult = await pool.query(
      'SELECT SUM(amount) as total_income FROM sources_of_incomes WHERE user_id = $1',
      [userId]
    );
    const monthlyIncome = incomeResult.rows[0].total_income ? parseFloat(incomeResult.rows[0].total_income) : 0;

    // Buscar o histórico de despesas agrupadas por mês (últimos 6 meses)
    const expensesHistory = await pool.query(
      `SELECT 
         TO_CHAR(date, 'YYYY-MM') as year_month,
         TO_CHAR(date, 'Mon') as month_name,
         SUM(amount) as total_expense
       FROM expenses 
       WHERE user_id = $1 
       GROUP BY year_month, month_name 
       ORDER BY year_month ASC 
       LIMIT 6`,
      [userId]
    );

    // Monta o array combinando a renda fixa recorrente com a despesa de cada mês 
    const chartData = expensesHistory.rows.map(item => ({
      period: item.year_month,
      month_label: item.month_name,
      receitas: monthlyIncome, // Receita estimada/recorrente para o mês
      despesas: parseFloat(item.total_expense)
    }));

    return res.status(200).json(chartData);

  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'Erro ao gerar dados para o gráfico de comparação.' });
  }
});

// 2. Rota para o Gráfico de Rosca: Despesas por Categoria (com porcentagens)
router.get('/:userId/chart-categories', async (req, res) => {
  const { userId } = req.params;
  const { month, year } = req.query; // Ex: ?month=09&year=2026

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

    // Calcular o total geral do período para extrair as fatias percentuais 
    const totalGeneral = summaryResult.rows.reduce((acc, item) => acc + parseFloat(item.total_amount), 0);

    const categoriesChart = summaryResult.rows.map(item => {
      const amount = parseFloat(item.total_amount);
      const percentage = totalGeneral > 0 ? ((amount / totalGeneral) * 100).toFixed(1) : 0;
      return {
        category: item.category,
        amount: amount,
        percentage: parseFloat(percentage)
      };
    });

    return res.status(200).json({
      total_general: totalGeneral,
      categories: categoriesChart
    });

  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'Erro ao gerar dados para o gráfico de categorias.' });
  }
});

// Rota para calcular o resumo com variações percentuais em relação ao mês anterior
router.get('/:userId/monthly-comparison', async (req, res) => {
  const { userId } = req.params;
  const { month, year } = req.query; // Ex: ?month=09&year=2026

  // Define o mês/ano atual base ou o padrão enviado por query
  const targetMonth = parseInt(month) || new Date().getMonth() + 1;
  const targetYear = parseInt(year) || new Date().getFullYear();

  // Calcula o mês e ano anterior
  let prevMonth = targetMonth - 1;
  let prevYear = targetYear;
  if (prevMonth === 0) {
    prevMonth = 12;
    prevYear -= 1;
  }

  const formatMonthYear = (m, y) => `${y}-${String(m).padStart(2, '0')}`;
  const currentYM = formatMonthYear(targetMonth, targetYear);
  const previousYM = formatMonthYear(prevMonth, prevYear);

  try {
    // --- 1. RECEITAS: Mês Atual vs Mês Anterior ---
    // (Considerando a soma das rendas ativas ou histórico)
    const incomeResult = await pool.query(
      'SELECT SUM(amount) as total FROM sources_of_incomes WHERE user_id = $1',
      [userId]
    );
    const totalReceitasAtual = incomeResult.rows[0].total ? parseFloat(incomeResult.rows[0].total) : 0;
    const totalReceitasAnterior = totalReceitasAtual; 

    // --- 2. DESPESAS: Mês Atual vs Mês Anterior ---
    const expenseCurrentResult = await pool.query(
      `SELECT SUM(amount) as total FROM expenses 
       WHERE user_id = $1 AND TO_CHAR(date, 'YYYY-MM') = $2`,
      [userId, currentYM]
    );
    const totalDespesasAtual = expenseCurrentResult.rows[0].total ? parseFloat(expenseCurrentResult.rows[0].total) : 0;

    const expensePrevResult = await pool.query(
      `SELECT SUM(amount) as total FROM expenses 
       WHERE user_id = $1 AND TO_CHAR(date, 'YYYY-MM') = $2`,
      [userId, previousYM]
    );
    const totalDespesasAnterior = expensePrevResult.rows[0].total ? parseFloat(expensePrevResult.rows[0].total) : 0;

    // --- 3. SALDO DO MÊS: Mês Atual vs Mês Anterior ---
    const saldoAtual = totalReceitasAtual - totalDespesasAtual;
    const saldoAnterior = totalReceitasAnterior - totalDespesasAnterior;

    // Função auxiliar para calcular a porcentagem de variação com segurança contra divisão por zero
    const calculatePercentageChange = (current, previous) => {
      if (previous === 0) return current > 0 ? 100 : 0;
      return parseFloat((((current - previous) / previous) * 100).toFixed(1));
    };

    const receitaVariation = calculatePercentageChange(totalReceitasAtual, totalReceitasAnterior);
    const despesaVariation = calculatePercentageChange(totalDespesasAtual, totalDespesasAnterior);
    const saldoVariation = calculatePercentageChange(saldoAtual, saldoAnterior);

   // --- 4. INSIGHT INTELIGENTE DINÂMICO (Varredura de todas as categorias) ---
    const categoryQuery = `
      SELECT category,
        SUM(CASE WHEN TO_CHAR(date, 'YYYY-MM') = $2 THEN amount ELSE 0 END) as current_amount,
        SUM(CASE WHEN TO_CHAR(date, 'YYYY-MM') = $3 THEN amount ELSE 0 END) as prev_amount
      FROM expenses 
      WHERE user_id = $1
      GROUP BY category
    `;
    const categoryResult = await pool.query(categoryQuery, [userId, currentYM, previousYM]);
    
    let insightMessage = "Continue mantendo o controle dos seus gastos!";
    let targetCategory = "Geral";

    if (categoryResult.rows.length > 0) {
      // Mapeia e calcula a variação de cada categoria
      const categoriesVariations = categoryResult.rows.map(cat => {
        const cur = parseFloat(cat.current_amount) || 0;
        const prev = parseFloat(cat.prev_amount) || 0;
        const variation = calculatePercentageChange(cur, prev);
        return { category: cat.category, variation, cur, prev };
      });

      // Ordena para encontrar a categoria que teve a MAIOR REDUÇÃO (menor variação percentual / mais negativa)
      categoriesVariations.sort((a, b) => a.variation - b.variation);

      const bestCategory = categoriesVariations[0]; // A que mais diminuiu os gastos

      if (bestCategory && bestCategory.variation < 0 && bestCategory.prev > 0) {
        targetCategory = bestCategory.category;
        insightMessage = `Você gastou ${Math.abs(bestCategory.variation)}% menos com ${targetCategory.toLowerCase()} este mês. Continue assim!`;
      } else if (bestCategory && bestCategory.variation > 0) {
        // Se nenhuma reduziu, pega a que mais subiu para alertar
        targetCategory = bestCategory.category;
        insightMessage = `Atenção: seus gastos com ${targetCategory.toLowerCase()} subiram ${bestCategory.variation}% este mês.`;
      }
    }

    // --- 5. RESPOSTA CONSOLIDADA ---
    return res.status(200).json({
      period: currentYM,
      previous_period: previousYM,
      cards: {
        receitas: {
          total: totalReceitasAtual,
          variation_percentage: receitaVariation,
          formatted_variation: `${receitaVariation >= 0 ? '+' : ''}${receitaVariation}% em relação ao mês anterior`
        },
        despesas: {
          total: totalDespesasAtual,
          variation_percentage: despesaVariation,
          formatted_variation: `${despesaVariation >= 0 ? '+' : ''}${despesaVariation}% em relação ao mês anterior`
        },
        saldo: {
          total: saldoAtual,
          variation_percentage: saldoVariation,
          formatted_variation: `${saldoVariation >= 0 ? '+' : ''}${saldoVariation}% em relação ao mês anterior`
        }
      },
      insight: {
        category: targetCategory, // Categoria dinâmica que teve maior destaque (queda ou alta)
        message: insightMessage
      }
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'Erro ao calcular comparativos mensais.' });
  }
});

module.exports = router;