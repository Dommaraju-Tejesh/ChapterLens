# ChapterLens

A privacy-conscious, browser-based readability and sentence-complexity analyzer for chapters, essays, and articles. Text is processed locally in the page; the app does not send it to an analysis service.

## Features

- Flesch Reading Ease and approximate Flesch–Kincaid U.S. grade estimate.
- Word, sentence, estimated syllable, average sentence length, and flagged sentence counts.
- Up to five deterministic sentence-complexity flags with evidence-based indicators.
- Conservative, rule-based simpler-sentence suggestions with explicit copy and replace actions.
- Live input counts, sample text, clear action, and a 100,000-character ceiling.
- Responsive dark editorial interface with keyboard focus states and reduced-motion support.

## Stack and structure

- React 19 and Vite 8; no runtime analysis dependencies.
- `src/App.jsx`: editor, results, and display components.
- `src/utils/readability.js`: tokenization, sentence segmentation, syllables, metrics, and ranking.
- `src/utils/simplifySentence.js`: local rewrite rules, editing tips, clipboard handling, and guarded source-range replacement.
- `src/utils/readability.test.js`, `src/utils/simplifySentence.test.js`: built-in Node test coverage.
- `src/App.css`, `src/index.css`: app styling and global reset.

## Local development

Requires Node.js compatible with the installed Vite version and npm.

```sh
npm install
npm run dev
```

Open the local URL printed by Vite.

## Commands

```sh
npm test       # Node's built-in test runner
npm run lint   # Oxlint
npm run build  # Production static build in dist/
npm run preview
```

## Formulas and methods

Flesch Reading Ease uses `206.835 − 1.015 × (words / sentences) − 84.6 × (syllables / words)`. The calculated raw value is rounded to two decimal places for display; the visible gauge is separately clamped to 0–100. The classification uses the raw score, with bands 90+, 80–89.9, 70–79.9, 60–69.9, 50–59.9, 30–49.9, and below 30. Grade level uses `0.39 × (words / sentences) + 11.8 × (syllables / words) − 15.59` and is displayed to one decimal place. Both formulas run only after nonzero word and sentence counts have been confirmed.

Words use a Unicode letter/number tokenizer that keeps internal apostrophes and hyphenated forms together. Thus a hyphenated compound counts as one token; decimal components count separately. Sentence boundaries use `.`, `!`, and `?`, with a small abbreviation allowlist. English syllables use vowel-group estimates, silent-e and consonant-le adjustments, and a small exception map. This is an estimate, not a pronunciation dictionary.

Sentence complexity is deterministic. A sentence must first have a structural signal: at least 20 words, a subordinate-clause marker, a relative-clause marker, or a coordinator followed by an explicit subject and verb. Once eligible, the weighted score adds up to 25 length points, 40 subordinate-marker points, 30 relative-marker points, 40 coordinated-clause points, 10 long-word points, 5 possible-passive points, and 5 internal-punctuation points (maximum 155). The UI includes only positive-scoring sentences, and explanations identify detected signals; supporting signals such as long words, passive patterns, and punctuation do not flag a sentence by themselves. Ties keep source order. This does not infer meaning, prove difficulty, or diagnose grammar.

For flagged sentences, ChapterLens can conservatively split an initial `Although` or `Though` clause into its own sentence and introduce the main clause with `However`. It retains both clauses and their content. The rule requires a recognizable clause-like structure; other constructions receive an editing tip instead of an invented rewrite. Suggestions are deterministic heuristics, not guarantees of preserved meaning, and should be reviewed. Copy writes only the suggestion via the browser clipboard API and reports failure. Replace acts only on explicit user request, verifies the analyzed source offsets still contain the exact original sentence, respects the input limit, and immediately re-analyzes the updated chapter. Duplicate sentences remain distinguishable by their individual source ranges. Analysis, rewriting, and replacement happen in the browser; no AI key, backend, paid service, or text-processing request is used.

## Complexity

For `n` input characters and `w` tokens: input handling and tokenization are O(n) time and O(w) storage. Sentence segmentation is O(n) time and O(n) output storage. Syllable estimation scans each token, totaling O(n) time with constant per-token auxiliary space. Formula calculation is O(1) after counts. Sentence ranking scans sentence text and sorts `s` sentence records in O(s log s); overall auxiliary storage is O(n). Input is capped at 100,000 UTF-16 code units to bound work and memory. Analysis runs on the main browser thread when Analyze is pressed, not on every keystroke.

## Limitations and privacy

Flesch formulas were designed for English and can be misleading for short samples, non-English text, names, numbers, and unusual punctuation. Results below 10 words or two sentences carry a short-sample notice. Sentence parsing, syllable counts, complexity ranking, and rule-based simplification are heuristic; a suggested rewrite can still alter nuance and should be reviewed. Some sentences intentionally receive editing tips instead of automatic rewrites when the local rule cannot confidently restructure them. Every visitor's browser performs its own computation; public availability and traffic capacity depend on the static host and network. User text is held in page state and is not submitted to a backend by this application. The stylesheet requests font assets from Google Fonts; that request does not include chapter text. Hosting or browser extensions may have their own behavior outside this codebase.

## Deployment

This is a static frontend. The production output is `dist/`; deploy it to Netlify, Vercel, or another static host using `npm run build` and `dist` as the publish directory. There is no client-side router, server function, or secret configuration. No hosting account or public deployment has been configured from this repository.
