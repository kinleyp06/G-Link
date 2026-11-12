// End-to-end: a visitor who is not signed in looks around the site.
const { test, expect } = require('@playwright/test');

test('home page shows the guest house, prices and the contact footer', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Stay at the CST guest house' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Facilities' })).toBeVisible();
  await expect(page.getByRole('cell', { name: 'Nu. 250.00' })).toBeVisible();
  const footer = page.locator('footer');
  await expect(footer.getByRole('heading', { name: 'Contact us' })).toBeVisible();
  await expect(footer.getByText('17160538')).toBeVisible();
});

test('rooms page lists rooms 1-8 to book and the two VIP suites without a button', async ({ page }) => {
  await page.goto('/rooms');
  const cards = page.locator('.room-card');
  await expect(cards).toHaveCount(10);
  await expect(cards.filter({ hasText: 'Room 1' }).getByRole('link', { name: 'Sign in to book' })).toBeVisible();
  const suite = cards.filter({ hasText: 'Suite 1' });
  await expect(suite.getByText('Reserved for college VIP guests').first()).toBeVisible();
  await expect(suite.getByRole('link')).toHaveCount(0);
});

test('meeting hall shows the fee for one day: Nu. 5,250', async ({ page }) => {
  await page.goto('/hall');
  await page.getByRole('button', { name: 'Check the hall and fee' }).click();
  await expect(page.locator('.bill-line.total')).toContainText('Nu. 5,250.00');
  await expect(page.getByRole('link', { name: 'Sign in to book the hall' })).toBeVisible();
});

test('floor map shows both floors and the ground floor plan', async ({ page }) => {
  await page.goto('/floor-map');
  await expect(page.getByRole('heading', { name: 'Ground floor' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'First floor' })).toBeVisible();
  await expect(page.getByAltText('Floor plan: Ground floor')).toBeVisible();
});
