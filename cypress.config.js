const { defineConfig } = require('cypress')
const xlsx = require('xlsx')
const path = require('path')
const fs = require('fs')

function readXlsxAsJson(filePath, sheetIndex = 0) {
  const workbook = xlsx.readFile(filePath, { cellDates: false })
  const sheetName = workbook.SheetNames[sheetIndex]
  const sheet = workbook.Sheets[sheetName]
  return xlsx.utils.sheet_to_json(sheet, { defval: '', raw: false })
}

module.exports = defineConfig({
  //Não salva print se falhar
  screenshotOnRunFailure: false,

  screenshotsFolder: 'cypress/artifacts/screenshots',
  videosFolder: 'cypress/artifacts/videos',

  e2e: {
    setupNodeEvents(on, config) {
      on('task', {
        readXlsx({ filePath, sheetIndex = 0 }) {
          const fullPath = path.isAbsolute(filePath)
            ? filePath
            : path.join(config.projectRoot, filePath)

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