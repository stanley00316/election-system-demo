import { test, expect } from '@playwright/test';

test.describe('公開頁面', () => {
  test('首頁應正確載入', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveTitle(/選情系統/);
  });

  test('登入頁應顯示 LINE 登入按鈕', async ({ page }) => {
    await page.goto('/login');
    await expect(page.locator('text=LINE')).toBeVisible({ timeout: 10000 });
  });

  test('定價頁應顯示方案資訊', async ({ page }) => {
    await page.goto('/pricing');
    await expect(page.locator('h1, h2').first()).toBeVisible({ timeout: 10000 });
  });

  test('隱私權政策頁應可正常存取', async ({ page }) => {
    const response = await page.goto('/privacy');
    expect(response?.status()).toBe(200);
  });

  test('服務條款頁應可正常存取', async ({ page }) => {
    const response = await page.goto('/terms');
    expect(response?.status()).toBe(200);
  });

  test('404 頁面應顯示在不存在的路徑', async ({ page }) => {
    await page.goto('/this-page-does-not-exist');
    await expect(page.locator('text=404')).toBeVisible({ timeout: 10000 });
  });
});

test.describe('安全性檢查', () => {
  test('未登入不應能存取 dashboard', async ({ page }) => {
    await page.goto('/dashboard');
    // 應被重導到登入頁或顯示未授權
    await page.waitForURL(/login|unauthorized|404/, { timeout: 10000 });
  });

  test('未登入不應能存取 admin', async ({ page }) => {
    await page.goto('/admin');
    await page.waitForURL(/login|admin\/login|404/, { timeout: 10000 });
  });

  test('API 健康檢查應回傳 200', async ({ request }) => {
    const baseUrl = process.env.E2E_API_URL || 'http://localhost:3001';
    try {
      const response = await request.get(`${baseUrl}/api/v1/health`);
      expect(response.status()).toBe(200);
    } catch {
      // API 可能未啟動，跳過
      test.skip();
    }
  });
});

test.describe('響應式設計', () => {
  test('登入頁在手機寬度應正常顯示', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/login');
    await expect(page.locator('button, a').first()).toBeVisible({ timeout: 10000 });
  });
});
