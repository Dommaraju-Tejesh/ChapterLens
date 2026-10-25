import test from "node:test";
import assert from "node:assert/strict";
import { analyzeReadability, segmentSentenceRecords } from "./readability.js";
import { copySuggestion, replaceSentenceAtRange, simplifySentence } from "./simplifySentence.js";

test("splits a leading although clause while preserving both ideas and contrast", () => {
  const original = "Although technology has improved communication, many people struggle to maintain meaningful relationships because they spend less time interacting face to face.";
  const result = simplifySentence(original);
  assert.equal(result.available, true);
  assert.equal(result.suggestion, "Technology has improved communication. However, many people struggle to maintain meaningful relationships because they spend less time interacting face to face.");
  assert.match(result.guidance, /contrast/);
});

test("uses a clearly labeled editing tip when no conservative rewrite applies", () => {
  const result = simplifySentence("People sometimes struggle because several ideas compete for attention.", ["1 subordinate clause marker"]);
  assert.equal(result.available, false);
  assert.equal(result.suggestion, null);
  assert.equal(result.reason, "No reliable automatic suggestion is available for this sentence.");
  assert.match(result.guidance, /dependent clause/);
});

test("preserves names, numbers, negation, and final punctuation", () => {
  const result = simplifySentence("Although Dr. Rivera's lab tested 12 samples, the team did not change its conclusion!");
  assert.equal(result.available, true);
  assert.equal(result.suggestion, "Dr. Rivera's lab tested 12 samples. However, the team did not change its conclusion!");
  for (const detail of ["Dr. Rivera", "12", "not", "conclusion!"]) assert.ok(result.suggestion.includes(detail));
});

test("trims surrounding sentence whitespace but does not invent a rewrite for fragments", () => {
  const result = simplifySentence("  Although the room was quiet, the guests were still talking.  ");
  assert.equal(result.available, true);
  assert.equal(result.suggestion, "The room was quiet. However, the guests were still talking.");
  assert.equal(simplifySentence("Although the room, quiet.").available, false);
  assert.equal(simplifySentence("Although the proposal is long, but it is clear.").available, false);
});

test("source offsets replace the intended duplicate sentence and reject stale text", () => {
  const sentence = "Although the hall was bright, visitors did not see the sign.";
  const source = `${sentence}\n${sentence}`;
  const analyzed = analyzeReadability(source);
  const second = analyzed.hardestSentences.find((item) => item.index === 1);
  assert.ok(second);
  const suggestion = simplifySentence(sentence).suggestion;
  const replaced = replaceSentenceAtRange(source, second, suggestion);
  assert.equal(replaced, `${sentence}\nThe hall was bright. However, visitors did not see the sign.`);
  assert.equal(replaceSentenceAtRange(source.replaceAll("hall", "room"), second, suggestion), null);
  assert.equal(segmentSentenceRecords(source)[1].start, sentence.length + 1);
});

test("copy helper reports clipboard success and failure without changing copied content", async () => {
  let copied = "";
  assert.equal(await copySuggestion("A simpler sentence.", { writeText: async (value) => { copied = value; } }), true);
  assert.equal(copied, "A simpler sentence.");
  assert.equal(await copySuggestion("Suggestion", { writeText: async () => { throw new Error("denied"); } }), false);
  assert.equal(await copySuggestion("Suggestion", null), false);
});
