const WORD_PATTERN =
  /[\p{L}\p{N}]+(?:['’][\p{L}\p{N}]+)*(?:-[\p{L}\p{N}]+(?:['’][\p{L}\p{N}]+)*)*/gu;
const ABBREVIATIONS = /\b(?:Mr|Mrs|Ms|Dr|Prof|St| vs|etc|e\.g|i\.e)\./gi;
export const MAX_INPUT_CHARACTERS = 100000;

export function tokenize(text) {
  return String(text ?? "").match(WORD_PATTERN) ?? [];
}

export function countSyllables(token) {
  let word = String(token)
    .toLowerCase()
    .replace(/[^a-z]/g, "");
  if (!word) return 0;
  const exceptions = {
    people: 2,
    every: 2,
    business: 2,
    science: 2,
    queue: 1,
    fire: 1,
    hour: 1,
    our: 1,
    area: 3,
    poem: 2,
    being: 2,
    different: 3,
    comfortable: 3,
    interesting: 3,
    technology: 4,
    artificial: 5,
    information: 4,
  };
  if (exceptions[word]) return exceptions[word];
  let count = (word.match(/[aeiouy]+/g) ?? []).length;
  if (
    word.endsWith("e") &&
    !word.endsWith("le") &&
    count > 1 &&
    !/(ee|ye)$/.test(word)
  )
    count--;
  if (/[^aeiou]le$/.test(word) && word.length > 2) count++;
  if (/(?:ted|ded)$/.test(word) && count) count++;
  return Math.max(1, count);
}

export function segmentSentenceRecords(text) {
  const protectedText = String(text ?? "").replace(ABBREVIATIONS, (match) =>
    match.replaceAll(".", "\uE000"),
  );
  return [...protectedText.matchAll(/[^.!?]+(?:[.!?]+|$)/gu)]
    .map((match) => {
      const raw = match[0];
      const leadingWhitespace = raw.length - raw.trimStart().length;
      const sentence = raw.trim().replaceAll("\uE000", ".");
      const start = match.index + leadingWhitespace;
      return { sentence, start, end: start + sentence.length };
    })
    .filter(({ sentence }) => tokenize(sentence).length > 0);
}

export function segmentSentences(text) {
  return segmentSentenceRecords(text).map(({ sentence }) => sentence);
}

const SUBORDINATORS =
  /\b(?:although|because|since|unless|whereas|while|if|when|where|after|before|though|until)\b/gi;
const RELATIVE_CLAUSES = /\b(?:which|who|whom|whose|that)\b/gi;
const PASSIVE = /\b(?:am|is|are|was|were|be|been|being)\s+[\w-]+(?:ed|en)\b/gi;

export function scoreSentence(sentence, index = 0) {
  const words = tokenize(sentence);
  const longWords = words.filter(
    (w) => w.replace(/[^\p{L}]/gu, "").length >= 8,
  ).length;
  const subordinateClauses = [...sentence.matchAll(SUBORDINATORS)].length;
  const relativeClauses = [...sentence.matchAll(RELATIVE_CLAUSES)].length;
  // Count only an explicit new subject after a coordinator. This avoids
  // treating shared-subject verb lists ("use, learn, and grow") as clauses.
  const coordinatedClauses = [
    ...sentence.matchAll(
      /\b(?:and|but|or|yet|so)\s+(?:the|a|an|I|you|we|they|he|she|it|[A-Z][a-z]+)\s+(?:is|are|was|were|has|have|had|does|do|did|can|could|will|would|may|might|must|should|[a-z]+s|[a-z]+ed)\b/g,
    ),
  ].length;
  const passive = [...sentence.matchAll(PASSIVE)].length;
  const commas = (sentence.match(/[,;:—]/g) ?? []).length;
  const structurallyLong = words.length >= 20;
  const hasStructuralSignal =
    structurallyLong ||
    subordinateClauses > 0 ||
    relativeClauses > 0 ||
    coordinatedClauses > 0;
  const reasons = [];
  if (structurallyLong) reasons.push(`Long sentence (${words.length} words)`);
  if (subordinateClauses)
    reasons.push(
      `${subordinateClauses} subordinate clause marker${subordinateClauses > 1 ? "s" : ""}`,
    );
  if (relativeClauses)
    reasons.push(
      `${relativeClauses} relative clause marker${relativeClauses > 1 ? "s" : ""}`,
    );
  if (coordinatedClauses)
    reasons.push(
      `${coordinatedClauses} coordinated clause${coordinatedClauses > 1 ? "s" : ""} with an explicit subject`,
    );
  if (hasStructuralSignal && longWords)
    reasons.push(
      `${longWords} long word${longWords > 1 ? "s" : ""} (8+ letters)`,
    );
  if (hasStructuralSignal && passive)
    reasons.push("Possible passive-voice construction");
  if (hasStructuralSignal && commas >= 3)
    reasons.push("Several internal punctuation breaks");
  const score = hasStructuralSignal
    ? Math.round(
        (Math.min(words.length / 30, 1) * 25 +
          Math.min(subordinateClauses, 2) * 20 +
          Math.min(relativeClauses, 2) * 15 +
          Math.min(coordinatedClauses, 2) * 20 +
          Math.min(longWords / 5, 1) * 10 +
          Math.min(passive, 1) * 5 +
          Math.min(commas / 5, 1) * 5) *
          10,
      ) / 10
    : 0;
  return { sentence, score, reasons, index };
}

export function classifyScore(score) {
  if (score >= 90) return "Very easy";
  if (score >= 80) return "Easy";
  if (score >= 70) return "Fairly easy";
  if (score >= 60) return "Standard";
  if (score >= 50) return "Fairly difficult";
  if (score >= 30) return "Difficult";
  return "Very difficult";
}

export function analyzeReadability(input) {
  const text = String(input ?? "");
  if (!text.trim())
    return {
      valid: false,
      kind: "empty",
      message: "Add some text to analyze.",
    };
  if (text.length > MAX_INPUT_CHARACTERS)
    return {
      valid: false,
      kind: "too-large",
      message: `Text exceeds the ${MAX_INPUT_CHARACTERS.toLocaleString()} character limit.`,
    };
  const words = tokenize(text);
  const sentenceRecords = segmentSentenceRecords(text);
  const sentences = sentenceRecords.map(({ sentence }) => sentence);
  if (!words.length || !sentences.length)
    return {
      valid: false,
      kind: "unusual",
      message: "No words in complete sentences were found.",
    };
  const syllableCount = words.reduce(
    (sum, word) => sum + countSyllables(word),
    0,
  );
  const sentenceCount = sentences.length;
  const rawScore =
    206.835 -
    1.015 * (words.length / sentenceCount) -
    84.6 * (syllableCount / words.length);
  const displayScore = Math.max(0, Math.min(100, rawScore));
  const fkgl =
    0.39 * (words.length / sentenceCount) +
    11.8 * (syllableCount / words.length) -
    15.59;
  const ranked = sentences
    .map((s, i) => ({
      ...scoreSentence(s, i),
      start: sentenceRecords[i].start,
      end: sentenceRecords[i].end,
    }))
    .filter((s) => s.score > 0)
    .sort((a, b) => b.score - a.score || a.index - b.index)
    .slice(0, 5);
  return {
    valid: true,
    reliable: words.length >= 10 && sentenceCount >= 2,
    wordCount: words.length,
    sentenceCount,
    syllableCount,
    averageWordsPerSentence: Number((words.length / sentenceCount).toFixed(1)),
    rawScore: Number(rawScore.toFixed(2)),
    score: Number(displayScore.toFixed(1)),
    scoreWasClamped: rawScore < 0 || rawScore > 100,
    difficulty: classifyScore(rawScore),
    gradeLevel: Number(fkgl.toFixed(1)),
    complexSentenceCount: ranked.length,
    hardestSentences: ranked,
  };
}
