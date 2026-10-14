import { expect, test } from '@playwright/test';
import { addLink, createRoomUI, joinAs, openHost, yt } from './helpers';

test('TC-200 offline shows "Đang kết nối lại…" and recovers', async ({ page, context }) => {
  await createRoomUI(page, 'An');
  await context.setOffline(true);
  await expect(page.getByTestId('banner-conn')).toHaveText('Đang kết nối lại…', { timeout: 30_000 });
  await context.setOffline(false);
  await expect(page.getByTestId('banner-conn')).toHaveCount(0, { timeout: 30_000 });
});

test('TC-019/TC-163 markup in names and chat is shown as text, never executed', async ({ page, browser }) => {
  const code = await createRoomUI(page, 'An');
  let dialogs = 0;
  page.on('dialog', (d) => {
    dialogs++;
    void d.dismiss();
  });
  const evil = await joinAs(browser, code, '<b>x</b>');
  await evil.getByRole('tab', { name: 'Mọi người' }).click();
  await evil.getByLabel('Nhắn gì đó…').fill('<img src=x onerror=alert(1)>');
  await evil.getByRole('button', { name: 'Gửi' }).click();
  await page.getByRole('tab', { name: 'Mọi người' }).click();
  await expect(page.getByTestId('chat-log')).toContainText('<img src=x onerror=alert(1)>');
  await expect(page.getByTestId('members')).toContainText('<b>x</b>');
  expect(dialogs).toBe(0);
});

test('TC-035 kicked member sees the message and the join dialog', async ({ page, browser }) => {
  const code = await createRoomUI(page, 'An');
  const binh = await joinAs(browser, code, 'Bình');
  await page.getByRole('tab', { name: 'Mọi người' }).click();
  await page.getByRole('button', { name: 'Tùy chọn: Bình' }).click();
  await page.getByRole('menuitem', { name: 'Mời ra khỏi phòng' }).click();
  await expect(page.getByRole('alertdialog')).toContainText('Mời Bình ra khỏi phòng?');
  await page.getByRole('button', { name: 'Mời ra' }).click();
  await expect(binh.getByRole('alert').filter({ hasText: /\S/ })).toHaveText(
    'Bạn đã được mời ra khỏi phòng.',
  );
});

test('TC-030/TC-031 claim admin with the PIN', async ({ page, browser }) => {
  const code = await createRoomUI(page, 'An', '4321');
  const binh = await joinAs(browser, code, 'Bình');
  await binh.getByRole('tab', { name: 'Mọi người' }).click();
  await binh.getByRole('button', { name: 'Nhận quyền quản trị' }).click();
  const pinBox = binh.getByRole('textbox', { name: 'Nhập mã PIN quản trị' });
  await pinBox.fill('0000');
  await binh.getByRole('button', { name: 'Xác nhận' }).click();
  await expect(binh.getByTestId('toast').last()).toHaveText('Mã PIN không đúng. Bạn còn 4 lần thử.');
  await pinBox.fill('4321');
  await binh.getByRole('button', { name: 'Xác nhận' }).click();
  await expect(binh.getByText('Cài đặt phòng')).toBeVisible();
});

test('TC-180 settings save shows confirmation and changes the vote target', async ({ page, browser }) => {
  const code = await createRoomUI(page, 'An');
  await joinAs(browser, code, 'Bình');
  await page.getByRole('tab', { name: 'Mọi người' }).click();
  await page.getByText('Cài đặt phòng').click();
  await page.getByLabel('Tỉ lệ phiếu để bỏ qua (%)').fill('9');
  await page.getByRole('button', { name: 'Lưu cài đặt' }).click();
  await expect(page.getByText('Nhập từ 10 đến 100')).toBeVisible();
  await page.getByLabel('Tỉ lệ phiếu để bỏ qua (%)').fill('100');
  await page.getByRole('button', { name: 'Lưu cài đặt' }).click();
  await expect(page.getByTestId('toast').last()).toHaveText('Đã lưu cài đặt phòng');
});

test('no horizontal overflow on a phone, with banners, queue and long titles', async ({ page, browser }) => {
  const code = await createRoomUI(page, 'Người dùng có cái tên rất dài để thử');
  await joinAs(browser, code, 'Bình');
  await addLink(page, yt(9601));
  await addLink(page, yt(9602));
  for (const tab of ['Phòng', 'Thêm bài', 'Mọi người']) {
    await page.getByRole('tab', { name: tab }).click();
    const [scrollW, viewW] = await page.evaluate(() => [
      document.documentElement.scrollWidth,
      window.visualViewport!.width,
    ]);
    expect(scrollW, `tab ${tab}`).toBeLessThanOrEqual(Math.ceil(viewW));
  }
});

test('no console errors (incl. hydration) on home, room and host pages', async ({ page, browser }) => {
  const errors: string[] = [];
  const watch = (p: import('@playwright/test').Page) =>
    p.on('console', (m) => {
      if (m.type() === 'error' && !/Failed to load resource/.test(m.text())) errors.push(m.text().slice(0, 200));
    });
  watch(page);
  const code = await createRoomUI(page, 'An');
  await page.reload();
  await page.getByTestId('room-code').waitFor();
  const host = await openHost(browser, code);
  watch(host);
  await host.reload();
  await host.getByTestId('host-code').waitFor();
  await host.waitForTimeout(500);
  expect(errors).toEqual([]);
});
