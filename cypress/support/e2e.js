import 'cypress-mochawesome-reporter/register'

Cypress.on('uncaught:exception', (err) => {
  const msg = err?.message || ''

  if (
    msg.includes('Unexpected token') ||
    msg.includes('await is only valid') ||
    msg.includes('addEventListener') ||
    msg.includes('textContent') ||
    msg.includes("Cannot read properties of null (reading 'style')") ||
    msg.includes("Failed to execute 'querySelectorAll' on 'Document'") ||
    msg.includes('is not a valid selector')
  ) {
    return false
  }

  return true
})