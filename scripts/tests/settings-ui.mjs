import { chromium } from 'playwright';
import assert from 'node:assert/strict';
const browser = await chromium.launch();
try {
  for (const width of [1280, 390, 320]) {
    const page = await browser.newPage({ viewport: { width, height: 900 }, reducedMotion: 'reduce' });
    const user = { id: 'test', username: 'Alex Learner', email: 'alex@example.com', avatar: null, level: 4, exp: 250, isEmailVerified: true };
    const streak = { currentStreak: 3, longestStreak: 5, dailyTarget: 100, nextDailyTarget: null, todayScore: 40, progressPercent: 40, remainingScore: 60, timezone: 'Asia/Ho_Chi_Minh' };
    let profileSave, goalSave, passwordSave;
    let avatarUploads = 0;
    const avatarPng = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jh0kAAAAASUVORK5CYII=", "base64");
    await page.route("https://uploads.test/**", route => {
      if (route.request().method() === "PUT") avatarUploads++;
      return route.fulfill({ status: 200, headers: { "access-control-allow-origin": "*", "access-control-allow-methods": "PUT, GET, OPTIONS", "access-control-allow-headers": "content-type" }, body: route.request().method() === "GET" ? avatarPng : "" });
    });
    await page.addInitScript(() => localStorage.setItem('accessToken', 'test'));
    await page.route('**/api/**', route => {
      const path = new URL(route.request().url()).pathname.replace('/api/v1/', '/api/');
      const body = route.request().postDataJSON();
      let json = {};
      if (path === '/api/users/profile') { if (route.request().method() === 'PUT') { profileSave = body; Object.assign(user, body); } json = user; }
      if (path === '/api/streak') json = streak;
      if (path === '/api/uploads/presign-image') json = { uploadUrl: 'https://uploads.test/avatar', fileUrl: 'https://uploads.test/avatar.png' };
      if (path === '/api/streak/settings') { goalSave = body; json = { dailyTarget: 100, nextDailyTarget: body.dailyTarget, effectiveDate: '2026-11-16', timezone: body.timezone }; }
      if (path === '/api/users/change-password') { passwordSave = body; json = { message: 'Password updated' }; }
      return route.fulfill({ status: 200, json });
    });
    await page.goto('http://localhost:3000/settings');
    await page.getByRole('tab', { name: 'Profile', exact: true }).waitFor({ timeout: 5000 });
    assert.equal(await page.getByRole('tab', { name: 'Profile', exact: true }).getAttribute('aria-selected'), 'true');
    assert.equal(await page.getByRole('textbox', { name: 'Current password', exact: true }).count(), 0);
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true, 'No horizontal overflow');
    if (width === 390 || width === 1280) await page.screenshot({ path: `/private/tmp/flenvn-settings-${width}.png` });
    const chooserPromise = page.waitForEvent('filechooser');
    await page.getByRole('button', { name: 'Change photo', exact: true }).click();
    const chooser = await chooserPromise;
    await chooser.setFiles({ name: 'avatar.png', mimeType: 'image/png', buffer: avatarPng });
    await page.getByText('avatar.png', { exact: true }).waitFor();
    await page.getByRole('textbox', { name: 'Username', exact: true }).fill('New name');
    await page.getByRole('tab', { name: 'Learning goal', exact: true }).click();
    await page.getByRole('button', { name: /200 points/ }).click();
    await page.getByRole('button', { name: 'Save learning goal', exact: true }).click();
    await page.getByText('Your new target will start on the next local day.', { exact: true }).waitFor();
    assert.equal(goalSave.dailyTarget, 200);
    await page.getByRole('tab', { name: 'Profile', exact: true }).click();
    assert.equal(await page.getByRole('textbox', { name: 'Username', exact: true }).inputValue(), 'New name', 'Draft survives tab switching');
    await page.getByRole('button', { name: 'Save profile', exact: true }).click();
    await page.getByText('Your profile has been updated.', { exact: true }).waitFor();
    assert.equal(profileSave.username, 'New name');
    assert.equal(profileSave.avatar, 'https://uploads.test/avatar.png');
    assert.equal(avatarUploads, 1, 'Avatar uses a signed upload before profile save');
    await page.getByRole('tab', { name: 'Security', exact: true }).click();
    await page.getByLabel('Current password', { exact: true }).fill('currentPassword');
    await page.getByLabel('New password', { exact: true }).fill('newPassword123');
    await page.getByLabel('Confirm new password', { exact: true }).fill('newPassword123');
    await page.getByRole('button', { name: 'Show new password', exact: true }).click();
    assert.equal(await page.getByLabel('New password', { exact: true }).getAttribute('type'), 'text');
    await page.getByRole('button', { name: 'Change password', exact: true }).click();
    await page.getByText('Your password has been changed.', { exact: true }).waitFor();
    assert.equal(passwordSave.newPassword, 'newPassword123');
    await page.getByRole('tab', { name: 'Account', exact: true }).click();
    await page.getByRole('button', { name: 'Log out this device', exact: true }).waitFor();
    console.log(`PASS ${width}px: responsive settings navigation, profile draft/save, goal save, password visibility/save, account controls`);
    await page.close();
  }
} finally { await browser.close(); }
