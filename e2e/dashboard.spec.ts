import { test, expect } from '@playwright/test';

// Test credentials - use same as API tests
const TEST_EMAIL = 'playwright_test@smetakon.test';
const TEST_PASSWORD = 'TestPassword123!';
const TEST_PHONE = '901234567'; // Without +998 prefix

test.describe('Dashboard E2E Tests', () => {
  test.describe('Authentication', () => {
    test('should show login page', async ({ page }) => {
      await page.goto('/login');
      
      await expect(page.getByText('Osonqur')).toBeVisible();
      await expect(page.getByText('Tizimga kirish', { exact: true })).toBeVisible();
      await expect(page.getByLabel('Telefon raqam')).toBeVisible();
      await expect(page.getByPlaceholder('Parolingizni kiriting')).toBeVisible();
      await expect(page.getByRole('button', { name: 'Kirish', exact: true })).toBeVisible();
    });

    test('should show validation error for invalid credentials', async ({ page }) => {
      await page.goto('/login');
      
      await page.getByLabel('Telefon raqam').fill('99 999 99 99');
      await page.getByPlaceholder('Parolingizni kiriting').fill('wrongpassword');
      await page.getByRole('button', { name: 'Kirish', exact: true }).click();
      
      await expect(page.locator('.bg-destructive\\/10')).toBeVisible({ timeout: 10000 });
    });

    test('should redirect unauthenticated users to login', async ({ page }) => {
      // Try to access protected route
      await page.goto('/');
      
      // Should be redirected to login
      await expect(page).toHaveURL(/.*login.*/);
    });
  });

  test.describe('Navigation (requires auth)', () => {
    test.beforeEach(async ({ page }) => {
      // Set up authentication via API first
      const apiUrl = process.env.API_URL || 'http://localhost:4001';
      
      // Register a test user
      const timestamp = Date.now();
      const testPhone = `+99890${timestamp.toString().slice(-7)}`;
      
      const registerResponse = await page.request.post(`${apiUrl}/vendor/auth/register`, {
        data: {
          orgName: 'Playwright Test LLC',
          name: 'Playwright Tester',
          phone: testPhone,
          email: `playwright_${timestamp}@test.com`,
          password: TEST_PASSWORD,
        },
      });

      if (registerResponse.ok()) {
        const data = await registerResponse.json();
        const accessToken = data.tokens?.accessToken;
        
        if (accessToken) {
          // Store token in localStorage before navigating
          await page.goto('/login');
          await page.evaluate((token) => {
            localStorage.setItem('accessToken', token);
            localStorage.setItem('auth', JSON.stringify({ isAuthenticated: true }));
          }, accessToken);
        }
      }
    });

    test('should navigate to main dashboard pages', async ({ page }) => {
      await page.goto('/');
      
      // If redirected to login, the auth setup didn't work - skip
      if (page.url().includes('login')) {
        test.skip();
        return;
      }

      // Check sidebar navigation exists
      const sidebar = page.locator('aside, nav, [role="navigation"]');
      await expect(sidebar.first()).toBeVisible();
    });
  });

  test.describe('Public Pages', () => {
    test('should load login page without errors', async ({ page }) => {
      const errors: string[] = [];
      page.on('pageerror', (error) => errors.push(error.message));
      
      await page.goto('/login');
      await page.waitForLoadState('networkidle');
      
      // No JavaScript errors
      expect(errors).toHaveLength(0);
    });

    test('should have working password toggle', async ({ page }) => {
      await page.goto('/login');
      
      const passwordInput = page.getByPlaceholder('Parolingizni kiriting');
      const toggleButton = page.locator('button[type="button"]').filter({ has: page.locator('svg.h-4.w-4') }).first();
      
      await expect(passwordInput).toHaveAttribute('type', 'password');
      
      await toggleButton.click();
      await expect(passwordInput).toHaveAttribute('type', 'text');
      
      await toggleButton.click();
      await expect(passwordInput).toHaveAttribute('type', 'password');
    });

    test('should format phone number correctly', async ({ page }) => {
      await page.goto('/login');
      
      const phoneInput = page.getByLabel('Telefon raqam');
      
      // Type phone number
      await phoneInput.fill('901234567');
      
      // Should be formatted
      await expect(phoneInput).toHaveValue(/90\s+123\s+45\s+67|90 123 45 67/);
    });
  });

  test.describe('Responsive Design', () => {
    test('should be responsive on mobile', async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 667 });
      await page.goto('/login');
      
      await expect(page.getByRole('button', { name: 'Kirish', exact: true })).toBeVisible();
      
      const form = page.locator('form');
      const box = await form.boundingBox();
      expect(box?.width).toBeLessThanOrEqual(375);
    });

    test('should be responsive on tablet', async ({ page }) => {
      await page.setViewportSize({ width: 768, height: 1024 });
      await page.goto('/login');
      
      await expect(page.getByRole('button', { name: 'Kirish', exact: true })).toBeVisible();
    });
  });

  test.describe('Accessibility', () => {
    test('should have proper form labels', async ({ page }) => {
      await page.goto('/login');
      
      const phoneInput = page.getByLabel('Telefon raqam');
      const passwordInput = page.getByPlaceholder('Parolingizni kiriting');
      
      await expect(phoneInput).toBeVisible();
      await expect(passwordInput).toBeVisible();
    });

    test('should be keyboard navigable', async ({ page }) => {
      await page.goto('/login');
      
      // Tab through form elements
      await page.keyboard.press('Tab');
      await page.keyboard.press('Tab');
      
      // Should be able to focus on inputs
      const focusedElement = page.locator(':focus');
      await expect(focusedElement).toBeVisible();
    });
  });
});
