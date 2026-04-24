describe('Credential Validator', () => {
  const URL = 'https://usaflex.gpway.com.br/'
  const excelPath = 'C:\\Temp\\teste_credenciais_cypress.xlsx'

  const MAX_TENTATIVAS = 1000
  const WAIT_AFTER_SUCCESS_MS = 2500

  const selectors = {
    username: 'input[name="usr"], input[name="login"]',
    password: 'input[name="password"]',
    submit: '[name="btn_login"], input[type="submit"], button[type="submit"]'
  }

  function safeName(value) {
    return String(value ?? '')
      .trim()
      .replace(/[^\w\-]+/g, '_')
      .slice(0, 80)
  }

  function maskPassword(pwd) {
    const s = String(pwd ?? '')
    if (!s) return ''
    if (s.length <= 2) return '*'.repeat(s.length)
    return s[0] + '*'.repeat(Math.max(1, s.length - 2)) + s[s.length - 1]
  }

  function isLoginPage() {
    return cy.get('body').then(($body) => {
      const hasUser = $body.find('input[name="usr"], input[name="login"]').length > 0
      const hasPass = $body.find('input[name="password"]').length > 0
      return hasUser && hasPass
    })
  }

  function isLoggedArea() {
    return cy.get('body').then(($body) => {
      const text = $body.text()
      return (
        text.includes('Início') ||
        text.includes('Meus Dados') ||
        text.includes('Recibos') ||
        text.includes('Perfil') ||
        text.includes('Sair')
      )
    })
  }

  function openUserMenuIfNeeded() {
    cy.get('body').then(($body) => {
      const text = $body.text()

      if (text.includes('Sair')) {
        return
      }

      cy.get('body').click('topRight', { force: true })
      cy.wait(800)
    })
  }

  function clickLogoutIfPossible() {
    cy.get('body').then(($body) => {
      const text = $body.text()

      if (text.includes('Sair')) {
        cy.contains('Sair').click({ force: true })
      } else {
        cy.get('body').click('topRight', { force: true })
        cy.wait(800)

        cy.get('body').then(($body2) => {
          if ($body2.text().includes('Sair')) {
            cy.contains('Sair').click({ force: true })
          }
        })
      }
    })
  }

  function ensureLoginPage() {
    cy.visit(URL)
    cy.wait(1500)

    return isLoginPage().then((loginOk) => {
      if (loginOk) return

      return isLoggedArea().then((logged) => {
        if (logged) {
          clickLogoutIfPossible()
          cy.wait(1500)
        }

        cy.clearCookies({ log: false })
        cy.clearLocalStorage({ log: false })
        cy.visit(URL)
        cy.wait(2000)

        cy.get(selectors.username, { timeout: 20000 }).should('be.visible')
        cy.get(selectors.password, { timeout: 20000 }).should('be.visible')
      })
    })
  }

  function doLogin(username, password) {
    cy.get(selectors.username, { timeout: 20000 }).first().should('be.visible').clear().type(String(username).trim())
    cy.get(selectors.password, { timeout: 20000 }).first().should('be.visible').clear().type(String(password).trim(), { log: false })
    cy.get(selectors.submit).first().should('be.visible').click()
  }

  function checkSuccess() {
    return cy.location('href', { timeout: 10000 }).then((href) => {
      if (href.includes('HomeForm')) return true

      return cy.get('body').then(($body) => {
        const text = $body.text()
        return text.includes('Início') || text.includes('Meus Dados') || text.includes('Recibos')
      })
    })
  }

  function waitUntilHomeLoaded() {
    cy.contains('Início', { timeout: 15000 }).should('be.visible')
    cy.contains('Meus Dados', { timeout: 15000 }).should('be.visible')
    cy.wait(WAIT_AFTER_SUCCESS_MS)
  }

  function prepareSuccessScreenshot() {
    waitUntilHomeLoaded()
    openUserMenuIfNeeded()
    cy.wait(1000)
  }

  function logoutToLogin() {
    clickLogoutIfPossible()
    cy.wait(1500)

    cy.clearCookies({ log: false })
    cy.clearLocalStorage({ log: false })

    ensureLoginPage()
  }

  it('Credenciais Comprometidas', () => {
    const stamp = new Date().toISOString().replace(/[:.]/g, '-')
    const reportDir = 'cypress/artifacts/relatorios'
    const jsonPath = `${reportDir}/sucessos-${stamp}.json`
    const csvPath = `${reportDir}/sucessos-${stamp}.csv`

    const successes = []

    cy.task('ensureDir', reportDir)

    cy.task('readXlsx', { filePath: excelPath, sheetIndex: 0 }).then((rows) => {
      const creds = (rows || [])
        .map((r) => ({
          username: r.username ?? r.Username ?? r.USERNAME ?? '',
          password: r.password ?? r.Password ?? r.PASSWORD ?? ''
        }))
        .filter((c) => String(c.username).trim() && String(c.password).trim())
        .slice(0, MAX_TENTATIVAS)

      expect(creds.length, 'linhas válidas (username/password)').to.be.greaterThan(0)

      const runAt = (i) => {
        if (i >= creds.length) return

        const username = String(creds[i].username).trim()
        const password = String(creds[i].password).trim()

        cy.clearCookies({ log: false })
        cy.clearLocalStorage({ log: false })

        ensureLoginPage()

        cy.log(`Tentando (${i + 1}/${creds.length}): ${username}`)
        doLogin(username, password)

        cy.wait(1500)

        return cy.then(() => checkSuccess()).then((ok) => {
          if (ok) {
            const at = new Date().toISOString()
            const masked = maskPassword(password)
            const shotName = `SUCESSO_${safeName(username)}`

            prepareSuccessScreenshot()

            cy.screenshot(shotName, { capture: 'fullPage' })

            successes.push({
              username,
              password_masked: masked,
              at
            })

            cy.addTestContext(`Usuário válido: ${username}`)
            cy.addTestContext(`Senha mascarada: ${masked}`)
            cy.addTestContext(`Data/Hora: ${at}`)

            cy.log(`✅ SUCESSO: ${username}`)

            logoutToLogin()
          }

          return runAt(i + 1)
        })
      }

      return runAt(0)
    }).then(() => {
      cy.writeFile(jsonPath, successes, { log: true })

      const header = 'username;password_masked;at\n'
      const lines = successes.map((r) => `${r.username};${r.password_masked};${r.at}`)
      cy.writeFile(csvPath, header + lines.join('\n'), { log: true })

      cy.log(`📄 JSON: ${jsonPath}`)
      cy.log(`📄 CSV: ${csvPath}`)
      cy.log(`✅ Total de sucessos: ${successes.length}`)
    })
  })
})