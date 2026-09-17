const express = require('express');
const cors = require('cors');
require('dotenv').config();

// Importando a conexão com o banco (que já inicializa as tabelas)
require('./config/database');

// Importando os arquivos de rotas
const financeRoutes = require('./routes/financeRoutes');
const authRoutes = require('./routes/authRoutes'); 
const expenseRoutes = require('./routes/expenseRoutes');
const userRoutes = require('./routes/userRoutes');
const installmentRoutes = require('./routes/installmentRoutes');
const calculationRoutes = require('./routes/calculationRoutes');
const dashboardRoutes = require('./routes/dashboardRoutes');
const classificationRoutes = require('./routes/classificationRoutes');
const sourcesOfIncomeRoutes = require('./routes/sourcesOfIncomeRoutes');
const goalRoutes = require('./routes/goalRoutes');
const reportRoutes = require('./routes/reportRoutes');
const homeRoutes = require('./routes/homeRoutes');


const app = express();
const PORT = process.env.PORT || 3000;

// Configuração do Middleware
app.use(express.json());
app.use(cors());

// Importando a configuração do Swagger
const setupSwagger = require('./config/swagger');

// Rotas da aplicação com seus prefixos
app.use('/finances', financeRoutes);
app.use('/auth', authRoutes);
app.use('/expenses', expenseRoutes);
app.use('/users', userRoutes);
app.use('/installments', installmentRoutes);
app.use('/calculations', calculationRoutes);
app.use('/dashboard', dashboardRoutes);
app.use('/classification', classificationRoutes);
app.use('/sourceOfIncomes', sourcesOfIncomeRoutes);
app.use('/goals', goalRoutes);
app.use('/reports', reportRoutes);
app.use('/home', homeRoutes);

// Inicializa a documentação Swagger
setupSwagger(app);

// Rota de teste geral
app.get('/', (req, res) => {
  res.json({ message: 'API do Saldo Seguro (PostgreSQL) modularizada rodando com sucesso!' });
});

// Inicializando o servidor
app.listen(PORT, () => {
  console.log(`Servidor rodando na porta ${PORT}`);
});