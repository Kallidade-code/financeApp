# Pierre 💰 — Assistente Financeiro

API REST desenvolvida em ASP.NET Core para gerenciamento de finanças pessoais, com persistência em banco de dados SQLite via Entity Framework Core e organização em camadas seguindo o Repository Pattern.

---

## 🛠️ Tecnologias

- C# / ASP.NET Core Web API
- Entity Framework Core
- SQLite
- Swagger (documentação interativa)

---

## 📁 Estrutura do Projeto

```
financeApp/
├── Controllers/
│   ├── FinanceController.cs
│   └── CategoriaController.cs
├── Data/
│   └── AppDbContext.cs
├── Models/
│   ├── Transacao.cs
│   ├── Categoria.cs
│   └── TipoTransacao.cs
├── Repositories/
│   ├── ITransacaoRepository.cs
│   ├── TransacaoRepository.cs
│   ├── ICategoriaRepository.cs
│   └── CategoriaRepository.cs
├── Program.cs
└── appsettings.json
```

---

## 🗄️ Entidades

### Categoria
Representa uma categoria de transação (ex: Salário, Aluguel, Alimentação).

| Campo | Tipo | Descrição |
|-------|------|-----------|
| Id | int | Identificador único |
| Nome | string | Nome da categoria (obrigatório, 2-100 caracteres) |
| Tipo | TipoTransacao | Receita (1) ou Despesa (2) |

### Transacao
Representa uma movimentação financeira vinculada a uma categoria.

| Campo | Tipo | Descrição |
|-------|------|-----------|
| Id | int | Identificador único |
| Tipo | TipoTransacao | Receita (1) ou Despesa (2) |
| CategoriaId | int | Chave estrangeira para Categoria |
| Valor | decimal | Valor da transação (deve ser maior que zero) |
| Data | DateTime | Data da transação |

### Enum TipoTransacao
```csharp
Receita = 1
Despesa = 2
```

---

## 🚀 Como executar

**Pré-requisitos:** .NET 10 SDK instalado.

```bash
# Clonar o repositório
git clone https://github.com/seu-usuario/financeApp.git
cd financeApp/financeApp

# Restaurar dependências
dotnet restore

# Aplicar migrations e criar o banco
dotnet ef database update

# Rodar a API
dotnet run
```

Acesse a documentação interativa em: `http://localhost:5197/swagger`

---

## 📋 Endpoints

### Categoria

| Método | Rota | Descrição |
|--------|------|-----------|
| GET | /Categoria | Lista todas as categorias |
| GET | /Categoria/{id} | Busca categoria por ID |
| POST | /Categoria | Cria nova categoria |
| PUT | /Categoria/{id} | Atualiza categoria existente |
| DELETE | /Categoria/{id} | Remove categoria |

**Exemplo POST /Categoria:**
```json
{
  "id": 0,
  "nome": "Salário",
  "tipo": 1
}
```

---

### Finance (Transações)

| Método | Rota | Descrição |
|--------|------|-----------|
| GET | /Finance | Lista todas as transações |
| GET | /Finance/{id} | Busca transação por ID |
| POST | /Finance | Cria nova transação |
| PUT | /Finance/{id} | Atualiza transação existente |
| DELETE | /Finance/{id} | Remove transação |
| GET | /Finance/saldo | Retorna saldo atual (receitas − despesas) |
| GET | /Finance/tipo?tipo=1 | Filtra transações por tipo |
| GET | /Finance/categoria | Total de despesas agrupado por categoria |

**Exemplo POST /Finance:**
```json
{
  "id": 0,
  "tipo": 1,
  "categoriaId": 1,
  "valor": 3000.00,
  "data": "2026-04-21T00:00:00"
}
```

---

## ✅ Regras de Negócio

- O valor de qualquer transação deve ser **maior que zero**
- A data da transação é **obrigatória**
- O nome da categoria deve ter **entre 2 e 100 caracteres**
- O saldo é calculado automaticamente como **soma de receitas − soma de despesas**
- O endpoint `/Finance/categoria` retorna apenas **despesas**, agrupadas por categoria

---

## 👥 Equipe

- Eugênio — [github.com/seu-usuario](https://github.com/seu-usuario)
