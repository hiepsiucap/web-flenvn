function words(value: string) {
  return value.toLowerCase().replace(/[’‘]/g, "'").replace(/[^\p{L}\p{N}']/gu, " ").trim().split(/\s+/).filter(Boolean);
}

/** Word error rate, not an assessment of pronunciation or accent. */
export function scoreSpokenWords(target: string, transcript: string): number {
  const expected = words(target);
  const heard = words(transcript);
  if (!expected.length || !heard.length) return 0;
  let previous = Array.from({ length: heard.length + 1 }, (_, index) => index);
  for (let i = 1; i <= expected.length; i++) {
    const row = [i];
    for (let j = 1; j <= heard.length; j++) {
      row[j] = Math.min(row[j - 1] + 1, previous[j] + 1, previous[j - 1] + (expected[i - 1] === heard[j - 1] ? 0 : 1));
    }
    previous = row;
  }
  return Math.max(0, Math.round((1 - previous[heard.length] / expected.length) * 100));
}
