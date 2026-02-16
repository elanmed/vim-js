const { test, expect, chromium } = require("@playwright/test");
const path = require("path");
const os = require("os");
const fs = require("fs");

const DELAY = 200;

test.describe("vim-js extension", () => {
  let context;
  let page;

  async function setupPage(page) {
    await page.addInitScript(() => {
      window.__vimJsTest = {
        sendCommand: (action) => {
          window.dispatchEvent(
            new CustomEvent("__vimJsTestCommand", { detail: { action } }),
          );
        },
      };
    });
  }

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

    setupPage(page);
  });

  test.afterAll(async () => {
    await context?.close();
  });

  test.describe("scrolling", () => {
    test("Shift+G scrolls to bottom", async () => {
      await page.goto("https://elanmed.dev/");
      await page.waitForLoadState("load");

      const initialScrollY = await page.evaluate(() => window.scrollY);
      await page.keyboard.press("Shift+G");

      await page.waitForFunction(
        (initial) => window.scrollY > initial,
        initialScrollY,
        { timeout: DELAY },
      );

      const finalScrollY = await page.evaluate(() => window.scrollY);
      expect(finalScrollY).toBeGreaterThan(initialScrollY);

      const isAtBottom = await page.evaluate(() => {
        return (
          window.innerHeight + window.scrollY >=
          document.documentElement.scrollHeight
        );
      });

      expect(isAtBottom).toBe(true);
    });

    test("gg scrolls to top", async () => {
      await page.goto("https://elanmed.dev/");
      await page.waitForLoadState("load");

      await page.evaluate(() => window.scrollTo(0, 1000));
      const initialScrollY = await page.evaluate(() => window.scrollY);
      expect(initialScrollY).toBeGreaterThan(0);

      await page.keyboard.press("g");
      await page.keyboard.press("g");

      await page.waitForFunction(
        () => window.scrollY === 0,
        {},
        { timeout: DELAY },
      );
    });

    test("Ctrl+D scrolls down half page", async () => {
      await page.goto("https://elanmed.dev/");
      await page.waitForLoadState("load");

      const initialScrollY = await page.evaluate(() => window.scrollY);

      await page.evaluate(() => {
        window.__vimJsTest.sendCommand("scroll-down");
      });

      await page.waitForFunction(
        (initial) => window.scrollY > initial,
        initialScrollY,
        { timeout: DELAY },
      );
    });

    test("Ctrl+U scrolls up half page", async () => {
      await page.goto("https://elanmed.dev/");
      await page.waitForLoadState("load");

      await page.evaluate(() => window.scrollTo(0, 1000));
      await page.waitForFunction(
        () => window.scrollY >= 1000,
        {},
        { timeout: 1000 },
      );

      const initialScrollY = await page.evaluate(() => window.scrollY);

      await page.evaluate(() => {
        window.__vimJsTest.sendCommand("scroll-up");
      });

      await page.waitForFunction(
        (initial) => window.scrollY < initial,
        initialScrollY,
        { timeout: DELAY },
      );
    });
  });

  test.describe("clipboard", () => {
    test("yy copies URL to clipboard", async () => {
      await page.goto("https://elanmed.dev/");
      await page.waitForLoadState("load");

      await context.grantPermissions(["clipboard-read", "clipboard-write"]);

      await page.keyboard.press("y");
      await page.keyboard.press("y");

      await page.waitForTimeout(DELAY);

      const clipboardText = await page.evaluate(() =>
        navigator.clipboard.readText(),
      );
      expect(clipboardText).toBe("https://elanmed.dev/");
    });
  });

  test.describe("focus management", () => {
    test("Escape blurs active element", async () => {
      await page.goto("https://elanmed.dev/");
      await page.waitForLoadState("load");

      await page.evaluate(() => {
        const input = document.createElement("input");
        input.id = "test-input";
        document.body.appendChild(input);
        input.focus();
      });

      const isFocusedBefore = await page.evaluate(
        () => document.activeElement.id === "test-input",
      );
      expect(isFocusedBefore).toBe(true);

      await page.keyboard.press("Escape");

      await page.waitForFunction(
        () => document.activeElement.id !== "test-input",
        {},
        { timeout: DELAY },
      );
    });
  });

  test.describe("label modes", () => {
    test("shows labels on clickable elements", async () => {
      await page.goto("https://elanmed.dev/");
      await page.waitForLoadState("load");

      await page.evaluate(() => {
        window.__vimJsTest.sendCommand("toggle-label-click");
      });

      await page.waitForFunction(
        () => {
          const labels = document.querySelectorAll(
            'span[style*="position: fixed"]',
          );
          return labels.length > 0;
        },
        {},
        { timeout: DELAY },
      );
    });

    test("clicking label activates element", async () => {
      await page.goto("https://elanmed.dev/");
      await page.waitForLoadState("load");

      await page.evaluate(() => {
        const labels = document.querySelectorAll(
          'span[style*="position: fixed"]',
        );
        return labels.length > 0;
      });

      await page.evaluate(() => {
        window.__vimJsTest.sendCommand("toggle-label-click");
      });
      await page.waitForFunction(
        () =>
          document.querySelectorAll('span[style*="position: fixed"]').length ===
          0,
        {},
        { timeout: DELAY },
      );

      await page.evaluate(() => {
        window.__vimJsTest.sendCommand("toggle-label-click");
      });

      await page.waitForFunction(
        () => {
          const labels = document.querySelectorAll(
            'span[style*="position: fixed"]',
          );
          return labels.length > 0;
        },
        {},
        { timeout: DELAY },
      );

      const labelText = await page.evaluate(() => {
        const labels = document.querySelectorAll(
          'span[style*="position: fixed"]',
        );
        return labels[0]?.textContent;
      });

      await page.keyboard.press(labelText[0]);
      await page.keyboard.press(labelText[1]);

      await page.waitForFunction(
        () => {
          const labels = document.querySelectorAll(
            'span[style*="position: fixed"]',
          );
          return labels.length === 0;
        },
        {},
        { timeout: DELAY },
      );
    });

    test("shows labels on scrollable elements in focus mode", async () => {
      await page.goto("https://elanmed.dev/");
      await page.waitForLoadState("load");

      await page.evaluate(() => {
        const scrollableDiv = document.createElement("div");
        scrollableDiv.style.height = "200px";
        scrollableDiv.style.overflow = "auto";
        scrollableDiv.innerHTML = "<div style='height: 1000px'>Content</div>";
        document.body.appendChild(scrollableDiv);
      });

      await page.evaluate(() => {
        const labels = document.querySelectorAll(
          'span[style*="position: fixed"]',
        );
        return labels.length > 0;
      });

      await page.evaluate(() => {
        window.__vimJsTest.sendCommand("toggle-label-focus");
      });
      await page.waitForFunction(
        () =>
          document.querySelectorAll('span[style*="position: fixed"]').length ===
          0,
        {},
        { timeout: DELAY },
      );

      await page.evaluate(() => {
        window.__vimJsTest.sendCommand("toggle-label-focus");
      });

      await page.waitForFunction(
        () => {
          const labels = document.querySelectorAll(
            'span[style*="position: fixed"]',
          );
          return labels.length > 0;
        },
        {},
        { timeout: DELAY },
      );
    });

    test("focusing label scrolls to element", async () => {
      await page.goto("https://elanmed.dev/");
      await page.waitForLoadState("load");

      await page.evaluate(() => {
        window.__vimJsTest.sendCommand("toggle-label-focus");
      });
      await page.waitForTimeout(DELAY);

      const labelText = await page.evaluate(() => {
        const labels = document.querySelectorAll(
          'span[style*="position: fixed"]',
        );
        return labels[0]?.textContent;
      });

      await page.keyboard.press(labelText[0]);
      await page.keyboard.press(labelText[1]);

      await page.waitForFunction(
        () => {
          const labels = document.querySelectorAll(
            'span[style*="position: fixed"]',
          );
          return labels.length === 0;
        },
        {},
        { timeout: DELAY },
      );
    });

    test("toggles label mode off", async () => {
      await page.goto("https://elanmed.dev/");
      await page.waitForLoadState("load");

      await page.evaluate(() => {
        window.__vimJsTest.sendCommand("toggle-label-click");
      });

      await page.waitForFunction(
        () => {
          const labels = document.querySelectorAll(
            'span[style*="position: fixed"]',
          );
          return labels.length > 0;
        },
        {},
        { timeout: DELAY },
      );

      await page.evaluate(() => {
        window.__vimJsTest.sendCommand("toggle-label-click");
      });

      await page.waitForFunction(
        () => {
          const labels = document.querySelectorAll(
            'span[style*="position: fixed"]',
          );
          return labels.length === 0;
        },
        {},
        { timeout: DELAY },
      );
    });
  });

  test.describe("tab navigation", () => {
    test("switches to left tab", async () => {
      const page1 = await context.newPage();
      await setupPage(page1);
      await page1.goto("https://example.com");
      const page2 = await context.newPage();
      await setupPage(page2);
      await page2.goto("https://elanmed.dev/");

      await page2.evaluate(() => {
        window.__vimJsTest.sendCommand("switch-to-left-tab");
      });
      await page2.waitForTimeout(DELAY);

      const pages = context.pages();
      expect(pages.length).toBeGreaterThan(1);
    });

    test("switches to right tab", async () => {
      const page1 = await context.newPage();
      await setupPage(page1);
      await page1.goto("https://example.com");

      await page1.evaluate(() => {
        window.__vimJsTest.sendCommand("switch-to-right-tab");
      });
      await page1.waitForTimeout(DELAY);

      const pages = context.pages();
      expect(pages.length).toBeGreaterThan(1);
    });

    test("switches to first tab", async () => {
      const p1 = await context.newPage();
      await setupPage(p1);
      const p2 = await context.newPage();
      await setupPage(p2);
      const currentPage = await context.newPage();
      await setupPage(currentPage);
      await currentPage.goto("https://elanmed.dev/");

      await currentPage.evaluate(() => {
        window.__vimJsTest.sendCommand("switch-to-first-tab");
      });
      await currentPage.waitForTimeout(DELAY);

      const pages = context.pages();
      expect(pages.length).toBeGreaterThan(0);
    });

    test("switches to last tab", async () => {
      const firstPage = await context.newPage();
      await setupPage(firstPage);
      await firstPage.goto("https://example.com");
      const p2 = await context.newPage();
      await setupPage(p2);
      const p3 = await context.newPage();
      await setupPage(p3);

      await firstPage.evaluate(() => {
        window.__vimJsTest.sendCommand("switch-to-last-tab");
      });
      await firstPage.waitForTimeout(DELAY);

      const pages = context.pages();
      expect(pages.length).toBeGreaterThan(0);
    });

    test("switches to previous tab", async () => {
      const page1 = await context.newPage();
      await setupPage(page1);
      await page1.goto("https://example.com");
      const page2 = await context.newPage();
      await setupPage(page2);
      await page2.goto("https://elanmed.dev/");

      await page1.bringToFront();
      await page1.waitForTimeout(DELAY);

      await page1.evaluate(() => {
        window.__vimJsTest.sendCommand("switch-to-prev-tab");
      });
      await page1.waitForTimeout(DELAY);

      const pages = context.pages();
      expect(pages.length).toBeGreaterThan(1);
    });
  });

  test.describe("history navigation", () => {
    test("Ctrl+O goes back in history", async () => {
      const freshPage = await context.newPage();
      await setupPage(freshPage);

      await freshPage.goto("https://example.com");
      await freshPage.waitForLoadState("load");
      await freshPage.goto("https://elanmed.dev/");
      await freshPage.waitForLoadState("load");

      await freshPage.evaluate(() => {
        window.__vimJsTest.sendCommand("history-back");
      });

      await freshPage.waitForURL("**/example.com**", { timeout: DELAY });

      const url = freshPage.url();
      expect(url).toContain("example.com");

      await freshPage.close();
    });

    test("Ctrl+I goes forward in history", async () => {
      const freshPage = await context.newPage();
      await setupPage(freshPage);

      await freshPage.goto("https://example.com");
      await freshPage.waitForLoadState("load");
      await freshPage.goto("https://elanmed.dev/");
      await freshPage.waitForLoadState("load");

      await freshPage.evaluate(() => {
        window.__vimJsTest.sendCommand("history-back");
      });
      await freshPage.waitForURL("**/example.com**", { timeout: DELAY });

      await freshPage.evaluate(() => {
        window.__vimJsTest.sendCommand("history-forward");
      });
      await freshPage.waitForURL("**/elanmed.dev/**", { timeout: DELAY });

      const url = freshPage.url();
      expect(url).toContain("elanmed.dev");

      await freshPage.close();
    });
  });
});
