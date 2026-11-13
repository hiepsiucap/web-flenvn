import assert from "node:assert/strict";
import { mkdir } from "node:fs/promises";
import { chromium } from "playwright";

const baseURL = process.env.STORYBOOK_URL ?? "http://localhost:6006";
const browser = await chromium.launch();
try {
  await mkdir("/tmp/flenvn-toast-verification", { recursive: true });
  for (const width of [1440, 768, 390, 320]) {
    const page = await browser.newPage({ viewport: { width, height: 900 }, reducedMotion: "reduce" });
    await page.goto(`${baseURL}/iframe.html?id=ui-toaster--playground&viewMode=story`);
    await page.getByRole("button", { name: "Show error", exact: true }).click();
    const alert = page.getByRole("alert");
    await alert.waitFor();
    await page.waitForTimeout(700);
    const box = await alert.boundingBox();
    assert.ok(box, "Error toast must be visible");
    assert.ok(box.x >= 12 && box.x + box.width <= width - 12, `Toast must stay inside ${width}px viewport`);
    if (width < 1024) {
      assert.ok(box.y > 600 && box.y + box.height <= 820, "Mobile toast must sit at the bottom above navigation");
    } else {
      assert.ok(box.y < 100 && box.x > width / 2, "Desktop toast must sit at the top right");
    }
    assert.equal(await page.locator(".Toastify__progress-bar--wrp").evaluate((element) => getComputedStyle(element).opacity), "0", "Decorative progress bar must be hidden");
    await page.screenshot({ path: `/tmp/flenvn-toast-verification/error-${width}.png` });
    await page.getByRole("button", { name: "Dismiss notification" }).click();
    await alert.waitFor({ state: "detached" });
    await page.getByRole("button", { name: "Show long error", exact: true }).click();
    await alert.waitFor();
    await page.waitForTimeout(700);
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false, "Long messages must not cause horizontal overflow");
    await page.screenshot({ path: `/tmp/flenvn-toast-verification/long-error-${width}.png` });
    console.log(`PASS ${width}px: position, margins, progress bar, dismissal, long message`);
    await page.close();
  }
} finally {
  await browser.close();
}
