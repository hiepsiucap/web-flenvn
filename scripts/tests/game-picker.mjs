import { chromium } from "playwright";
import assert from "node:assert/strict";
const books = [{ id: "book", title: "Game book", totalCards: 4 }];
const cards = [
  {
    id: "a",
    bookId: "book",
    word: "apple",
    translation: "táo",
    definition: "A fruit",
    example: "I eat an apple every day.",
    imageUrl: "/images/states/empty-books.webp",
    status: "mastered",
  },
  ...[
    ["banana", "chuối"],
    ["water", "nước"],
    ["bread", "bánh mì"],
  ].map(([word, translation]) => ({
    id: word,
    bookId: "book",
    word,
    translation,
    definition: "A definition",
    status: "new",
  })),
];
(async () => {
  const browser = await chromium.launch();
  async function setup(width) {
    const p = await browser.newPage({
      viewport: { width, height: 900 },
      reducedMotion: "reduce",
    });
    await p.addInitScript(() => localStorage.setItem("accessToken", "test"));
    await p.route("**/api/**", (r) => {
      const u = new URL(r.request().url());
      const path = u.pathname.replace("/api/v1/", "/api/");
      let data = {};
      if (path === "/api/users/profile")
        data = { id: "t", email: "t@example.com", level: 1, exp: 0 };
      if (path === "/api/books") data = books;
      if (path === "/api/books/review/due")
        data = {
          books: [
            {
              bookId: "book",
              title: "Game book",
              totalCards: 4,
              dueForReview: 0,
            },
          ],
          totalDueForReview: 0,
        };
      if (path === "/api/flashcards")
        data = cards.filter((c) => c.status === u.searchParams.get("status"));
      return r.fulfill({
        status: path === "/api/streak" ? 503 : 200,
        json: data,
      });
    });
    await p.goto("http://localhost:3000/review");
    await p.getByRole("checkbox", { name: /^apple/ }).waitFor();
    return p;
  }
  try {
    for (const width of [1280, 390, 320])
      for (const target of [
        "Missing word",
        "Sentence puzzle",
        "Speaking",
        "Image or audio",
        "Listening challenges",
      ]) {
        const p = await setup(width);
        await p.getByRole("checkbox", { name: /^apple/ }).click();
        await p.getByRole("button", { name: "Play", exact: true }).click();
        const dialog = p.getByRole("dialog");
        await dialog.waitFor();
        const tiles = dialog
          .locator('[aria-label^="Game types"]')
          .getByRole("button");
        assert.equal(await tiles.count(), 4);
        assert.equal(
          await dialog.getByRole("button", { name: /Missing word/ }).count(),
          0,
        );
        for (const [name, file] of [
          ["Speaking", "speaking"],
          ["Listening", "listening"],
          ["Writing", "writing"],
        ])
          assert(
            (
              await dialog
                .getByRole("button", { name: "Play " + name, exact: true })
                .locator("img")
                .getAttribute("src")
            ).includes(file + ".webp"),
          );
        await p.waitForFunction(
          () =>
            !document.querySelector('[aria-label="Play Speaking"]').disabled,
        );
        const boxes = await Promise.all(
          [0, 1, 2, 3].map((i) => tiles.nth(i).boundingBox()),
        );
        assert(
          Math.abs(boxes[0].y - boxes[1].y) < 2 &&
            Math.abs(boxes[2].y - boxes[3].y) < 2 &&
            boxes[2].y > boxes[0].y,
        );
        if (width === 390 && target === "Speaking")
          await p.screenshot({ path: "/tmp/flenvn-game-categories-390.png" });
        if (target === "Missing word" || target === "Sentence puzzle") {
          await dialog
            .getByRole("button", { name: "Play Writing", exact: true })
            .click();
          await dialog
            .getByRole("button", { name: new RegExp("^" + target) })
            .click();
        } else if (target === "Speaking")
          await dialog
            .getByRole("button", { name: "Play Speaking", exact: true })
            .click();
        else {
          await dialog
            .getByRole("button", { name: "Play Listening", exact: true })
            .click();
          await dialog
            .getByRole("button", { name: new RegExp("^" + target) })
            .click();
        }
        if (
          ["Missing word", "Sentence puzzle", "Image or audio"].includes(target)
        ) {
          await p.getByText("Review first", { exact: true }).waitFor();
          await p
            .getByRole("button", { name: "Start game", exact: true })
            .filter({ visible: true })
            .click();
          const title =
            target === "Missing word"
              ? "Choose the missing word"
              : target === "Sentence puzzle"
                ? "Build the sentence"
                : "Name it";
          await p
            .getByText(title, { exact: true })
            .filter({ visible: true })
            .waitFor();
        } else
          await p
            .getByRole("heading", {
              name: target === "Speaking" ? "Say it" : "Listening",
              exact: true,
            })
            .waitFor();
        assert.equal(
          await p.evaluate(
            () => document.documentElement.scrollWidth > innerWidth,
          ),
          false,
        );
        console.log(
          `PASS ${width}px: correct image mapping, 2x2 layout, ${target} route`,
        );
        await p.close();
      }
    {
      const p = await setup(390);
      await p.getByRole("checkbox", { name: /^banana/ }).click();
      await p.getByRole("button", { name: "Play", exact: true }).click();
      const dialog = p.getByRole("dialog");
      await p.waitForFunction(
        () => !document.querySelector('[aria-label="Play Writing"]').disabled,
      );
      assert(
        await dialog
          .getByRole("button", { name: "Play Speaking", exact: true })
          .isDisabled(),
      );
      await dialog
        .getByRole("button", { name: "Play Writing", exact: true })
        .click();
      assert(
        await dialog
          .getByRole("button", { name: /^Missing word/ })
          .isDisabled(),
      );
      await p.keyboard.press("Escape");
      await dialog.waitFor({ state: "hidden" });
      await p.getByRole("button", { name: "Play", exact: true }).click();
      await dialog
        .getByRole("button", { name: "Play Writing", exact: true })
        .waitFor();
      console.log(
        "PASS unavailable games disabled; closing sub-menu resets picker",
      );
      await p.close();
    }
  } finally {
    await browser.close();
  }
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
