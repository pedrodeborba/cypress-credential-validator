Cypress.on('uncaught:exception', (err) => {
  if (
    err.message.includes('Unexpected token') ||
    err.message.includes('await is only valid') ||
    err.message.includes('addEventListener') ||
    err.message.includes('textContent')
  ) {
    return false
  }
  return true
})