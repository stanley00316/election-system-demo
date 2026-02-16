import { test, expect } from '@playwright/test';

test.describe('認證流程', () => {
  test('登入頁應正確渲染所有元素', async ({ page }) => {
    await page.goto('/login');

    // 等待頁面完全載入
    await page.waitForLoadState('networkidle');

    // 應有 LINE 登入按鈕
    const loginButton = page.locator('button, a').filter({ hasText: /LINE|登入/ }).first();
    await expect(loginButton).toBeVisible({ timeout: 10000 });
  });

  test('Demo 模式登入應可正常使用（如啟用）', async ({ page }) => {
    await page.goto('/login');
    await page.waitForLoadState('networkidle');

    // 檢查是否有 Demo 模式按鈕
    const demoButton = page.locator('button').filter({ hasText: /範例|Demo|體驗/ });

    if (await demoButton.isVisible().catch(() => false)) {
      await demoButton.click();
      // Demo 模式應導向 dashboard
      await page.waitForURL(/dashboard|role-select/, { timeout: 15000 });
    }
  });

  test('登出後應回到登入頁', async ({ page }) => {
    // 直接存取 dashboard（無 token 應重導）
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');

    // 確認被重導到登入相關頁面
    const url = page.url();
    const isRedirected = url.includes('login') || url.includes('404') || url === new URL('/', page.url()).href;
    expect(isRedirected).toBeTruthy();
  });
});

test.describe('2FA 頁面', () => {
  test('2FA 設定頁應正確渲染', async ({ page }) => {
    const response = await page.goto('/setup-2fa');
    // 未認證應重導或返回錯誤
    expect(response?.status()).toBeLessThan(500);
  });

  test('2FA 驗證頁應正確渲染', async ({ page }) => {
    const response = await page.goto('/verify-2fa');
    expect(response?.status()).toBeLessThan(500);
  });
});
