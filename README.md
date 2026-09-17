# 💰 Saldo Seguro - Backend

Documentação oficial e código do servidor backend do aplicativo financeiro **Saldo Seguro**, desenvolvido como parte do projeto acadêmico do IFPE.

---

## 🚀 Tecnologias Utilizadas

* **Node.js** & **Express** (API Rest)
* **PostgreSQL** (Banco de dados relacional)
* **Swagger / OpenAPI 3.0** (Documentação interativa)
* **Docker & Docker Compose** (Containerização e ambiente de desenvolvimento)

---

## 📂 Estrutura de Rotas do Projeto

O sistema está modularizado nas seguintes rotas principais:
* **`/auth`** - Autenticação (Login, Recuperação de senha, Cadastro)
* **`/home`** - Dados consolidados para a Tela Inicial (Dashboard)
* **`/expenses`** - Gestão e extrato de despesas, além de resumo por categorias
* **`/calculation`** & **`/classification`** - Análises de saldo, limite semanal e situação financeira
* **`/goals`** - Gestão de objetivos e metas de economia
* **`/installments`** - Controle de compras parceladas
* **`/sourcesOfIncomes`** - Gestão de fontes de renda
* **`/reports`** - Relatórios detalhados e gráficos comparativos
* **`/users`** - Gerenciamento de perfil, edição e exportação de dados (backup)
* **`/finance`** - Configurações financeiras globais

---

## 📖 Documentação da API (Swagger)

A API possui uma interface interativa completa gerada via Swagger UI. 

Para acessá-la com o servidor rodando localmente, abra o navegador e acesse:
```text
http://localhost:3000/docs
```
Lá você poderá visualizar todas as rotas documentadas, os esquemas de dados e testar as requisições diretamente pela web.

## 🐳 Como rodar o projeto usando Docker

# Pré-requisitos
* Ter o Docker e o Docker Compose instalados na sua máquina.

* Passo a passo:
* Clone o repositório e acesse a pasta raiz do projeto via terminal.

* Crie um arquivo .env na raiz baseado no exemplo abaixo:

```Snippet de código
DB_USER=postgres
DB_PASSWORD=secretpassword
DB_NAME=saldoseguro
PORT=3000
```

* Execute o comando de build e subida dos contêineres:
```Bash
docker-compose up --build
Pronto! O servidor estará ativo e o banco configurado. Você já pode acessar a documentação em http://localhost:3000/docs.
```

* Para encerrar a execução dos contêineres, rode:

```Bash
docker-compose down
```

## 💻 Como rodar em Desenvolvimento Local (Sem Docker)
* Caso prefira rodar diretamente na máquina:

* Instale as dependências:
```Bash
npm install
```
* Certifique-se de ter um banco PostgreSQL rodando localmente e configure as variáveis de ambiente equivalentes.

* Inicie o servidor:

```Bash
npm run dev
```
