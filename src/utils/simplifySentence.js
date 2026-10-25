const SAFE_FINITE_VERB = /\b(?:am|is|are|was|were|be|been|being|has|have|had|can|could|will|would|may|might|must|should|did|does|do|improved|changed|helped|created|provided|made|became|grew|learned|worked|reduced|increased|struggle|struggles|maintain|maintains|interact|interacts|spend|spends|rely|relies|depend|depends|remain|remains|contain|contains|include|includes|show|shows|give|gives|make|makes|use|uses|need|needs|want|wants|look|looks|bring|brings|cause|causes|mean|means|play|plays|lead|leads|connect|connects|[a-z]+ed)\b/i;

/**
 * Return a conservative suggestion only for an initial concessive clause.
 * "Although X, Y" becomes "X. However, Y", retaining both clauses and
 * making the contrast explicit. Other constructions are left to the writer.
 */
export function simplifySentence(sentence, reasons = []) {
  const original = String(sentence ?? "");
  const match = original.match(/^\s*(Although|Though)\s+(.+?),\s+(.+?)([.!?]["'”’)]*)?\s*$/i);
  if (!match) {
    return {
      available: false,
      suggestion: null,
      guidance: editingTip(reasons),
      reason: "No reliable automatic suggestion is available for this sentence.",
    };
  }

  const [, , subordinateClause, mainClause, ending = ""] = match;
  const subordinateWords = subordinateClause.trim().split(/\s+/);
  const mainWords = mainClause.trim().split(/\s+/);
  if (
    subordinateWords.length < 3 ||
    mainWords.length < 3 ||
    /^(?:but|yet|although|though)\b/i.test(mainClause.trim()) ||
    !SAFE_FINITE_VERB.test(subordinateClause) ||
    !SAFE_FINITE_VERB.test(mainClause)
  ) {
    return {
      available: false,
      suggestion: null,
      guidance: editingTip(reasons.length ? reasons : ["subordinate clause"]),
      reason: "No reliable automatic suggestion is available for this sentence.",
    };
  }

  const firstSentence = capitalizeFirst(subordinateClause.trim());
  const secondSentence = `However, ${mainClause.trim()}${ending}`;
  const suggestion = `${firstSentence}. ${secondSentence}`;
  if (suggestion === original.trim()) {
    return {
      available: false,
      suggestion: null,
      guidance: editingTip(reasons.length ? reasons : ["subordinate clause"]),
      reason: "No reliable automatic suggestion is available for this sentence.",
    };
  }

  return {
    available: true,
    suggestion,
    guidance: "Split the opening contrast into two sentences and made the relationship explicit with “However.”",
    reason: null,
  };
}

export function editingTip(reasons = []) {
  const signals = reasons.join(" ").toLowerCase();
  if (signals.includes("subordinate") || signals.includes("relative")) {
    return "Try separating the main point from its dependent clause, and make their relationship clear.";
  }
  if (signals.includes("long sentence") || signals.includes("coordinated clause")) {
    return "Consider expressing one main idea per sentence. Split only where the connection stays clear.";
  }
  if (signals.includes("long word")) {
    return "Review the longer words and simplify only terms that are not essential to your meaning.";
  }
  return "Look for a natural pause or clause boundary, then clarify how the ideas relate.";
}

/** Replace only when the analyzed source slice still exactly matches. */
export function replaceSentenceAtRange(text, item, suggestion) {
  if (
    !item ||
    !suggestion ||
    !Number.isInteger(item.start) ||
    !Number.isInteger(item.end) ||
    item.start < 0 ||
    item.end > text.length ||
    item.end <= item.start ||
    text.slice(item.start, item.end) !== item.sentence
  ) {
    return null;
  }
  return `${text.slice(0, item.start)}${suggestion}${text.slice(item.end)}`;
}

export async function copySuggestion(text, clipboard = globalThis.navigator?.clipboard) {
  if (!clipboard || typeof clipboard.writeText !== "function") return false;
  try {
    await clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}

function capitalizeFirst(text) {
  return text.replace(/^\p{L}/u, (letter) => letter.toLocaleUpperCase());
}

