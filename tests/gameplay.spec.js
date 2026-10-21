import { test, expect } from '@playwright/test'

test.describe('Flower Power - Card Animations', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
  })

  test('home page loads without errors', async ({ page }) => {
    // Listen for console errors
    const errors = []
    page.on('console', msg => {
      if (msg.type() === 'error') {
        errors.push(msg.text())
      }
    })

    // Check page loaded
    await expect(page.locator('h1').first()).toContainText('Flower Power')
    await expect(page.getByRole('link', { name: 'Start Game' })).toBeVisible()

    // Should have no console errors
    expect(errors).toHaveLength(0)
  })

  test('game starts and renders correctly', async ({ page }) => {
    // Track console errors
    const errors = []
    page.on('console', msg => {
      if (msg.type() === 'error') {
        errors.push(msg.text())
      }
    })

    // Start game
    await page.getByRole('link', { name: 'Start Game' }).click()

    // Wait for game to load
    await page.waitForSelector('.ground', { timeout: 5000 })

    // Check game elements exist
    await expect(page.locator('.ground')).toBeVisible()
    await expect(page.locator('.score').first()).toBeVisible()
    await expect(page.locator('.deckCard')).toBeVisible()

    // Check for cards on screen
    const cards = await page.locator('.card').count()
    console.log(`Found ${cards} cards on screen`)
    expect(cards).toBeGreaterThan(0)

    // Wait a bit to see if any errors occur
    await page.waitForTimeout(2000)

    // Should have no console errors
    if (errors.length > 0) {
      console.log('Console errors:', errors)
    }
    expect(errors).toHaveLength(0)
  })

  test('can draw cards from deck', async ({ page }) => {
    await page.getByRole('link', { name: 'Start Game' }).click()
    await page.waitForSelector('.ground')

    // Get initial card count
    const initialCards = await page.locator('.card').count()

    // Click deck to draw
    await page.click('.deckCard')

    // Wait for animation
    await page.waitForTimeout(600)

    // Should have more cards (or same if hand was full)
    const afterCards = await page.locator('.card').count()
    console.log(`Cards before: ${initialCards}, after: ${afterCards}`)
  })

  test('can play a flower card', async ({ page }) => {
    await page.getByRole('link', { name: 'Start Game' }).click()
    await page.waitForSelector('.ground')

    // Wait for game to initialize
    await page.waitForTimeout(1000)

    // Try to find and click a card in hand
    const handCard = page.locator('.hand .card').first()
    if (await handCard.isVisible()) {
      await handCard.click()

      // Wait for animation
      await page.waitForTimeout(500)

      console.log('Clicked card in hand')
    }
  })

  test('no infinite recursion errors', async ({ page }) => {
    const errors = []
    const warnings = []

    page.on('console', msg => {
      const text = msg.text()
      if (msg.type() === 'error') {
        errors.push(text)
      }
      if (text.includes('recursive') || text.includes('Maximum')) {
        warnings.push(text)
      }
    })

    await page.getByRole('link', { name: 'Start Game' }).click()
    await page.waitForSelector('.ground')

    // Let game run for a bit
    await page.waitForTimeout(3000)

    // Check for recursion errors
    const recursionErrors = errors.filter(e => e.includes('recursive') || e.includes('Maximum'))
    if (recursionErrors.length > 0) {
      console.error('RECURSION ERRORS FOUND:', recursionErrors)
    }
    expect(recursionErrors).toHaveLength(0)

    if (warnings.length > 0) {
      console.error('RECURSION WARNINGS:', warnings)
    }
    expect(warnings).toHaveLength(0)
  })
})
