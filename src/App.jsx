import { useMemo, useState } from "react";
import { analyzeReadability, MAX_INPUT_CHARACTERS, tokenize } from "./utils/readability";
import { copySuggestion, editingTip, replaceSentenceAtRange, simplifySentence } from "./utils/simplifySentence";
import "./App.css";

const SAMPLE = `The development of artificial intelligence has transformed the way people interact with technology. Although modern computational systems can process enormous quantities of information, understanding their limitations remains essential. Researchers continuously investigate new methods to improve reliability, transparency, and accessibility. These efforts matter because people rely on these tools in classrooms, workplaces, and everyday life.`;

function App() {
  const [chapter, setChapter] = useState("");
  const [analysis, setAnalysis] = useState(null);
  const [feedback, setFeedback] = useState("");
  const wordCount = useMemo(() => tokenize(chapter).length, [chapter]);
  const analyze = () => { setAnalysis(analyzeReadability(chapter)); setFeedback(""); };
  const update = (value) => { setChapter(value); setAnalysis(null); setFeedback(""); };
  const replaceSentence = (item, suggestion) => {
    const updated = replaceSentenceAtRange(chapter, item, suggestion);
    if (updated === null) {
      setAnalysis(null);
      setFeedback("The text changed. Analyze again before replacing this sentence.");
      return;
    }
    if (updated.length > MAX_INPUT_CHARACTERS) {
      setFeedback("The suggestion would exceed the analysis character limit. Text was not changed.");
      return;
    }
    setChapter(updated);
    setAnalysis(analyzeReadability(updated));
    setFeedback("Sentence replaced. Analysis updated.");
  };

  return <main className="app-shell">
    <header className="topbar"><a className="brand" href="#top" aria-label="ChapterLens home"><span className="brand-mark">C.</span><span>chapter<span className="brand-light">lens</span></span></a><span className="topbar-label">THE WRITER'S ANALYSIS STUDIO</span><span className="status-pill"><span className="status-dot" /> PRIVATE BY DESIGN</span></header>
    <section className="hero" id="top"><div className="eyebrow"><span className="eyebrow-line" /> YOUR WORDS, UNDER THE LENS</div><h1>Make every<br/><span className="hero-highlight">word work.</span></h1><p className="hero-description">Understand your chapter's readability, discover complex sentences, and make your writing easier to follow.</p><div className="hero-meta"><span>01 — ANALYZE</span><span>02 — DISCOVER</span><span>03 — REFINE</span></div></section>
    <section className="workspace" aria-labelledby="workspace-title"><div className="workspace-heading"><div><span className="section-index">01 / WORKSPACE</span><h2 id="workspace-title">Your chapter</h2></div><button className="text-button" onClick={() => update("")} disabled={!chapter}>Clear text ↗</button></div>
      <div className="editor-card"><div className="editor-toolbar"><div className="window-dots" aria-hidden="true"><span/><span/><span/></div><span>CHAPTER EDITOR</span><span className="editor-format">PLAIN TEXT</span></div><label className="sr-only" htmlFor="chapter-input">Paste or type your chapter</label><textarea id="chapter-input" className="chapter-input" placeholder="Paste your chapter here…\n\nYour next great edit begins with understanding your words." value={chapter} maxLength={MAX_INPUT_CHARACTERS + 1} onChange={(e) => update(e.target.value)} spellCheck="true" aria-describedby="editor-help"/><div className="editor-footer"><span id="editor-help" aria-live="polite">{wordCount.toLocaleString()} WORDS · {chapter.length.toLocaleString()} / {MAX_INPUT_CHARACTERS.toLocaleString()} CHARACTERS</span><button className="sample-button" onClick={() => update(SAMPLE)}>Try sample text ↗</button></div></div>
      <button className="analyze-button" onClick={analyze}><span>Analyze chapter</span><span className="analyze-arrow" aria-hidden="true">↗</span></button>
      {feedback && <p className="action-feedback" role="status" aria-live="polite">{feedback}</p>}
      {analysis && <section className="results" aria-live="polite" aria-labelledby="results-title">{!analysis.valid ? <div className="message-card" role="status"><span className="section-index">ANALYSIS NEEDS ATTENTION</span><p>{analysis.message}</p></div> : <>
        <div className="results-heading"><span className="section-index">02 / YOUR RESULTS</span><h2 id="results-title">Here's the story<br/>behind your story.</h2></div>
        {!analysis.reliable && <div className="message-card" role="note"><p>This sample is very short. Readability formulas are less reliable with fewer than 10 words or two sentences.</p></div>}
        <div className="metrics-grid"><article className="metric-card score-card"><span className="metric-label" title="Flesch Reading Ease: 206.835 − 1.015 × words per sentence − 84.6 × syllables per word">FLESCH READING EASE</span><div className="score-number">{analysis.score}<span>/100 · raw {analysis.rawScore}</span></div><div className="score-track" role="progressbar" aria-label="Displayed readability score" aria-valuemin="0" aria-valuemax="100" aria-valuenow={analysis.score}><div className="score-fill" style={{width:`${analysis.score}%`}}/></div><p className="metric-note">Higher scores suggest easier reading. {analysis.scoreWasClamped && 'The displayed score is clamped; raw value is shown above.'}</p></article>
          <Metric label="READING DIFFICULTY" value={analysis.difficulty} note="Flesch score band"/><Metric label="U.S. GRADE ESTIMATE" value={analysis.gradeLevel} note="Approximate FK grade level"/><Metric label="WORD COUNT" value={analysis.wordCount.toLocaleString()} note="Consistent word tokenizer"/><Metric label="SENTENCES" value={analysis.sentenceCount} note="Abbreviation-aware segmentation"/><Metric label="AVG. SENTENCE" value={analysis.averageWordsPerSentence} note="Words per sentence"/><Metric label="EST. SYLLABLES" value={analysis.syllableCount.toLocaleString()} note="English heuristic estimate"/><Metric label="COMPLEX SENTENCES" value={analysis.complexSentenceCount} note="Flagged by structural heuristics"/></div>
        <div className="hardest-section"><div className="hardest-heading"><div><span className="section-index">03 / EDITOR'S RADAR</span><h2>Sentences to revisit.</h2></div><span className="radar-count">{analysis.hardestSentences.length} FOUND</span></div><p className="metric-note">A deterministic heuristic highlights possible complexity; it does not assess meaning or prove a sentence is difficult.</p>{analysis.hardestSentences.length ? analysis.hardestSentences.map((item, i) => <SentenceSuggestion key={`${item.index}-${item.sentence}`} item={item} number={i + 1} chapter={chapter} onReplace={replaceSentence} />) : <p className="method-note">No sentences triggered the complexity indicators.</p>}</div>
        <p className="method-note">Flesch Reading Ease was designed for English. Scores may be unreliable for very short, non-English, or unusual text. Syllables and sentence complexity are estimated locally; use these results as editing guidance.</p>
      </>}</section>}
    </section><footer className="footer"><span>CHAPTERLENS © 2026</span><span>YOUR TEXT STAYS IN THIS BROWSER.</span></footer>
  </main>;
}
function SentenceSuggestion({ item, number, chapter, onReplace }) {
  const simplification = useMemo(() => simplifySentence(item.sentence, item.reasons), [item.sentence, item.reasons]);
  const [copyFeedback, setCopyFeedback] = useState("");
  const sourceIsCurrent = chapter.slice(item.start, item.end) === item.sentence;
  const withinInputLimit = chapter.length - item.sentence.length + (simplification.suggestion?.length ?? 0) <= MAX_INPUT_CHARACTERS;
  const reasons = item.reasons.length ? item.reasons : [];
  const tip = simplification.available ? simplification.guidance : editingTip(reasons);
  const handleCopy = async () => {
    const copied = await copySuggestion(simplification.suggestion);
    setCopyFeedback(copied ? "Copied" : "Unable to copy. Please select the text manually.");
  };

  return <article className="sentence-card suggestion-card">
    <span className="sentence-number">{String(number).padStart(2,"0")}</span>
    <div className="sentence-content">
      <p className="original-label">Original sentence</p>
      <p>{item.sentence}</p>
      <div className="sentence-tags">{reasons.map(reason => <span className="reason-tag" key={reason}>{reason}</span>)}</div>
      <section className="simplification-panel" aria-labelledby={`suggestion-title-${item.index}`}>
        <h3 id={`suggestion-title-${item.index}`}>Suggested Simpler Version</h3>
        {simplification.available ? <>
          <p className="suggested-text">{simplification.suggestion}</p>
          <p className="editing-guidance">{tip}</p>
          <p className="suggestion-disclaimer">Rule-based suggestion — review before using.</p>
          <div className="suggestion-actions">
            <button className="suggestion-button" onClick={handleCopy} aria-label={`Copy suggestion for sentence ${number}`}>Copy Suggestion</button>
            <button className="suggestion-button replace-button" onClick={() => onReplace(item, simplification.suggestion)} disabled={!sourceIsCurrent || !withinInputLimit} aria-label={`Replace original sentence ${number}`}>Replace Original</button>
          </div>
          {copyFeedback && <p className="copy-feedback" role="status" aria-live="polite">{copyFeedback}</p>}
          {!sourceIsCurrent && <p className="copy-feedback" role="status">Text changed; analyze again before replacing.</p>}
          {sourceIsCurrent && !withinInputLimit && <p className="copy-feedback" role="note">This replacement would exceed the character limit.</p>}
        </> : <>
          <p className="fallback-message">{simplification.reason}</p>
          <p className="editing-guidance">Editing tip: {tip}</p>
        </>}
      </section>
    </div>
    <span className="sentence-score" aria-label={`Complexity score ${item.score}`}>{item.score.toFixed(1)}</span>
  </article>;
}
function Metric({label,value,note}) { return <article className="metric-card"><span className="metric-label">{label}</span><div className="metric-value">{value}</div><p className="metric-note">{note}</p></article>; }
export default App;
