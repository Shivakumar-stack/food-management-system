const { test, expect } = require('@playwright/test');

test('smoke test live map', async ({ page }) => {
    await page.goto('http://localhost:5500/live-map.html');
    await expect(page).toHaveTitle(/Live Map/);

    // Check map rendering
    const mapElement = await page.locator('#map');
    await expect(mapElement).toBeVisible();

    // Test map data scope role presentation
    const scopeLabel = page.locator('#mapDataScopeLabel');
    await expect(scopeLabel).toHaveText('Public active donation feed');

    // Navigate to login
    await page.click('text=Connect Account');
    await page.waitForURL('**/login.html');
    await page.fill('input[type="email"]', 'admin@foodbridge.org');
    await page.fill('input[type="password"]', 'TestPassword123!');
    await page.click('button[type="submit"]');

    // Check login success
    await page.waitForURL('**/dashboard.html');

    // Go back to live map
    await page.goto('http://localhost:5500/live-map.html');

    // Test modified map data scope role presentation for admin
    await expect(page.locator('#mapDataScopeLabel')).toHaveText('Network-wide donation feed');
    await expect(page.locator('#mapAccessNoticeAction')).toBeHidden();

    // Wait for map markers (class "map-donation-marker") to appear
    await page.waitForSelector('.map-donation-icon', { state: 'visible', timeout: 8000 });

    // Select a marker to test map details sidebar
    const marker = page.locator('.map-donation-icon').first();
    await marker.click();

    // Drawer should open and be visible
    const drawer = page.locator('#mapDetailDrawer');
    await expect(drawer).toBeVisible();
});
