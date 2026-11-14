import { afterEach, describe, expect, it, vi } from "vitest";
import { chooseSaveBook, readBookSaveCounts, recordBookSave } from "./book-save-preference";

describe("chooseSaveBook", () => {
  const books = [{ id: "a" }, { id: "b" }];
  it("selects the most frequently used available book", () => {
    expect(chooseSaveBook(books, { a: 1, b: 4 })).toBe("b");
  });
  it("ignores books that are no longer available", () => {
    expect(chooseSaveBook(books, { removed: 20, b: 2 })).toBe("b");
  });
  it("defaults to the first book without history", () => {
    expect(chooseSaveBook(books, {})).toBe("a");
  });
  it("returns no selection when there are no books", () => {
    expect(chooseSaveBook([], { a: 2 })).toBe("");
  });
});

describe("book save history", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("remembers successful saves across reads", () => {
    let stored: string | null = null;
    vi.stubGlobal("localStorage", {
      getItem: () => stored,
      setItem: (_key: string, value: string) => { stored = value; },
    });
    recordBookSave("a");
    recordBookSave("b");
    recordBookSave("b");
    expect(chooseSaveBook([{ id: "a" }, { id: "b" }], readBookSaveCounts())).toBe("b");
  });

  it("ignores malformed storage", () => {
    vi.stubGlobal("localStorage", { getItem: () => "invalid json" });
    expect(readBookSaveCounts()).toEqual({});
  });

  it("does not interrupt saving when storage is blocked", () => {
    vi.stubGlobal("localStorage", {
      getItem: () => { throw new Error("Storage blocked"); },
      setItem: () => { throw new Error("Storage blocked"); },
    });
    expect(() => recordBookSave("a")).not.toThrow();
  });
});
