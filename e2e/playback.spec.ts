import { expect, test } from '@playwright/test';
import { addLink, createRoomUI, joinAs, openHost, yt } from './helpers';

test('TC-050/TC-078/TC-090 host plays, order matches everywhere, ended advances', async ({ page, browser }) => {
  const code = await createRoomUI(page, 'An');
  const host = await openHost(browser, code);
  await expect(page.getByTestId('banner-player')).toHaveCount(0);

  await addLink(page, yt(9001)); // plays immediately
  await expect(page.getByTestId('now-playing-title')).toHaveText('Bài thử Vid00009001');
  await expect(host.getByTestId('fake-player')).toContainText('Vid00009001 playing');

  const binh = await joinAs(browser, code, 'Bình');
  await addLink(binh, yt(9002));
  await addLink(page, yt(9003));
  await addLink(page, yt(9004));

  // Fair order: Bình (round 1), An (round 1 — but An just played), An (round 2)
  const memberOrder = await page.getByTestId('queue-item').allInnerTexts();
  const binhOrder = await binh.getByTestId('queue-item').allInnerTexts();
  expect(memberOrder.map((t) => t.split('\n')[0])).toEqual(binhOrder.map((t) => t.split('\n')[0]));
  expect(memberOrder[0]).toContain('Vid00009002');
  const hostNext = await host.getByTestId('host-next').innerText();
  expect(hostNext).toContain('Vid00009002');
  await expect(page.getByTestId('queue-count')).toHaveText('3');

  await host.evaluate(() => (window as unknown as { __mrPlayer: { end(): void } }).__mrPlayer.end());
  await expect(page.getByTestId('now-playing-title')).toHaveText('Bài thử Vid00009002');
  await expect(host.getByTestId('host-title')).toHaveText('Bài thử Vid00009002');
});

test('TC-093 vote to skip from two phones', async ({ page, browser }) => {
  const code = await createRoomUI(page, 'An');
  await openHost(browser, code);
  await addLink(page, yt(9101));
  await addLink(page, yt(9102));
  const binh = await joinAs(browser, code, 'Bình');
  const vote = page.getByTestId('vote-skip');
  await expect(vote).toContainText('Bỏ qua (0/1)');
  await binh.getByTestId('vote-skip').click();
  await expect(page.getByTestId('now-playing-title')).toHaveText('Bài thử Vid00009102');
});

test('TC-104 player error skips the track', async ({ page, browser }) => {
  const code = await createRoomUI(page, 'An');
  const host = await openHost(browser, code);
  await addLink(page, yt(9201));
  await addLink(page, yt(9202));
  await host.evaluate(() => (window as unknown as { __mrPlayer: { error(c: number): void } }).__mrPlayer.error(150));
  await expect(page.getByTestId('now-playing-title')).toHaveText('Bài thử Vid00009202');
  await page.getByRole('button', { name: 'Nhật ký' }).click();
  await expect(page.getByTestId('activity-log')).toContainText('vì video không phát được (mã 150)');
});

test('TC-122 a second speaker takes over and the first can take it back', async ({ page, browser }) => {
  const code = await createRoomUI(page, 'An');
  const h1 = await openHost(browser, code);
  await openHost(browser, code);
  await expect(h1.getByText('Máy phát đã được mở ở thiết bị khác. Trang này đã dừng phát.')).toBeVisible();
  await h1.getByRole('button', { name: 'Phát ở máy này' }).click();
  await expect(h1.getByTestId('fake-player')).toBeVisible();
});

test('TC-055 fifth track shows the queue-limit message', async ({ page, browser }) => {
  const code = await createRoomUI(page, 'An');
  await openHost(browser, code);
  for (let i = 0; i < 5; i++) await addLink(page, yt(9300 + i)); // first one plays, 4 queued
  await page.getByRole('tab', { name: 'Thêm bài' }).click();
  await page.getByLabel('Tìm bài hát hoặc dán link YouTube').fill(yt(9399));
  await page.getByRole('button', { name: 'Thêm vào hàng chờ' }).click();
  await expect(page.getByTestId('toast').last()).toHaveText(
    'Bạn đã có 4 bài đang chờ. Hãy đợi bài của bạn phát rồi thêm tiếp.',
  );
});
