const { test, expect, chromium } = require("@playwright/test");
const path = require("path");
const os = require("os");
const fs = require("fs");

test.describe("vim-js extension", () => {
  let context;
  let page;

  test.beforeAll(async () => {
    const extensionPath = path.join(__dirname, "..");
    const userDataDir = fs.mkdtempSync(path.join(os.tmpdir(), "playwright-"));

    context = await chromium.launchPersistentContext(userDataDir, {
      headless: false,
      args: [
        `--disable-extensions-except=${extensionPath}`,
        `--load-extension=${extensionPath}`,
      ],
    });

    page = await context.newPage();
  });

  test.afterAll(async () => {
    await context?.close();
  });

  test("Shift+G scrolls to bottom", async () => {
    await page.goto("https://elanmed.dev/");
    await page.waitForLoadState("load");
    await page.waitForTimeout(500);

    const initialScrollY = await page.evaluate(() => window.scrollY);
    await page.keyboard.press("Shift+G");
    await page.waitForTimeout(500);
    const finalScrollY = await page.evaluate(() => window.scrollY);

    expect(finalScrollY).toBeGreaterThan(initialScrollY);

    const isAtBottom = await page.evaluate(() => {
      return (
        window.innerHeight + window.scrollY >=
        document.documentElement.scrollHeight - 10
      );
    });

    expect(isAtBottom).toBe(true);
  });
});
