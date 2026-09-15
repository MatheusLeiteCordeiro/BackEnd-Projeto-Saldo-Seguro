# Saldo Seguro - Backend 💰

API RESTful desenvolvida em Node.js com Express e PostgreSQL para o sistema de gestão financeira pessoal **Saldo Seguro**. O projeto conta com arquitetura modularizada, criptografia de senhas, documentação interativa via Swagger e regras automatizadas para controle de orçamento e despesas.

---

## 🚀 Tecnologias Utilizadas

O projeto utiliza a seguinte stack tecnológica:
* **Node.js** - Ambiente de execução JavaScript.
* **Express** - Framework web para construção das rotas e API.
* **PostgreSQL** - Banco de dados relacional para armazenamento seguro.
* **Bcrypt** - Criptografia de senhas para autenticação de usuários.
* **Swagger (OpenAPI)** - Documentação interativa da API.
* **Cors & Dotenv** - Gerenciamento de variáveis de ambiente e segurança de requisições.

---


## Antes de começar, certifique-se de ter instalado em sua máquina:
* Node.js (versão 18 ou superior recomendada)
* PostgreSQL rodando localmente ou em um servidor na nuvem

## 📥 Como Rodar o Projeto
Instale as dependências:

```
* npm install
```

* Configure as variáveis de ambiente:
* Crie um arquivo .env na raiz do projeto e configure os dados de acesso ao seu banco PostgreSQL com base no exemplo abaixo:

```Snippet de código
PORT=3000
DB_USER=seu_usuario_postgres
DB_HOST=localhost
DB_DATABASE=saldo_seguro
DB_PASSWORD=sua_senha
DB_PORT=5432
```

# Inicie o servidor em modo de desenvolvimento:

```Bash
npm run dev
(O servidor rodará por padrão na porta 3000 e as tabelas do banco serão criadas automaticamente ao iniciar).
```

📖 Documentação da API (Swagger)
Com o servidor rodando, você pode acessar a documentação interativa completa de todas as rotas diretamente no seu navegador através do link:
👉 http://localhost:3000/docs

## 🔌 Principais Endpoints da API
# Autenticação:

* POST /auth/register - Cadastra um novo usuário.

* POST /auth/login - Realiza a autenticação.

# Finanças & Perfil:

* PUT /finances/:userId - Atualiza renda mensal e meta de reserva.

* GET /finances/:userId - Consulta dados financeiros.

# Despesas & Parcelamentos:

* POST /expenses - Cadastra despesas.

* POST /installments - Cadastra compras parceladas (com cálculo automático de parcelas).

# Indicadores & Dashboard:

* GET /calculations/:userId - Retorna saldo disponível e limite semanal.

* GET /dashboard/:userId - Retorna os dados consolidados do painel.

* GET /classification/:userId - Retorna a situação financeira (Saudável, Atenção ou Crítico).
