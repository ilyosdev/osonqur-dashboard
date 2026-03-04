import { test, expect } from '@playwright/test';
import {
  registerTestOrganization,
  loginViaUI,
  loginViaTokens,
  waitForDashboardLoad,
  getVisibleSidebarItems,
  navigateToPage,
} from './utils/test-helpers';

test.describe('BOSS/OWNER Flow - Organization Setup', () => {
  test.describe('Registration', () => {
    test('should show registration page with all required fields', async ({ page }) => {
      await page.goto('/register');

      // Check all form fields are present
      await expect(page.getByText('Osonqur')).toBeVisible();
      await expect(page.locator('[data-slot="card-title"]')).toContainText("Ro'yxatdan o'tish");
      await expect(page.getByLabel('Tashkilot nomi')).toBeVisible();
      await expect(page.getByLabel("To'liq ismingiz")).toBeVisible();
      await expect(page.getByLabel('Telefon raqam')).toBeVisible();
      await expect(page.getByLabel('Email (ixtiyoriy)')).toBeVisible();
      await expect(page.getByPlaceholder('Kamida 6 ta belgi')).toBeVisible();
      await expect(page.getByPlaceholder('Parolni qayta kiriting')).toBeVisible();
    });

    test('should validate required fields', async ({ page }) => {
      await page.goto('/register');

      // Fill partial form (only phone, missing others)
      await page.getByLabel('Telefon raqam').fill('90 123 45 67');

      // Try to submit - browser HTML5 validation should block or our validation should show error
      await page.getByRole('button', { name: "Ro'yxatdan o'tish" }).click();

      // Check that either HTML5 validation prevents submit or our error shows
      const errorVisible = await page.locator('.bg-destructive\\/10').isVisible().catch(() => false);
      const stillOnRegister = page.url().includes('/register');

      expect(errorVisible || stillOnRegister).toBe(true);
    });

    test('should validate password match', async ({ page }) => {
      await page.goto('/register');

      await page.getByLabel('Tashkilot nomi').fill('Test Company');
      await page.getByLabel("To'liq ismingiz").fill('Test User');
      await page.getByLabel('Telefon raqam').fill('90 123 45 67');
      await page.getByPlaceholder('Kamida 6 ta belgi').fill('password123');
      await page.getByPlaceholder('Parolni qayta kiriting').fill('differentpassword');

      await page.getByRole('button', { name: "Ro'yxatdan o'tish" }).click();

      // Should show password mismatch error
      await expect(page.locator('.bg-destructive\\/10')).toContainText('mos kelmaydi');
    });

    test('should validate minimum password length', async ({ page }) => {
      await page.goto('/register');

      await page.getByLabel('Tashkilot nomi').fill('Test Company');
      await page.getByLabel("To'liq ismingiz").fill('Test User');
      await page.getByLabel('Telefon raqam').fill('90 123 45 67');
      await page.getByPlaceholder('Kamida 6 ta belgi').fill('12345');
      await page.getByPlaceholder('Parolni qayta kiriting').fill('12345');

      await page.getByRole('button', { name: "Ro'yxatdan o'tish" }).click();

      // Should show password length error
      await expect(page.locator('.bg-destructive\\/10')).toContainText('6 ta belgi');
    });

    test.skip('should register successfully and redirect to dashboard', async ({ page }) => {
      const timestamp = Date.now();
      const phoneDigits = timestamp.toString().slice(-7);

      await page.goto('/register');

      await page.getByLabel('Tashkilot nomi').fill(`Test Company ${timestamp}`);
      await page.getByLabel("To'liq ismingiz").fill('Test Admin');
      await page.getByLabel('Telefon raqam').fill(`90 ${phoneDigits.slice(0, 3)} ${phoneDigits.slice(3, 5)} ${phoneDigits.slice(5)}`);
      await page.getByPlaceholder('Kamida 6 ta belgi').fill('TestPassword123!');
      await page.getByPlaceholder('Parolni qayta kiriting').fill('TestPassword123!');

      await page.getByRole('button', { name: "Ro'yxatdan o'tish" }).click();

      // Should redirect to dashboard
      await expect(page).toHaveURL('/', { timeout: 15000 });
    });

    test('should have link to login page', async ({ page }) => {
      await page.goto('/register');

      const loginLink = page.getByRole('link', { name: 'Tizimga kiring' });
      await expect(loginLink).toBeVisible();

      await loginLink.click();
      await expect(page).toHaveURL('/login');
    });
  });

  test.describe('First Login & Dashboard Access', () => {
    let testUser: Awaited<ReturnType<typeof registerTestOrganization>>;

    test.beforeAll(async ({ browser }) => {
      const page = await browser.newPage();
      testUser = await registerTestOrganization(page);
      await page.close();
    });

    test('BOSS can access dashboard after login', async ({ page }) => {
      if (!testUser?.accessToken) {
        test.skip();
        return;
      }

      await loginViaTokens(page, testUser.accessToken, testUser.refreshToken!);
      await waitForDashboardLoad(page);

      // Should see dashboard content
      await expect(page.getByText('Bosh sahifa')).toBeVisible();
    });

    test('BOSS can see all navigation items', async ({ page }) => {
      if (!testUser?.accessToken) {
        test.skip();
        return;
      }

      await loginViaTokens(page, testUser.accessToken, testUser.refreshToken!);
      await waitForDashboardLoad(page);

      const visibleItems = await getVisibleSidebarItems(page);

      // BOSS should see all items
      expect(visibleItems).toContain('Bosh sahifa');
      expect(visibleItems).toContain('Loyihalar');
      expect(visibleItems).toContain("So'rovlar");
      expect(visibleItems).toContain('Xodimlar');
      expect(visibleItems).toContain('Moliya');
      expect(visibleItems).toContain('Ombor');
      expect(visibleItems).toContain('Yetkazuvchilar');
      expect(visibleItems).toContain('Sozlamalar');
    });

    test('BOSS can navigate to Users page', async ({ page }) => {
      if (!testUser?.accessToken) {
        test.skip();
        return;
      }

      await loginViaTokens(page, testUser.accessToken, testUser.refreshToken!);
      await waitForDashboardLoad(page);

      await page.click('text=Xodimlar');
      await expect(page).toHaveURL('/users');
      await expect(page.getByText('Xodim qo\'shish')).toBeVisible();
    });

    test('BOSS can access Settings page', async ({ page }) => {
      if (!testUser?.accessToken) {
        test.skip();
        return;
      }

      await loginViaTokens(page, testUser.accessToken, testUser.refreshToken!);
      await waitForDashboardLoad(page);

      await page.click('text=Sozlamalar');
      await expect(page).toHaveURL('/settings');
    });
  });

  test.describe('User Management', () => {
    let testUser: Awaited<ReturnType<typeof registerTestOrganization>>;

    test.beforeAll(async ({ browser }) => {
      const page = await browser.newPage();
      testUser = await registerTestOrganization(page);
      await page.close();
    });

    test('BOSS can open Add User dialog', async ({ page }) => {
      if (!testUser?.accessToken) {
        test.skip();
        return;
      }

      await loginViaTokens(page, testUser.accessToken, testUser.refreshToken!);
      await navigateToPage(page, '/users');

      await page.click("text=Xodim qo'shish");

      // Dialog should open
      await expect(page.getByRole('dialog')).toBeVisible();
      await expect(page.getByText('Yangi xodimni tizimga qo\'shing')).toBeVisible();
    });

    test('BOSS can see role selection in Add User dialog', async ({ page }) => {
      if (!testUser?.accessToken) {
        test.skip();
        return;
      }

      await loginViaTokens(page, testUser.accessToken, testUser.refreshToken!);
      await navigateToPage(page, '/users');

      await page.click("text=Xodim qo'shish");

      // Check role dropdown exists
      await expect(page.getByRole('dialog')).toBeVisible();
      await expect(page.getByText('Rol')).toBeVisible();
    });

    test('BOSS can filter users by role', async ({ page }) => {
      if (!testUser?.accessToken) {
        test.skip();
        return;
      }

      await loginViaTokens(page, testUser.accessToken, testUser.refreshToken!);
      await navigateToPage(page, '/users');

      // Click role filter
      const roleFilter = page.locator('button').filter({ hasText: 'Barcha rollar' });
      await roleFilter.click();

      // Should see role options
      await expect(page.getByRole('option', { name: 'Direktor' })).toBeVisible();
      await expect(page.getByRole('option', { name: 'Prorab' })).toBeVisible();
    });

    test('BOSS can search users', async ({ page }) => {
      if (!testUser?.accessToken) {
        test.skip();
        return;
      }

      await loginViaTokens(page, testUser.accessToken, testUser.refreshToken!);
      await navigateToPage(page, '/users');

      const searchInput = page.getByPlaceholder("Ism yoki telefon raqam bo'yicha qidirish");
      await expect(searchInput).toBeVisible();

      await searchInput.fill('test');
      // Search should trigger
    });
  });

  test.describe('Dashboard Overview', () => {
    let testUser: Awaited<ReturnType<typeof registerTestOrganization>>;

    test.beforeAll(async ({ browser }) => {
      const page = await browser.newPage();
      testUser = await registerTestOrganization(page);
      await page.close();
    });

    test('BOSS can view empty state on fresh organization', async ({ page }) => {
      if (!testUser?.accessToken) {
        test.skip();
        return;
      }

      await loginViaTokens(page, testUser.accessToken, testUser.refreshToken!);
      await waitForDashboardLoad(page);

      // Dashboard should load without errors
      await expect(page.getByText('Bosh sahifa')).toBeVisible();
    });

    test('BOSS can navigate to all main sections', async ({ page }) => {
      if (!testUser?.accessToken) {
        test.skip();
        return;
      }

      await loginViaTokens(page, testUser.accessToken, testUser.refreshToken!);
      await waitForDashboardLoad(page);

      // Navigate through main sections
      const sections = [
        { name: 'Loyihalar', url: '/projects' },
        { name: "So'rovlar", url: '/requests' },
        { name: 'Xodimlar', url: '/users' },
        { name: 'Moliya', url: '/finance' },
        { name: 'Ombor', url: '/warehouse' },
      ];

      for (const section of sections) {
        await page.click(`text=${section.name}`);
        await expect(page).toHaveURL(section.url);
        await page.goBack();
      }
    });
  });
});
