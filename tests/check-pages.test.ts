import { test, expect } from '@playwright/test';

const URL = 'http://localhost:3000'; 

test('Check pages via UI navigation', async ({ page }) => {
  // Homepage
  await page.goto(URL);
  const homeHeading = page.getByRole('heading', { level: 1 });
  await expect(homeHeading).toBeVisible();
  await expect(homeHeading).toContainText('Curated Stories.');

  // Navigate to Articles via link click
  await page.getByRole('link', { name: 'Explore Archive' }).click();
  await expect(page).toHaveURL(new RegExp(`${URL}/articles(\\?.*)?$`));
  const articlesHeading = page.getByRole('heading', { level: 1 });
  await expect(articlesHeading).toBeVisible();
  await expect(articlesHeading).toContainText('Article Archive.');

  // Go back to index & click on a post
  await page.getByTestId('homeBtn').click();
  await expect(homeHeading).toBeVisible();
  await expect(homeHeading).toContainText('Curated Stories.');
  await page.getByTestId('postBtn').click();

  // On enter post page
  await expect(page.getByTestId('publishedText')).toContainText('Published on');

  // Go to login page
  await page.goto(`${URL}/login`);
  const loginHeading = page.getByRole('heading', { level: 1 });
  await expect(loginHeading).toBeVisible();
  await expect(loginHeading).toHaveText('Welcome back');

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

  // Check if logged in 
  await page.getByTestId('profileBtn').click();
  await expect(page.getByTestId('profileContent')).toContainText('Charlee');

  // Enter profile
  await page.getByTestId('goToProfileBtn').click();
  await page.waitForURL(`${URL}/profile`)
  await expect(page).toHaveURL(`${URL}/profile`)
  
  // Attempt update profile
  await page.getByTestId('saveProfileBtn').click();
  await expect(page.getByTestId('statusMsg')).toContainText('successfully');

  // Moves on to posts page, check if page is accessible
  await page.getByTestId('goPostsBtn').click();
  await expect(homeHeading).toBeVisible();
  await expect(homeHeading).toContainText('Your Articles');

  // Click on New Post in posts page to check page
  await page.getByTestId('newPostBtn').click();
  await expect(homeHeading).toBeVisible();
  await expect(homeHeading).toContainText('Create New Post');

});