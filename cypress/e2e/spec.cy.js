describe('Credential Validator', () => {
  const URL = ''
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
    return cy.get('body').then(($body) => {
      const text = $body.text()

      if (text.includes('Sair')) return

      return cy.get('body').click('topRight', { force: true }).wait(800)
    })
  }

  function clickLogoutIfPossible() {
    return cy.get('body').then(($body) => {
      const text = $body.text()

      if (text.includes('Sair')) {
        return cy.contains('Sair').click({ force: true })
      }

      return cy.get('body')
        .click('topRight', { force: true })
        .wait(800)
        .then(() => {
          return cy.get('body').then(($body2) => {
            if ($body2.text().includes('Sair')) {
              return cy.contains('Sair').click({ force: true })
            }
          })
        })
    })
  }

  function ensureLoginPage() {
    return cy.visit(URL).then(() => {
      return cy.wait(1500).then(() => {
        return isLoginPage().then((loginOk) => {
          if (loginOk) return

          return isLoggedArea()
            .then((logged) => {
              if (logged) {
                return clickLogoutIfPossible().then(() => cy.wait(1500))
              }
            })
            .then(() => {
              cy.clearCookies({ log: false })
              cy.clearLocalStorage({ log: false })

              return cy.visit(URL).then(() => {
                cy.wait(2000)

                cy.get(selectors.username, { timeout: 20000 }).should('be.visible')
                cy.get(selectors.password, { timeout: 20000 }).should('be.visible')
              })
            })
        })
      })
    })
  }

  function doLogin(username, password) {
    return cy.get(selectors.username, { timeout: 20000 })
      .first()
      .should('be.visible')
      .clear()
      .type(String(username).trim())
      .then(() => {
        return cy.get(selectors.password)
          .first()
          .should('be.visible')
          .clear()
          .type(String(password).trim(), { log: false })
      })
      .then(() => {
        return cy.get(selectors.submit).first().should('be.visible').click()
      })
  }

  function checkSuccess() {
    return cy.location('href', { timeout: 10000 }).then((href) => {
      if (href.includes('HomeForm') || href.includes('home')) return true

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
    })
  }

  function waitUntilHomeLoaded() {
    return cy.get('body', { timeout: 20000 }).should(($body) => {
      const text = $body.text()

      const isLogged =
        text.includes('Início') ||
        text.includes('Meus Dados') ||
        text.includes('Recibos') ||
        text.includes('Perfil') ||
        text.includes('Sair')

      expect(isLogged).to.be.true
    }).then(() => cy.wait(WAIT_AFTER_SUCCESS_MS))
  }

  function prepareSuccessScreenshot() {
    return waitUntilHomeLoaded()
      .then(() => openUserMenuIfNeeded())
      .then(() => cy.wait(1000))
  }

  function logoutToLogin() {
    return clickLogoutIfPossible()
      .then(() => cy.wait(1500))
      .then(() => {
        cy.clearCookies({ log: false })
        cy.clearLocalStorage({ log: false })
        return ensureLoginPage()
      })
  }

  it('Credenciais Comprometidas', () => {
    const stamp = new Date().toISOString().replace(/[:.]/g, '-')
    const reportDir = 'cypress/artifacts/relatorios'
    const jsonPath = `${reportDir}/sucessos-${stamp}.json`
    const csvPath = `${reportDir}/sucessos-${stamp}.csv`

    const successes = []
    const testContexts = [] // 🔥 novo

    cy.task('ensureDir', reportDir)

    cy.task('readXlsx', { filePath: excelPath, sheetIndex: 0 }).then((rows) => {
      const creds = (rows || [])
        .map((r) => ({
          username: r.username ?? r.Username ?? r.USERNAME ?? '',
          password: r.password ?? r.Password ?? r.PASSWORD ?? ''
        }))
        .filter((c) => String(c.username).trim() && String(c.password).trim())
        .slice(0, MAX_TENTATIVAS)

      expect(creds.length).to.be.greaterThan(0)

      const runAt = (i) => {
        if (i >= creds.length) return cy.wrap(null)

        const username = String(creds[i].username).trim()
        const password = String(creds[i].password).trim()

        return cy.then(() => {
          cy.clearCookies({ log: false })
          cy.clearLocalStorage({ log: false })
          return ensureLoginPage()
        }).then(() => {
          cy.log(`Tentando (${i + 1}/${creds.length}): ${username}`)
          return doLogin(username, password)
        }).then(() => {
          cy.wait(1500)
          return checkSuccess()
        }).then((ok) => {
          if (ok) {
            const at = new Date().toISOString()
            const masked = maskPassword(password)
            const shotName = `SUCESSO_${safeName(username)}`

            return prepareSuccessScreenshot().then(() => {
              cy.screenshot(shotName, { capture: 'fullPage' })

              successes.push({
                username,
                password_masked: masked,
                at
              })

              testContexts.push(`Usuário válido: ${username}`)
              testContexts.push(`Senha mascarada: ${masked}`)
              testContexts.push(`Data/Hora: ${at}`)
              testContexts.push(`Screenshot: ${shotName}`)

              cy.log(`✅ SUCESSO: ${username}`)

              return logoutToLogin()
            })
          }
        }).then(() => {
          return runAt(i + 1)
        })
      }

      return runAt(0)
    }).then(() => {
      testContexts.forEach(ctx => {
        cy.addTestContext(ctx)
      })

      cy.writeFile(jsonPath, successes)

      const header = 'username;password_masked;at\n'
      const lines = successes.map((r) => `${r.username};${r.password_masked};${r.at}`)
      cy.writeFile(csvPath, header + lines.join('\n'))

      cy.log(`📄 JSON: ${jsonPath}`)
      cy.log(`📄 CSV: ${csvPath}`)
      cy.log(`✅ Total de sucessos: ${successes.length}`)
    })
  })
})