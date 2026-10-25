import test from "node:test";
import assert from "node:assert/strict";
import {
  analyzeReadability,
  classifyScore,
  countSyllables,
  MAX_INPUT_CHARACTERS,
  segmentSentences,
  tokenize,
} from "./readability.js";

test("empty, whitespace and punctuation are safely rejected", () => {
  assert.equal(analyzeReadability("").valid, false);
  assert.equal(analyzeReadability("   ").kind, "empty");
  const punctuation = analyzeReadability("!?...");
  assert.equal(punctuation.valid, false);
  assert.equal(punctuation.kind, "unusual");
});
test("tokenization handles contractions, hyphens, decimals, abbreviation, paragraphs and spaces", () => {
  assert.equal(
    tokenize("Well-known writers don't rush.\n\nIt was 3.14, Dr. Lee.").length,
    10,
  );
  assert.equal(segmentSentences("A. Dr. Lee writes.").length, 2);
});
test("formula metrics are finite and short text is marked unreliable", () => {
  const result = analyzeReadability(
    "The cat sat on the mat. The dog ran to the park. The sun was warm today.",
  );
  assert.equal(result.valid, true);
  assert.equal(result.wordCount, 17);
  assert.equal(result.sentenceCount, 3);
  assert.ok(Number.isFinite(result.rawScore));
  assert.ok(result.score >= 0 && result.score <= 100);
  const expectedFlesch =
    206.835 -
    1.015 * (result.wordCount / result.sentenceCount) -
    84.6 * (result.syllableCount / result.wordCount);
  const expectedGrade =
    0.39 * (result.wordCount / result.sentenceCount) +
    11.8 * (result.syllableCount / result.wordCount) -
    15.59;
  assert.equal(result.rawScore, Number(expectedFlesch.toFixed(2)));
  assert.equal(result.gradeLevel, Number(expectedGrade.toFixed(1)));
  assert.equal(result.difficulty, classifyScore(expectedFlesch));
  assert.equal(analyzeReadability("The cat sat.").reliable, false);
});
test("complexity explanations and ordering are deterministic", () => {
  const input =
    "The cat sat on the mat. Although the unusually complicated organization was reorganized, the committee, which had many responsibilities, delayed its consequential decision because evidence was incomplete.";
  const first = analyzeReadability(input);
  assert.ok(first.hardestSentences[0].reasons.length > 0);
  assert.deepEqual(
    analyzeReadability(input).hardestSentences,
    first.hardestSentences,
  );
});
test("simple shared-subject verb lists and ordinary and-coordination are not flagged", () => {
  const verbList = analyzeReadability(
    "People use this light to work, learn, and grow.",
  );
  const sharedSubject = analyzeReadability(
    "The sun rises every morning and brings light to the world.",
  );
  assert.equal(verbList.hardestSentences.length, 0);
  assert.equal(sharedSubject.hardestSentences.length, 0);
});
test("subordinate and relative clauses rank above simple examples with matching explanations", () => {
  const simple = [
    "People use this light to work, learn, and grow.",
    "The sun rises every morning and brings light to the world.",
  ].map(
    (sentence) => analyzeReadability(sentence).hardestSentences[0]?.score ?? 0,
  );
  const complexText =
    "Although technology has improved communication, people sometimes struggle to understand long and complicated sentences that contain many ideas at once.";
  const complex = analyzeReadability(complexText).hardestSentences[0];
  assert.ok(complex.score > Math.max(...simple));
  assert.ok(
    complex.reasons.some((reason) => reason.includes("subordinate clause")),
  );
  assert.ok(
    complex.reasons.some((reason) => reason.includes("relative clause")),
  );
  assert.ok(complex.score > 0);
});
test("supported size limit is enforced; large valid input is analyzed", () => {
  assert.equal(
    analyzeReadability("a".repeat(MAX_INPUT_CHARACTERS + 1)).kind,
    "too-large",
  );
  const result = analyzeReadability("a ".repeat(MAX_INPUT_CHARACTERS / 2));
  assert.equal(result.valid, true);
  for (const metric of [
    result.rawScore,
    result.score,
    result.gradeLevel,
    result.averageWordsPerSentence,
    result.syllableCount,
  ]) {
    assert.ok(Number.isFinite(metric));
  }
  assert.equal(result.sentenceCount, 1);
});
test("classification boundaries and syllable floor are stable", () => {
  assert.deepEqual([90, 80, 70, 60, 50, 30, 29.9].map(classifyScore), [
    "Very easy",
    "Easy",
    "Fairly easy",
    "Standard",
    "Fairly difficult",
    "Difficult",
    "Very difficult",
  ]);
  assert.ok(countSyllables("rhythm") >= 1);
});
