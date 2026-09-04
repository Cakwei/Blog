import { test, expect } from '@playwright/test';

const URL = 'http://localhost:3000'; 

test('Check pages via UI navigation', async ({ page }) => {
  // Homepage
  await page.goto(URL);
  const homeHeading = page.getByRole('heading', { level: 1 });
  await expect(homeHeading).toBeVisible();
  await expect(homeHeading).toContainText('Curated Stories.');

  // Navigate to Articles via link click, ensuring full hydration and bypassing potential overlays
  const exploreLink = page.getByRole('link', { name: 'Explore Archive' });
  await exploreLink.waitFor({ state: 'visible' });
  await exploreLink.click({ force: true });

  const searchBtn = page.getByTestId('searchPostInput');

  await searchBtn.pressSequentially('Self-introduction', { delay: 150 });
  await expect(page.getByTestId('categoryItem')).toBeVisible();
  // Check if post loads
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

  await emailInput.pressSequentially('charleetan2020@gmail.com', { delay: 50 });
  await passwordInput.pressSequentially('123456789', { delay: 50 });

  // Check mock values
  await expect(emailInput).toHaveValue('charleetan2020@gmail.com');
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
  await page.waitForURL(`${URL}/profile`);
  await expect(page).toHaveURL(`${URL}/profile`);
  
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

  await page.getByTestId('backToPostsBtn').click();
  await expect(homeHeading).toBeVisible();
  await expect(homeHeading).toContainText('Your Articles');

  // Checks if edit button works and accessible to page
  await page.getByTestId('editPostBtn').first().click();
  await expect(page.getByTestId('editPostTxt')).toBeVisible();
  await expect(page.getByTestId('editPostTxt')).toContainText('Edit Post');

  // Quick return back to "/"
  // Testing for header search bar
  await page.goto(URL);
  await page.getByTestId('searchBarBtn').click();
  await expect(page.getByTestId('quickLinkTxt')).toContainText('QUICK LINKS', { ignoreCase: true });

  // Dialog opens, checks if functional
  const searchCommandInput = page.getByTestId('searchCommandInput');
  await searchCommandInput.pressSequentially('Self-Introduction', { delay: 50 });
  await page.getByTestId('searchCommandItem').first().click();
  await expect(page.getByTestId('searchCommandItem')).not.toBeVisible();
  await expect(homeHeading.filter({ hasText: 'Self-Introduction' })).toBeVisible();

})