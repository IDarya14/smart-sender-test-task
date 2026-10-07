describe('session', () => {
  it('rotates once when two requests get 401', () => {
    cy.visit('/login')

    cy.get('#email').type('test@example.com')
    cy.get('#password').type('password')
    cy.contains('button', 'Sign in').click()

    cy.contains('h1', 'Webhooks').should('be.visible')
    cy.contains('Order paid').should('be.visible')

    cy.window()
      .then((win) => win.__app.refetchBoth())
      .then((result) => {
        expect(result.webhooks).to.eq('fulfilled')
        expect(result.me).to.eq('fulfilled')
        expect(result.rotates).to.eq(1)
      })
  })
})
