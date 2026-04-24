# Cypress Credential Validator

Projeto de automação E2E com **Cypress** para **validar credenciais (username/password)** em uma tela de login, lendo os dados a partir de uma planilha **Excel (.xlsx)** e registrando **somente os sucessos** (com **screenshot** e **relatório**).

> ✅ Útil para smoke test de autenticação, validação de acessos em lote e auditoria básica de credenciais.  
> 🔒 Por segurança, o relatório **não grava a senha em texto puro** — a senha é **mascarada**.

---

## ✨ Funcionalidades

- Lê credenciais de uma planilha Excel (`.xlsx`) com as colunas: **username** e **password**
- Tenta login em sequência para cada linha da planilha
- **Somente quando o login funciona**:
  - tira **screenshot** (full page)
  - grava o usuário no relatório (`JSON` e `CSV`) com senha **mascarada**
- Opções de execução:
  - parar no **primeiro** sucesso (mais rápido)
  - ou testar todas e registrar **todos** os sucessos (mais completo)

---

## 🧰 Requisitos

- **Node.js** (recomendado: versão LTS)
- **Cypress**
- Dependência adicional:
  - **xlsx** (leitura do Excel)
- **Git** (opcional, para versionamento)

---

## 📦 Instalação

```bash
# Clone o repositório
git clone https://github.com/pedro.borba/cypress-credential-validator.git

# Acesse a pasta do projeto
cd cypress-credential-validator

# Instale as dependências
npm install
```

---

## ⚙️ Configuração

### 1. Estrutura da planilha Excel

O arquivo `.xlsx` deve conter as seguintes colunas:

| username | password |
|----------|----------|
| user1    | senha1   |
| user2    | senha2   |

> ⚠️ Certifique-se de que os nomes das colunas estejam exatamente como `username` e `password`.

---

### 2. Configurar URL e seletores

No arquivo de teste do Cypress (ex: `cypress/e2e/spec.cy.js`), ajuste:

- URL da aplicação  
- Seletores dos campos de login  
- Botão de envio  
- Validação de sucesso (ex: redirect, elemento visível, etc.)

#### Exemplo:

```javascript
cy.visit('https://sua-aplicacao.com/login')

cy.get('#username').type(username)
cy.get('#password').type(password)
cy.get('#login-button').click()

// Exemplo de validação de sucesso
cy.url().should('include', '/dashboard')
```

---

### 3. Configurações adicionais

Você pode ajustar comportamentos como:

- Parar no primeiro sucesso  
- Caminho do arquivo Excel  
- Diretório de saída dos relatórios  

#### Exemplo:

```javascript
const STOP_ON_SUCCESS = true
const EXCEL_FILE_PATH = 'cypress/fixtures/credenciais.xlsx'
```

---

## ▶️ Execução

### Abrir interface do Cypress

```bash
npx cypress open
```

### Executar em modo headless

```bash
npx cypress run
```

---

## 📊 Relatórios gerados

Após a execução, os resultados são salvos em:

- `cypress/reports/success.json`  
- `cypress/reports/success.csv`  
- `cypress/screenshots/`  

### Exemplo de saída (JSON)

```json
[
  {
    "username": "user1",
    "password": "******"
  }
]
```

---

## 🔐 Segurança

- Senhas **não são armazenadas em texto puro**  
- Logs e relatórios utilizam **mascaramento**  
- Recomenda-se não versionar arquivos contendo credenciais reais  

Adicione ao `.gitignore`:

```gitignore
cypress/fixtures/*.xlsx
cypress/reports/
```

---

## 📁 Estrutura do projeto

```
cypress-credential-validator/
├── cypress/
│   ├── e2e/
│   │   └── spec.cy.js
│   ├── fixtures/
│   │   └── credenciais.xlsx
│   ├── reports/
│   └── screenshots/
├── package.json
└── README.md
```