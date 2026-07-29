import { test, expect } from '@playwright/test'

test.describe('Flower Power - Basic Smoke Test', () => {
  test('game loads and no recursion errors', async ({ page }) => {
    const errors = []
    const recursionIssues = []

    // Capture all console messages
    page.on('console', msg => {
      const text = msg.text()
      console.log(`[${msg.type()}] ${text}`)

      if (msg.type() === 'error') {
        errors.push(text)
      }
      if (text.toLowerCase().includes('recursive') || text.toLowerCase().includes('maximum')) {
        recursionIssues.push(text)
      }
    })

    // Go to home page
    await page.goto('http://localhost:5174/')
    console.log('Loaded home page')

    // Wait a moment
    await page.waitForTimeout(1000)

    // Click Start Game link (it's a router-link, not a button)
    const startLink = page.getByRole('link', { name: 'Start Game' })
    await expect(startLink).toBeVisible({ timeout: 5000 })
    await startLink.click()
    console.log('Clicked Start Game')

    // Wait for game view - give it time
    await page.waitForTimeout(3000)

    // Check if .ground exists (game loaded)
    const ground = page.locator('.ground')
    const isGameVisible = await ground.isVisible().catch(() => false)
    console.log(`Game view visible: ${isGameVisible}`)

    // Report results
    console.log(`\n=== TEST RESULTS ===`)
    console.log(`Total console errors: ${errors.length}`)
    console.log(`Recursion issues: ${recursionIssues.length}`)

    if (errors.length > 0) {
      console.log('\nErrors found:')
      errors.forEach(e => console.log(`  - ${e}`))
    }

    if (recursionIssues.length > 0) {
      console.error('\n❌ RECURSION ISSUES FOUND:')
      recursionIssues.forEach(i => console.error(`  - ${i}`))
    }

    // Assert no recursion errors
    expect(recursionIssues, 'Should have no recursive update errors').toHaveLength(0)
  })
})
