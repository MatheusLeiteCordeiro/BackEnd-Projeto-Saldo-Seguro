const swaggerJSDoc = require('swagger-jsdoc');
const swaggerUi = require('swagger-ui-express');

// Configuração básica do Swagger/OpenAPI
const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'API do Saldo Seguro - Financeiro',
      version: '1.0.0',
      description: 'Documentação oficial das rotas do backend do aplicativo Saldo Seguro (Projeto IFPE)[cite: 1].',
    },
    servers: [
      {
        url: 'http://localhost:3000',
        description: 'Servidor Local de Desenvolvimento',
      },
    ],
  },
  // Caminho onde o Swagger vai procurar os arquivos com os comentários de documentação
  apis: ['./src/routes/*.js'],
};

const swaggerSpec = swaggerJSDoc(options);

const setupSwagger = (app) => {
  // Rota onde a interface visual do Swagger estará disponível
  app.use('/docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));
  console.log('Documentação do Swagger disponível em: http://localhost:3000/docs');
};

module.exports = setupSwagger;