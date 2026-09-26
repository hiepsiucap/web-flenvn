import assert from "node:assert/strict";
import test from "node:test";
import { buildBookEditPayload } from "./book-edit.ts";

test("rejects an empty or too-short book title", () => {
  assert.throws(() => buildBookEditPayload("  ", undefined), /at least 3/);
  assert.throws(() => buildBookEditPayload("ab", undefined), /at least 3/);
});

test("updates only the title when the cover is unchanged", () => {
  assert.deepEqual(buildBookEditPayload("  New title  ", undefined), { title: "New title" });
});

test("includes a replacement cover when supplied", () => {
  assert.deepEqual(buildBookEditPayload("New title", "https://example.com/cover.png"), {
    title: "New title",
    coverImage: "https://example.com/cover.png",
  });
});

test("includes a selected parent or top-level move", () => {
  assert.deepEqual(buildBookEditPayload("New title", undefined, "parent-id"), {
    title: "New title",
    parentBookId: "parent-id",
  });
  assert.deepEqual(buildBookEditPayload("New title", undefined, null), {
    title: "New title",
    parentBookId: null,
  });
});
