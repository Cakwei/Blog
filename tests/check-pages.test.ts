import { test, expect } from '@playwright/test';

const URL = 'http://localhost:3000'; 

test('Check pages via UI navigation', async ({ page }) => {
  // Homepage
  await page.goto(URL);
  await page.locator("[data-hydrated]").waitFor();

  const homeHeading = page.getByTestId('homeHeading');
  await expect(homeHeading).toBeVisible();
  await expect(homeHeading).toContainText('Curated Stories', { ignoreCase: true });

  // Navigate to Articles via link click, ensuring full hydration and bypassing potential overlays
  await page.locator("[data-hydrated]").waitFor();
  const exploreLink = page.getByTestId('exploreArchiveBtn');
  await expect(exploreLink).toBeVisible();
  await exploreLink.click();

  const searchBtn = page.getByTestId('searchPostInput');
  await expect(searchBtn).toBeVisible();
  await searchBtn.pressSequentially('Self-introduction', { delay: 150 });
  await expect(page.getByTestId('categoryItem')).toBeVisible();
  
  // Check if post loads
  // Go back to index & click on a post
  await page.getByTestId('homeBtn').click();
  await page.locator("[data-hydrated]").waitFor();

  await expect(homeHeading).toBeVisible();
  await expect(homeHeading).toContainText('Curated Stories', { ignoreCase: true });
  await page.getByTestId('postBtn').click();

  // On enter post page
  await page.locator("[data-hydrated]").waitFor();
  await expect(page.getByTestId('publishedText')).toContainText('Published on');

  // Go to login page
  await page.goto(`${URL}/login`);  
  await page.locator("[data-hydrated]").waitFor();
  
  const loginHeading = page.getByRole('heading', { name: 'Welcome back' });
  await expect(loginHeading).toBeVisible();
  await expect(loginHeading).toContainText('Welcome back');

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
  await page.waitForURL(URL);
  await expect(page).toHaveURL(URL);
  await page.locator("[data-hydrated]").waitFor();

  // Check if logged in 
  await page.getByTestId('profileBtn').click();
  await expect(page.getByTestId('profileContent')).toContainText('Charlee');

  // Enter profile
  await page.getByTestId('goToProfileBtn').click();
  await page.waitForURL(`${URL}/profile`);
  await expect(page).toHaveURL(`${URL}/profile`);
  await page.locator("[data-hydrated]").waitFor();
  
  // Attempt update profile
  await page.getByTestId('saveProfileBtn').click();
  await expect(page.getByTestId('statusMsg')).toContainText('successfully');

  // Moves on to posts page, check if page is accessible
  await page.getByTestId('goPostsBtn').click();
  await page.locator("[data-hydrated]").waitFor();
  
  const yourPostsHeading = page.getByTestId('yourPostsHeadingTitle');
  await expect(yourPostsHeading).toBeVisible();
  await expect(yourPostsHeading).toContainText('Your Articles', { ignoreCase: true });

  // Click on New Post in posts page to check page
  await page.getByTestId('newPostBtn').click();
  await page.locator("[data-hydrated]").waitFor();
  
  const createPostsHeading = page.getByTestId('createPostsHeading');
  await expect(createPostsHeading).toBeVisible();
  await expect(createPostsHeading).toContainText('Create New Post', { ignoreCase: true });

  const backBtn = page.getByTestId('backToPostsBtn');
  await expect(backBtn).toBeVisible();
  await backBtn.click();
  await page.waitForURL(`${URL}/posts`);
  await expect(yourPostsHeading).toBeVisible();
  await expect(yourPostsHeading).toContainText('Your Articles', { ignoreCase: true });

  // Checks if edit button works and accessible to page
  const editBtn = page.getByTestId('editPostBtn').first();
  await expect(editBtn).toBeVisible();
  await editBtn.click();
  await page.locator("[data-hydrated]").waitFor();
  
  await expect(page.getByTestId('editPostTxt')).toBeVisible();
  await expect(page.getByTestId('editPostTxt')).toContainText('Edit Post');

  // Quick return back to "/"
  // Testing for header search bar
  await page.goto(URL);
  await page.locator("[data-hydrated]").waitFor();
  
  await page.getByTestId('searchBarBtn').click();
  await expect(page.getByTestId('quickLinkTxt')).toContainText('QUICK LINKS', { ignoreCase: true });

  // Dialog opens, checks if functional
  const searchCommandInput = page.getByTestId('searchCommandInput');
  await searchCommandInput.pressSequentially('Self-Introduction', { delay: 50 });
  await page.getByTestId('searchCommandItem').first().click();
  await expect(page.getByTestId('searchCommandItem')).not.toBeVisible();
  await expect(page.getByTestId('postTitle').filter({ hasText: 'Self-Introduction' })).toBeVisible();
});