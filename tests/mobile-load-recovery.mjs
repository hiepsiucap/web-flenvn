import assert from "node:assert/strict";
import { chromium } from "playwright";

// Run against a local `npm run start -- --port 3111` server after `npm run build`.
const baseUrl = process.env.TEST_BASE_URL ?? "http://localhost:3111";
const browser = await chromium.launch({ channel: "chrome", headless: true });

async function openWithFailedBooks(path) {
  const page = await browser.newPage({ viewport: { width: 320, height: 700 } });
  const pageErrors = [];
  page.on("pageerror", (error) => pageErrors.push(error.message));
  page.assertNoErrors = () => assert.deepEqual(pageErrors, []);
  let booksShouldFail = true;
  page.allowBooks = () => { booksShouldFail = false; };
  await page.addInitScript(() => localStorage.setItem("accessToken", "test-token"));
  await page.route("**/api/v1/**", async (route) => {
    const url = new URL(route.request().url());
    if (url.pathname === "/api/v1/books" || url.pathname.startsWith("/api/v1/books/")) {
      await route.fulfill(booksShouldFail
        ? { status: 503, contentType: "application/json", body: JSON.stringify({ message: "Unavailable" }) }
        : { status: 200, contentType: "application/json", body: "[]" });
      return;
    }
    if (url.pathname === "/api/v1/users/profile" || url.pathname === "/api/v1/auth/profile") {
      await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ username: "Learner", email: "learner@example.test" }) });
      return;
    }
    await route.fulfill({ status: 200, contentType: "application/json", body: "{}" });
  });
  await page.goto(`${baseUrl}${path}`);
  return page;
}

try {
  const books = await openWithFailedBooks("/books");
  await books.getByText("Books unavailable").waitFor({ timeout: 10000 });
  assert.equal(await books.getByText("Books unavailable").locator("..").getByRole("button", { name: "Try again" }).count(), 1);
  assert.equal(await books.getByText("No books yet").count(), 0);
  books.allowBooks();
  await books.getByText("Books unavailable").locator("..").getByRole("button", { name: "Try again" }).click();
  await books.getByText("No books yet").waitFor({ timeout: 10000 });
  books.assertNoErrors();
  await books.close();

  const detail = await openWithFailedBooks("/books/test-book");
  await detail.getByText("Book unavailable").waitFor({ timeout: 10000 });
  assert.equal(await detail.getByText("Book unavailable").locator("..").getByRole("button", { name: "Try again" }).count(), 1);
  detail.assertNoErrors();
  await detail.close();

  const flashcards = await openWithFailedBooks("/flashcards");
  await flashcards.getByText("Flashcards unavailable").waitFor({ timeout: 10000 });
  assert.equal(await flashcards.getByText("Flashcards unavailable").locator("..").getByRole("button", { name: "Try again" }).count(), 1);
  flashcards.assertNoErrors();
  await flashcards.close();

  const dashboard = await openWithFailedBooks("/dashboard");
  await dashboard.getByText("Dashboard data unavailable").last().waitFor({ timeout: 10000 });
  assert.equal(await dashboard.getByText("Dashboard data unavailable").last().locator("..").getByRole("button", { name: "Try again" }).count(), 1);
  dashboard.assertNoErrors();
  await dashboard.close();
} finally {
  await browser.close();
}
