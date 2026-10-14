import { expect, test } from '@playwright/test';
import { closeExtraContexts, createRoomUI, joinAs, newCtx } from './helpers';

test.afterEach(closeExtraContexts);

test('TC-001/TC-015 create a room, then a colleague joins via the link', async ({ page, browser }) => {
  const code = await createRoomUI(page, 'An');
  await page.getByRole('tab', { name: 'Mọi người' }).click();
  await expect(page.getByTestId('members')).toContainText('An');
  await expect(page.getByTestId('members')).toContainText('Quản trị');

  const binh = await joinAs(browser, code, 'Bình');
  await binh.getByRole('tab', { name: 'Mọi người' }).click();
  await expect(binh.getByTestId('members')).toContainText('Bình (bạn)');
  await expect(page.getByTestId('members')).toContainText('Bình');
});

test('TC-016 duplicate name shows the exact message', async ({ page, browser }) => {
  const code = await createRoomUI(page, 'An');
  const ctx = await newCtx(browser);
  const p2 = await ctx.newPage();
  await p2.goto(`/r/${code}`);
  await p2.getByLabel('Tên của bạn').fill('an');
  await p2.getByRole('button', { name: 'Vào phòng' }).click();
  await expect(p2.getByRole('alert').filter({ hasText: /\S/ })).toHaveText('Tên này đã có người dùng trong phòng. Hãy chọn tên khác.');
});

test('TC-013 unknown code from the home page', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('tab', { name: 'Vào phòng' }).click();
  await page.getByLabel('Tên của bạn').fill('X');
  await page.getByLabel('Mã phòng').fill('ZZZZZZ');
  await page.getByRole('button', { name: 'Vào phòng' }).last().click();
  await expect(page.getByRole('alert').filter({ hasText: /\S/ })).toHaveText('Không tìm thấy phòng. Hãy kiểm tra lại mã phòng.');
});

test('TC-006/TC-007/TC-014 invalid inputs keep the button disabled with hints', async ({ page }) => {
  await page.goto('/');
  const submit = page.getByRole('button', { name: 'Tạo phòng', exact: true }).last();
  await page.getByLabel('Tên của bạn').fill('An');
  await page.getByLabel('Tên phòng').fill('Dev');
  await page.getByLabel('Mã PIN quản trị').fill('123');
  await page.getByLabel('Tên phòng').click();
  await expect(submit).toBeDisabled();
  await expect(page.getByText('PIN gồm 4–8 chữ số')).toBeVisible();
  await page.getByRole('tab', { name: 'Vào phòng' }).click();
  await page.getByLabel('Mã phòng').fill('ABCDE');
  await page.getByLabel('Tên của bạn').click();
  await expect(page.getByText('Mã phòng gồm 6 ký tự')).toBeVisible();
});

test('TC-020 reload keeps the same identity (no join dialog)', async ({ page }) => {
  const code = await createRoomUI(page, 'An');
  await page.reload();
  await expect(page.getByTestId('room-code')).toHaveText(code);
  await expect(page.getByRole('dialog')).toHaveCount(0);
});

test('TC-196 legacy /room/CODE redirects to /r/CODE', async ({ page, request }) => {
  const res = await request.get('/room/ABCDEF', { maxRedirects: 0 });
  expect(res.status()).toBe(308);
  expect(res.headers()['location']).toBe('/r/ABCDEF');
  await page.goto('/room/ABCDEF');
  await expect(page).toHaveURL(/\/r\/ABCDEF$/);
});

test('TC-024 leaving returns home and the old link asks for a name again', async ({ page }) => {
  const code = await createRoomUI(page, 'An');
  await page.getByRole('button', { name: 'Rời phòng' }).click();
  await expect(page).toHaveURL(/\/$/);
  await page.goto(`/r/${code}`);
  await expect(page.getByRole('dialog')).toContainText('Vào phòng');
});
