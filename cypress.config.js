const { defineConfig } = require('cypress')
const xlsx = require('xlsx')
const path = require('path')
const fs = require('fs')

function readXlsxAsJson(filePath, sheetIndex = 0) {
  const workbook = xlsx.readFile(filePath, { cellDates: false })
  const sheetName = workbook.SheetNames[sheetIndex]

  if (!sheetName) {
    throw new Error(`Aba não encontrada no índice ${sheetIndex}`)
  }

  const sheet = workbook.Sheets[sheetName]

  if (!sheet) {
    throw new Error(`Aba "${sheetName}" não encontrada no arquivo: ${filePath}`)
  }

  return xlsx.utils.sheet_to_json(sheet, { defval: '', raw: false })
}

module.exports = defineConfig({
  reporter: 'cypress-mochawesome-reporter',
  reporterOptions: {
    reportDir: 'cypress/artifacts/mochawesome',
    reportFilename: 'report',
    charts: true,
    embeddedScreenshots: true,
    inlineAssets: true,
    saveAllAttempts: false,
    ignoreVideos: true,
    code: false
  },

  screenshotOnRunFailure: false,
  video: false,

  screenshotsFolder: 'cypress/artifacts/screenshots',
  videosFolder: 'cypress/artifacts/videos',
  downloadsFolder: 'cypress/artifacts/downloads',

  e2e: {
    supportFile: 'cypress/support/e2e.js',

    specPattern: 'cypress/e2e/spec.cy.js',

    experimentalRunEvents: true,

    setupNodeEvents(on, config) {
      require('cypress-mochawesome-reporter/plugin')(on)

      on('task', {
        readXlsx({ filePath, sheetIndex = 0 }) {
          const fullPath = path.isAbsolute(filePath)
            ? filePath
            : path.join(config.projectRoot, filePath)

          if (!fs.existsSync(fullPath)) {
            throw new Error(`Arquivo Excel não encontrado: ${fullPath}`)
          }

          return readXlsxAsJson(fullPath, sheetIndex)
        },

        ensureDir(dirPath) {
          const fullDir = path.isAbsolute(dirPath)
            ? dirPath
            : path.join(config.projectRoot, dirPath)

          fs.mkdirSync(fullDir, { recursive: true })
          return null
        }
      })

      return config
    }
  }
})