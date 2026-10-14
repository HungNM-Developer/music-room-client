import { type BrowserContext, expect, test } from '@playwright/test';
import { addLink, createRoomUI, yt } from './helpers';

/** Records speechSynthesis.speak and media play() calls instead of making sound. */
const spy = (ctx: BrowserContext) =>
  ctx.addInitScript(() => {
    const w = window as unknown as { __spoken: string[]; __played: string[] };
    w.__spoken = [];
    w.__played = [];
    HTMLMediaElement.prototype.play = function () {
      w.__played.push(this.src);
      return Promise.resolve();
    };
    SpeechSynthesis.prototype.speak = function (u: SpeechSynthesisUtterance) {
      w.__spoken.push(u.text);
      setTimeout(() => u.onend?.(new Event('end') as SpeechSynthesisEvent), 1500);
    };
  });
const spoken = (p: import('@playwright/test').Page) =>
  p.evaluate(() => (window as unknown as { __spoken: string[] }).__spoken);
const djPlays = (p: import('@playwright/test').Page) =>
  p.evaluate(() => (window as unknown as { __played: string[] }).__played.filter((s) => s.includes('/sounds/')));

test('TC-127/TC-128/TC-079 wishes and DJ sounds play on the speaker only; music ducks to 20%', async ({ page, browser, context }) => {
  await spy(context);
  const code = await createRoomUI(page, 'An');

  const hostCtx = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  await spy(hostCtx);
  const host = await hostCtx.newPage();
  await host.goto(`/r/${code}/host`);
  await host.getByLabel('Mã PIN quản trị').fill('1234');
  await host.getByRole('button', { name: 'Mở máy phát' }).click();
  await host.getByTestId('fake-player').waitFor();
  const start = host.getByRole('button', { name: /Bắt đầu phát/ });
  if (await start.isVisible()) await start.click();

  await addLink(page, yt(9901));
  await addLink(page, yt(9902));
  await expect(page.getByTestId('queue-item').first()).toContainText('An (bạn) · vòng 1'); // TC-079
  await page.getByRole('button', { name: 'Gửi lời chúc' }).first().click();
  await page.getByRole('textbox', { name: 'Gửi lời chúc' }).fill('Chúc mừng sinh nhật');
  await page.getByRole('button', { name: 'Lưu lời chúc' }).click();
  await expect(page.getByTestId('queue-item').first()).toContainText('💌');

  await host.evaluate(() => (window as unknown as { __mrPlayer: { end(): void } }).__mrPlayer.end());
  await expect(host.getByTestId('fake-player')).toContainText('Vid00009902 playing vol 20');
  await expect.poll(() => spoken(host)).toEqual(['Chúc mừng sinh nhật']);
  await expect(host.getByTestId('fake-player')).toContainText('vol 100', { timeout: 5000 });
  expect(await spoken(page)).toEqual([]);

  await page.getByRole('tab', { name: 'Mọi người' }).click();
  await page.getByRole('button', { name: 'AIRHORN 🎺' }).click();
  await expect.poll(() => djPlays(host)).toEqual([expect.stringContaining('/sounds/airhorn.mp3')]);
  expect(await djPlays(page)).toEqual([]);
});

test('review P2-7: a wish whose TTS never finishes does not leave the next track at 20%', async ({ page, browser }) => {
  const code = await createRoomUI(page, 'An');
  const hostCtx = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  await hostCtx.addInitScript(() => {
    SpeechSynthesis.prototype.speak = () => {}; // onend never fires (Chrome GC bug)
  });
  const host = await hostCtx.newPage();
  await host.goto(`/r/${code}/host`);
  await host.getByLabel('Mã PIN quản trị').fill('1234');
  await host.getByRole('button', { name: 'Mở máy phát' }).click();
  await host.getByTestId('fake-player').waitFor();
  const start = host.getByRole('button', { name: /Bắt đầu phát/ });
  if (await start.isVisible()) await start.click();
  await addLink(page, yt(9911));
  await addLink(page, yt(9912));
  await addLink(page, yt(9913));
  await page.getByRole('button', { name: 'Gửi lời chúc' }).first().click();
  await page.getByRole('textbox', { name: 'Gửi lời chúc' }).fill('Hi');
  await page.getByRole('button', { name: 'Lưu lời chúc' }).click();
  const end = () => host.evaluate(() => (window as unknown as { __mrPlayer: { end(): void } }).__mrPlayer.end());
  await end();
  await expect(host.getByTestId('fake-player')).toContainText('Vid00009912 playing vol 20');
  await end();
  await expect(host.getByTestId('fake-player')).toContainText('Vid00009913 playing vol 100');
});

test('review P2-6: when the admin moves playback to someone else, the speaker stops at once', async ({ page, browser }) => {
  const code = await createRoomUI(page, 'An');
  const hostCtx = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  const host = await hostCtx.newPage();
  await host.goto(`/r/${code}/host`);
  await host.getByLabel('Mã PIN quản trị').fill('1234');
  await host.getByRole('button', { name: 'Mở máy phát' }).click();
  await host.getByTestId('fake-player').waitFor();
  const start = host.getByRole('button', { name: /Bắt đầu phát/ });
  if (await start.isVisible()) await start.click();
  await addLink(page, yt(9921));
  await expect(host.getByTestId('fake-player')).toContainText('playing');
  await page.getByRole('tab', { name: 'Mọi người' }).click();
  const binhCtx = await browser.newContext();
  const binh = await binhCtx.newPage();
  await binh.goto(`/r/${code}`);
  await binh.getByLabel('Tên của bạn').fill('Bình');
  await binh.getByRole('button', { name: 'Vào phòng' }).click();
  await page.getByRole('button', { name: 'Tùy chọn: Bình' }).click();
  await page.getByRole('menuitem', { name: 'Đặt làm máy phát' }).click();
  await expect(host.getByTestId('host-revoked')).toHaveText(
    'Quản trị viên đã chuyển quyền phát sang thiết bị khác. Trang này đã dừng phát.',
  );
  await expect(host.getByTestId('fake-player')).toHaveCount(0);
});
