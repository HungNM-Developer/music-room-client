import { type Browser, type BrowserContext, type Page, expect } from '@playwright/test';

/** Extra contexts opened during a test; closed after it so Chrome does not pile up live rooms. */
const extraContexts: BrowserContext[] = [];

export async function newCtx(
  browser: Browser,
  options?: Parameters<Browser['newContext']>[0],
): Promise<BrowserContext> {
  const ctx = await browser.newContext(options);
  extraContexts.push(ctx);
  return ctx;
}

/** Use as `test.afterEach(closeExtraContexts)` in every spec file. */
export async function closeExtraContexts(): Promise<void> {
  await Promise.all(extraContexts.splice(0).map((c) => c.close().catch(() => undefined)));
}

let seq = 0;
export const uniqueName = (base: string) => `${base} ${Date.now() % 100000}-${++seq}`;

/** Creates a room through the home page and returns its code. */
export async function createRoomUI(page: Page, name = 'An', pin = '1234'): Promise<string> {
  await page.goto('/');
  await page.getByLabel('Tên của bạn').fill(name);
  await page.getByLabel('Tên phòng').fill(uniqueName('Phòng thử'));
  await page.getByLabel('Mã PIN quản trị').fill(pin);
  await page.getByRole('button', { name: 'Tạo phòng', exact: true }).last().click();
  await page.waitForURL(/\/r\/[A-Z0-9]{6}$/);
  const code = page.url().split('/').pop()!;
  await expect(page.getByTestId('room-code')).toHaveText(code);
  return code;
}

/** Joins as a new member in a fresh browser context (separate localStorage). */
export async function joinAs(browser: Browser, code: string, name: string): Promise<Page> {
  const ctx = await newCtx(browser);
  const page = await ctx.newPage();
  await page.goto(`/r/${code}`);
  await expect(page.getByRole('dialog')).toContainText('Vào phòng');
  await page.getByLabel('Tên của bạn').fill(name);
  await page.getByRole('button', { name: 'Vào phòng' }).click();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  return page;
}

/** Opens the speaker page in a desktop context, enters the PIN and presses start. */
export async function openHost(browser: Browser, code: string, pin = '1234'): Promise<Page> {
  const ctx = await newCtx(browser, { viewport: { width: 1280, height: 800 } });
  const page = await ctx.newPage();
  await page.goto(`/r/${code}/host`);
  await page.getByLabel('Mã PIN quản trị').fill(pin);
  await page.getByRole('button', { name: 'Mở máy phát' }).click();
  // After the PIN click the browser already has user activation, so the engine may
  // start on its own; press "Bắt đầu phát" only if it is still shown.
  const start = page.getByRole('button', { name: /Bắt đầu phát/ });
  await page.getByTestId('fake-player').waitFor();
  if (await start.isVisible()) await start.click();
  await expect(page.getByTestId('host-code')).toHaveText(`Mã phòng: ${code}`);
  return page;
}

export async function addLink(page: Page, url: string): Promise<void> {
  await page.getByRole('tab', { name: 'Thêm bài' }).click();
  await page.getByLabel('Tìm bài hát hoặc dán link YouTube').fill(url);
  await page.getByRole('button', { name: 'Thêm vào hàng chờ' }).click();
  await expect(page.getByTestId('toast').last()).toContainText('vào hàng chờ');
  await page.getByRole('tab', { name: 'Phòng' }).click();
}

export const yt = (n: number) => `https://youtu.be/Vid${String(n).padStart(8, '0')}`;
