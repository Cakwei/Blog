import { test, expect } from '@playwright/test';

const URL = process.env.GITHUB_ACTIONS === 'true' ? 'https://':'http://localhost:3000'; 

test('Check pages via UI navigation', async ({ page }) => {
  // Homepage
  await page.goto(URL);
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Curated Stories.');

  // Navigate to Articles via link click
  await page.getByRole('link', { name: 'Explore Archive' }).click();
  await expect(page).toHaveURL(new RegExp(`${URL}/articles(\\?.*)?$`));
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Article Archive.');

  // Go back to index & click on a post
  await page.getByTestId('homeBtn').click();
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Curated Stories.');
  await page.getByTestId('postBtn').click();

  // On enter post page
  await expect(page.getByTestId('publishedText')).toContainText('Published on');

  // Go to login page
  await page.goto(`${URL}/login`);
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Welcome back');

  // Fill credentials using pressSequentially to prevent state/re-render issues
  const emailInput = page.getByTestId('emailInput');
  const passwordInput = page.getByTestId('passwordInput');

  await emailInput.pressSequentially('charleetan121@gmail.com', { delay: 50 });
  await passwordInput.pressSequentially('123456789', { delay: 50 });

  // Check mock values
  await expect(emailInput).toHaveValue('charleetan121@gmail.com');
  await expect(passwordInput).toHaveValue('123456789');

  // Submit form
  await page.getByTestId('submitLoginBtn').click();

  // Final assertion
  await expect(page).toHaveURL(URL);
});