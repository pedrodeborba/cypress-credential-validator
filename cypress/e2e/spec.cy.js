describe('Teste Login', () => {
  const URL = ''
  const excelPath = 'C:\\Temp\\teste_credenciais_cypress.xlsx'

  const selectors = {
    username: 'input[name="usr"], input[name="login"]',
    password: 'input[name="password"]',
    submit: '[name="btn_login"], input[type="submit"], button[type="submit"]'
  }

  // ======= CONFIGURAÇÕES IMPORTANTES =======
  const stopOnFirstSuccess = true      // true = para quando achar 1 que funciona | false = testa todos e registra todos os sucessos
  const failIfNone = false             // true = falha o teste se ninguém logar | false = apenas informa no log e não cria relatório
  // =========================================

  function safeName(s) {
    return String(s ?? '')
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

  function doLogin(username, password) {
    cy.visit(URL)

    cy.get(selectors.username).first().should('be.visible').clear().type(String(username).trim())
    cy.get(selectors.password).first().should('be.visible').clear().type(String(password).trim(), { log: false })
    cy.get(selectors.submit).first().should('be.visible').click()
  }

  function checkSuccess() {
    // Se a sua aplicação redireciona ao logar, isso resolve.
    // Se não redirecionar, me diga um elemento que só aparece após login e eu adapto.
    return cy.location('href', { timeout: 8000 }).then((href) => {
      return href.includes('HomeForm')
    })
  }

  it('testa credenciais e registra SOMENTE as que funcionaram', () => {
    const stamp = new Date().toISOString().replace(/[:.]/g, '-')
    const reportDir = 'cypress/artifacts/relatorios'
    const reportJsonPath = `${reportDir}/sucessos-credenciais-${stamp}.json`
    const reportCsvPath = `${reportDir}/sucessos-credenciais-${stamp}.csv`

    const successes = []

    // garante pasta de relatório
    cy.task('ensureDir', reportDir)

    cy.task('readXlsx', { filePath: excelPath, sheetIndex: 0 }).then((rows) => {
      const creds = (rows || [])
        .map((r) => ({
          username: r.username ?? r.Username ?? r.USERNAME ?? '',
          password: r.password ?? r.Password ?? r.PASSWORD ?? ''
        }))
        .filter((c) => String(c.username).trim() && String(c.password).trim())

      expect(creds.length, 'linhas válidas (username/password)').to.be.greaterThan(0)

      const tryAt = (i) => {
        if (i >= creds.length) return

        const { username, password } = creds[i]
        const startedAt = new Date().toISOString()

        // Se quiser reduzir log em massa, comente o cy.log abaixo:
        cy.log(`Tentando (${i + 1}/${creds.length}): ${username}`)

        doLogin(username, password)

        cy.wait(900)

        return cy.then(() => checkSuccess()).then((ok) => {
          if (ok) {
            const endedAt = new Date().toISOString()

            // ✅ Screenshot SOMENTE quando deu sucesso
            cy.screenshot(`SUCESSO_${safeName(username)}`, { capture: 'fullPage' })

            successes.push({
              username: String(username).trim(),
              password_masked: maskPassword(password),
              startedAt,
              endedAt
            })

            cy.log(`✅ SUCESSO: ${username}`)

            if (stopOnFirstSuccess) return
          }

          return tryAt(i + 1)
        })
      }

      return tryAt(0)
    })
    .then(() => {
      if (successes.length === 0) {
        cy.log('⚠️ Nenhuma credencial funcionou.')

        if (failIfNone) {
          throw new Error('Nenhuma credencial funcionou.')
        }

        return
      }

      // ✅ gera relatório SOMENTE com sucessos
      cy.writeFile(reportJsonPath, successes, { log: true })

      const header = 'username,password_masked,startedAt,endedAt\n'
      const lines = successes.map((r) =>
        `${r.username},${r.password_masked},${r.startedAt},${r.endedAt}`
      )
      cy.writeFile(reportCsvPath, header + lines.join('\n'), { log: true })

      cy.log(`📄 Relatórios gerados (somente sucessos):`)
      cy.log(reportJsonPath)
      cy.log(reportCsvPath)
      cy.log(`✅ Total de sucessos: ${successes.length}`)
    })
  })
})