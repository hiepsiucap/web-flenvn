/* Browser integration checks. AI, API, microphone, and audio playback are mocked at their boundaries. */
import { chromium } from "playwright";
import assert from "node:assert/strict";
const base = process.env.TEST_BASE_URL || "http://localhost:3000";
const cards = [
  {
    id: "a",
    bookId: "book",
    word: "apple",
    translation: "táo",
    definition: "A fruit",
    example: "I eat an apple every day.",
    exampleAudioUrl: "https://audio.example/sentence.mp3",
    status: "mastered",
  },
];
const books = [{ id: "book", title: "Listening book", totalCards: 1 }];
(async () => {
  const browser = await chromium.launch();
  async function setup(width = 390, options = {}) {
    const p = await browser.newPage({
      viewport: { width, height: 900 },
      reducedMotion: "reduce",
    });
    const calls = { generated: 0, polled: 0, answered: 0, sentence: 0 };
    let game = "quick-reply";
    function round(status) {
      return {
        id: "round",
        game,
        difficulty: "easy",
        status,
        questions:
          status === "ready"
            ? Array.from({ length: 5 }, (_, i) => ({
                id: "q" + i,
                prompt:
                  game === "catch-details"
                    ? "What time is the delivery?"
                    : "Choose the best reply.",
                choices:
                  game === "catch-details"
                    ? undefined
                    : ["At three thirty.", "At the park.", "By bus."],
                audioUrls:
                  game === "conversation"
                    ? [
                        `https://audio.example/${i}a.mp3`,
                        `https://audio.example/${i}b.mp3`,
                      ]
                    : [`https://audio.example/${i}.mp3`],
              }))
            : [],
      };
    }
    await p.addInitScript(() => {
      localStorage.setItem("accessToken", "test");
      window.__pauses = 0;
      HTMLMediaElement.prototype.play = function () {
        window.__audio = this;
        this.dispatchEvent(new Event("play"));
        return Promise.resolve();
      };
      HTMLMediaElement.prototype.pause = function () {
        window.__pauses++;
        this.dispatchEvent(new Event("pause"));
      };
      HTMLMediaElement.prototype.load = function () {};
      window.SpeechRecognition = class {
        constructor() {
          window.__speech = this;
        }
        start() {
          this.onstart?.();
        }
        stop() {
          this.onend?.();
        }
        abort() {}
      };
    });
    await p.route("**/api/**", async (r) => {
      const path = new URL(r.request().url()).pathname.replace(
        "/api/v1/",
        "/api/",
      );
      let data = {};
      if (path === "/api/users/profile")
        data = { id: "t", email: "t@example.com", level: 1, exp: 0 };
      if (path === "/api/streak") return r.fulfill({ status: 503, json: {} });
      if (path === "/api/books") data = books;
      if (path === "/api/books/review/due")
        data = {
          books: [
            {
              bookId: "book",
              title: "Listening book",
              totalCards: 1,
              dueForReview: 0,
            },
          ],
          totalDueForReview: 0,
        };
      if (path === "/api/flashcards")
        data = cards
          .filter(
            (c) =>
              c.status ===
              new URL(r.request().url()).searchParams.get("status"),
          )
          .map((c) => ({
            ...c,
            exampleAudioUrl: options.noSavedAudio ? null : c.exampleAudioUrl,
          }));
      if (path === "/api/listening/sets" && r.request().method() === "POST") {
        calls.generated++;
        const body = r.request().postDataJSON();
        assert.deepEqual(body.flashcardIds, ["a"]);
        game = body.game;
        if (options.failGenerate && calls.generated === 1)
          return r.fulfill({ status: 503, json: { message: "Unavailable" } });
        data = round("generating");
      }
      if (path === "/api/listening/sets/round") {
        calls.polled++;
        data = round(options.pending ? "generating" : "ready");
      }
      if (path === "/api/listening/sets/round/answers") {
        calls.answered++;
        if (options.failAnswer && calls.answered === 1)
          return r.fulfill({ status: 503, json: { message: "Unavailable" } });
        const body = r.request().postDataJSON();
        const correct =
          body.answer === (game === "catch-details" ? "3:30 pm" : "0");
        data = {
          questionId: body.questionId,
          correct,
          score: correct ? 100 : 0,
          correctAnswer:
            game === "catch-details" ? "3:30 pm" : "At three thirty.",
          transcript: "A: Your apple delivery arrives at 3:30 pm.",
          explanation: "Giao hàng lúc 3:30 chiều.",
        };
      }
      if (path === "/api/listening/sets/sentence-audio") {
        calls.sentence++;
        if (options.failSentence && calls.sentence === 1)
          return r.fulfill({ status: 503, json: {} });
        data = { url: "https://audio.example/generated-sentence.mp3" };
      }
      return r.fulfill({ status: 200, json: { success: true, data } });
    });
    await p.route("https://audio.example/**", (r) =>
      r.fulfill({ status: 200, contentType: "audio/mpeg", body: "" }),
    );
    await p.goto(base + "/review");
    await p.getByRole("checkbox", { name: /^apple/ }).waitFor();
    await p.getByRole("checkbox", { name: /^apple/ }).click();
    await p.getByRole("button", { name: "Play", exact: true }).click();
    return { p, calls };
  }
  async function openListening(p, name = "Quick reply") {
    await p
      .getByRole("button", { name: "Play Listening", exact: true })
      .click();
    await p.getByRole("button", { name: /^Listening challenges/ }).click();
    await p.getByRole("button", { name: new RegExp("^" + name) }).click();
  }
  async function generate(p) {
    await p
      .getByRole("button", { name: "Generate listening practice" })
      .click();
    await p.getByText("Question 1 of 5", { exact: true }).waitFor();
  }
  async function finishAudio(p, parts = 1) {
    await p
      .getByRole("button", { name: "Play recording", exact: true })
      .click();
    for (let i = 0; i < parts; i++)
      await p.evaluate(() => window.__audio.dispatchEvent(new Event("ended")));
  }
  async function chooseAnswer(p, game) {
    if (game === "catch-details")
      await p.getByLabel("Your answer", { exact: true }).fill("3:30 pm");
    else
      await p
        .getByRole("button", { name: "A At three thirty.", exact: true })
        .click();
  }
  try {
    for (const width of [1280, 390, 320])
      for (const [game, name] of [
        ["quick-reply", "Quick reply"],
        ["catch-details", "Catch the details"],
        ["conversation", "Conversation challenge"],
      ]) {
        const { p, calls } = await setup(width);
        await openListening(p, name);
        await generate(p);
        assert.equal(
          await p.getByText("Transcript", { exact: true }).count(),
          0,
        );
        assert.equal(
          await p
            .getByText("A: Your apple delivery arrives at 3:30 pm.", {
              exact: true,
            })
            .count(),
          0,
        );
        await chooseAnswer(p, game);
        assert(
          await p
            .getByRole("button", { name: "Check answer", exact: true })
            .isDisabled(),
        );
        await p.getByRole("button", { name: "Use slower audio" }).click();
        await finishAudio(p, game === "conversation" ? 2 : 1);
        assert.equal(await p.evaluate(() => window.__audio.playbackRate), 0.75);
        await p
          .getByRole("button", { name: "Check answer", exact: true })
          .click();
        await p.getByText("Nice work!", { exact: true }).waitFor();
        await p.getByText("Transcript", { exact: true }).waitFor();
        if (width === 390 && game === "conversation")
          await p.screenshot({ path: "/tmp/flenvn-listening-390.png" });
        await p.getByRole("button", { name: "Next", exact: true }).click();
        for (let i = 0; i < 4; i++)
          await p.getByRole("button", { name: "Skip", exact: true }).click();
        await p
          .getByRole("heading", { name: "Listening round complete!" })
          .waitFor();
        await p.getByText("1 of 5 correct", { exact: true }).waitFor();
        assert.equal(calls.generated, 1);
        assert.equal(calls.answered, 1);
        assert.equal(
          await p.evaluate(
            () => document.documentElement.scrollWidth > innerWidth,
          ),
          false,
        );
        console.log(
          `PASS ${width}px ${game}: generation, replay speed, hidden answers, server grading, summary`,
        );
        await p.close();
      }
    {
      const { p } = await setup();
      await openListening(p);
      await p.getByRole("button", { name: "Challenge", exact: true }).click();
      await generate(p);
      assert.equal(
        await p.getByRole("button", { name: "Use slower audio" }).count(),
        0,
      );
      await finishAudio(p);
      assert(
        await p.getByRole("button", { name: "Replay recording" }).isDisabled(),
      );
      console.log(
        "PASS challenge allows one complete playback and no speed change",
      );
      await p.close();
    }
    {
      const { p, calls } = await setup(390, {
        failGenerate: true,
        failAnswer: true,
      });
      await openListening(p);
      await p
        .getByRole("button", { name: "Generate listening practice" })
        .click();
      await p.getByRole("main").getByRole("alert").waitFor();
      await generate(p);
      await finishAudio(p);
      await chooseAnswer(p, "quick-reply");
      await p.getByRole("button", { name: "Check answer" }).click();
      await p.getByRole("main").getByRole("alert").waitFor();
      assert.equal(
        await p
          .getByRole("button", { name: "A At three thirty." })
          .getAttribute("aria-pressed"),
        "true",
      );
      await p.getByRole("button", { name: "Check answer" }).click();
      await p.getByText("Nice work!", { exact: true }).waitFor();
      assert.equal(calls.generated, 2);
      console.log(
        "PASS generation and grading failures can retry without losing the answer",
      );
      await p.close();
    }
    {
      const { p } = await setup();
      await openListening(p);
      await generate(p);
      await p.getByRole("button", { name: "Play recording" }).click();
      await p.evaluate(() => window.__audio.dispatchEvent(new Event("error")));
      await p
        .getByRole("alert")
        .filter({ hasText: "Audio couldn’t load" })
        .waitFor();
      await finishAudio(p);
      const pauses = await p.evaluate(() => window.__pauses);
      await p.getByRole("button", { name: "Exit", exact: true }).click();
      assert((await p.evaluate(() => window.__pauses)) > pauses);
      console.log("PASS audio failure replay and playback cleanup on exit");
      await p.close();
    }
    {
      const { p, calls } = await setup(390, { pending: true });
      await openListening(p);
      await p
        .getByRole("button", { name: "Generate listening practice" })
        .click();
      await p
        .getByText("Creating questions and audio.", { exact: false })
        .waitFor();
      await p.getByRole("button", { name: "Exit", exact: true }).click();
      const count = calls.polled;
      await p.waitForTimeout(1700);
      assert.equal(calls.polled, count);
      console.log("PASS exit cancels generation polling");
      await p.close();
    }
    for (const noSavedAudio of [false, true]) {
      const { p, calls } = await setup(390, { noSavedAudio });
      await p
        .getByRole("button", { name: "Play Speaking", exact: true })
        .click();
      await p.getByRole("button", { name: "Listen", exact: true }).click();
      await p.waitForFunction(() => Boolean(window.__audio));
      assert(
        (await p.evaluate(() => window.__audio.src)).includes(
          noSavedAudio ? "generated-sentence" : "sentence.mp3",
        ),
      );
      await p.getByRole("button", { name: "Listen", exact: true }).click();
      assert.equal(calls.sentence, noSavedAudio ? 1 : 0);
      await p
        .getByRole("button", { name: "Start speaking", exact: true })
        .click();
      await p.evaluate(() =>
        window.__speech.onresult({
          results: [
            { isFinal: true, 0: { transcript: "I eat an apple every day." } },
          ],
        }),
      );
      await p.getByText("100%", { exact: true }).waitFor();
      console.log(
        `PASS speaking uses ${noSavedAudio ? "generated and cached Polly" : "saved sentence"} audio and scores the full sentence`,
      );
      await p.close();
    }
  } finally {
    await browser.close();
  }
})().catch((error) => {
  console.error(error);
  process.exit(1);
});
