import { useState } from "react";
import {
  uploadDocument, getExamQuestions, askQuestion,
  getSummary, getVivaQuestion, evaluateVivaAnswer
} from "./api";

// ── Mode definitions ──────────────────────────────────
const MODES = [
  {
    id: "ask",
    icon: "💬",
    label: "Ask Question",
    color: "#3B82F6",
    placeholder: "e.g. Explain photosynthesis in simple terms",
    buttonText: "Get Answer",
  },
  {
    id: "exam",
    icon: "📝",
    label: "Exam Questions",
    color: "#8B5CF6",
    placeholder: "e.g. Data Structures  or  Recursion  or  Chapter 3",
    buttonText: "Generate Questions",
  },
  {
    id: "summary",
    icon: "📚",
    label: "Revision Summary",
    color: "#10B981",
    placeholder: "e.g. Operating Systems  or  Unit 2",
    buttonText: "Generate Summary",
  },
  {
    id: "viva",
    icon: "🎤",
    label: "Viva Mode",
    color: "#F59E0B",
    placeholder: "e.g. Networking  or  any topic you want to practice",
    buttonText: "Start Viva",
  },
];

export default function App() {
  // ── Upload state ──────────────────────────────────
  const [uploaded, setUploaded]   = useState(false);
  const [uploading, setUploading] = useState(false);
  const [docInfo, setDocInfo]     = useState(null);   // {filename, chunks_created, topics_found}

  // ── Query state ───────────────────────────────────
  const [mode, setMode]       = useState("ask");
  const [query, setQuery]     = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult]   = useState(null);   // the AI response to show
  const [error, setError]     = useState("");

  // ── Viva-specific state ───────────────────────────
  const [vivaTopic, setVivaTopic]                   = useState("");
  const [vivaQuestion, setVivaQuestion]             = useState("");
  const [vivaAnswer, setVivaAnswer]                 = useState("");
  const [vivaFeedback, setVivaFeedback]             = useState("");
  const [previousQuestions, setPreviousQuestions]   = useState([]);
  const [vivaPhase, setVivaPhase]                   = useState("idle"); // idle → question → feedback

  const currentMode = MODES.find((m) => m.id === mode);

  // ══════════════════════════════════════════════════
  //  HANDLERS
  // ══════════════════════════════════════════════════

  const handleUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setUploading(true);
    setError("");
    try {
      const data = await uploadDocument(file);
      setDocInfo(data);
      setUploaded(true);
    } catch (err) {
      setError(
        err.response?.data?.detail ||
        "Upload failed. Is the backend server running? (uvicorn main:app --reload)"
      );
    }
    setUploading(false);
  };

  const handleSubmit = async () => {
    if (!query.trim()) return;
    setLoading(true);
    setResult(null);
    setError("");

    try {
      if (mode === "ask") {
        const data = await askQuestion(query);
        setResult({ type: "answer", ...data });

      } else if (mode === "exam") {
        const data = await getExamQuestions(query);
        setResult({ type: "exam", ...data });

      } else if (mode === "summary") {
        const data = await getSummary(query);
        setResult({ type: "summary", ...data });

      } else if (mode === "viva") {
        // First call: get a viva question
        setVivaTopic(query);
        const data = await getVivaQuestion(query, previousQuestions);
        setVivaQuestion(data.question);
        setVivaPhase("question");
        setResult(null);
      }
    } catch (err) {
      setError(err.response?.data?.detail || "Something went wrong. Check your terminal for errors.");
    }
    setLoading(false);
  };

  const handleVivaSubmit = async () => {
    if (!vivaAnswer.trim()) return;
    setLoading(true);
    setError("");

    try {
      const data = await evaluateVivaAnswer(vivaQuestion, vivaAnswer);
      setVivaFeedback(data.feedback);
      setPreviousQuestions((prev) => [...prev, vivaQuestion]);
      setVivaPhase("feedback");
    } catch (err) {
      setError("Evaluation failed. Check your terminal.");
    }
    setLoading(false);
  };

  const handleNextVivaQuestion = async () => {
    setLoading(true);
    setVivaAnswer("");
    setVivaFeedback("");
    setVivaPhase("question");

    try {
      const data = await getVivaQuestion(vivaTopic, previousQuestions);
      setVivaQuestion(data.question);
    } catch (err) {
      setError("Couldn't get next question.");
    }
    setLoading(false);
  };

  const handleModeChange = (newMode) => {
    setMode(newMode);
    setResult(null);
    setError("");
    setQuery("");
    setVivaPhase("idle");
    setVivaQuestion("");
    setVivaAnswer("");
    setVivaFeedback("");
  };

  // ══════════════════════════════════════════════════
  //  RENDER
  // ══════════════════════════════════════════════════
  return (
    <div style={styles.page}>
      <div style={styles.container}>

        {/* ── Header ─────────────────────────────── */}
        <div style={styles.header}>
          <div style={styles.headerBadge}>AI ACADEMIC ASSISTANT</div>
          <h1 style={styles.headerTitle}>Your Personal Exam AI</h1>
          <p style={styles.headerSub}>
            Upload your notes → AI explains topics, generates questions, and runs viva practice
          </p>
        </div>

        {/* ── Upload Section ──────────────────────── */}
        <div style={styles.card}>
          <div style={styles.cardTitle}>
            <span>📄</span> Step 1 — Upload Your Study Material
          </div>

          {!uploaded ? (
            <div>
              <label style={styles.uploadLabel}>
                <input
                  type="file"
                  accept=".pdf"
                  onChange={handleUpload}
                  disabled={uploading}
                  style={{ display: "none" }}
                />
                <div style={styles.uploadBox}>
                  {uploading ? (
                    <div>
                      <div style={styles.spinner} />
                      <div style={{ color: "#94A3B8", marginTop: 12 }}>
                        Processing PDF... extracting text, chunking, building vector index
                      </div>
                    </div>
                  ) : (
                    <div>
                      <div style={{ fontSize: 40, marginBottom: 8 }}>📂</div>
                      <div style={{ color: "#E2E8F0", fontWeight: 600 }}>
                        Click to upload PDF
                      </div>
                      <div style={{ color: "#64748B", fontSize: 13, marginTop: 4 }}>
                        Your notes, syllabus, textbook chapters, or PYQs
                      </div>
                    </div>
                  )}
                </div>
              </label>
            </div>
          ) : (
            <div style={styles.uploadSuccess}>
              <div style={{ fontSize: 28 }}>✅</div>
              <div>
                <div style={{ fontWeight: 600, color: "#10B981" }}>
                  {docInfo?.filename} — Ready!
                </div>
                <div style={{ color: "#64748B", fontSize: 13, marginTop: 2 }}>
                  {docInfo?.chunks_created} chunks indexed •{" "}
                  {docInfo?.topics_found?.length} topics detected
                </div>
                {docInfo?.topics_found?.length > 0 && (
                  <div style={{ marginTop: 8, display: "flex", gap: 6, flexWrap: "wrap" }}>
                    {docInfo.topics_found.map((t) => (
                      <span key={t} style={styles.topicTag}>{t}</span>
                    ))}
                  </div>
                )}
              </div>
              <label style={styles.reuploadBtn}>
                <input
                  type="file"
                  accept=".pdf"
                  onChange={handleUpload}
                  style={{ display: "none" }}
                />
                Change File
              </label>
            </div>
          )}

          {error && <div style={styles.errorBox}>⚠️ {error}</div>}
        </div>

        {/* ── Mode + Query Section ────────────────── */}
        {uploaded && (
          <div style={styles.card}>
            <div style={styles.cardTitle}>
              <span>🎯</span> Step 2 — Choose What You Need
            </div>

            {/* Mode Tabs */}
            <div style={styles.modeTabs}>
              {MODES.map((m) => (
                <button
                  key={m.id}
                  onClick={() => handleModeChange(m.id)}
                  style={{
                    ...styles.modeTab,
                    background: mode === m.id ? m.color : "transparent",
                    border: `1.5px solid ${mode === m.id ? m.color : "#334155"}`,
                    color: mode === m.id ? "white" : "#94A3B8",
                  }}
                >
                  {m.icon} {m.label}
                </button>
              ))}
            </div>

            {/* Normal modes: Ask / Exam / Summary */}
            {mode !== "viva" && vivaPhase === "idle" && (
              <div>
                <input
                  style={styles.input}
                  placeholder={currentMode.placeholder}
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
                />
                <button
                  style={{ ...styles.btn, background: currentMode.color }}
                  onClick={handleSubmit}
                  disabled={loading || !query.trim()}
                >
                  {loading ? "Thinking..." : currentMode.buttonText + " →"}
                </button>
              </div>
            )}

            {/* Viva mode: enter topic */}
            {mode === "viva" && vivaPhase === "idle" && (
              <div>
                <input
                  style={styles.input}
                  placeholder={currentMode.placeholder}
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
                />
                <button
                  style={{ ...styles.btn, background: currentMode.color }}
                  onClick={handleSubmit}
                  disabled={loading || !query.trim()}
                >
                  {loading ? "Loading question..." : "Start Viva →"}
                </button>
              </div>
            )}

            {/* Viva phase: professor asks question */}
            {mode === "viva" && vivaPhase === "question" && (
              <div>
                <div style={styles.vivaQuestionBox}>
                  <div style={{ color: "#F59E0B", fontSize: 12, marginBottom: 6, letterSpacing: 1 }}>
                    🎓 PROFESSOR ASKS:
                  </div>
                  <div style={{ fontSize: 16, fontWeight: 600, lineHeight: 1.6 }}>
                    {vivaQuestion}
                  </div>
                </div>
                <textarea
                  style={styles.textarea}
                  placeholder="Type your answer here... (don't worry, you're learning!)"
                  value={vivaAnswer}
                  onChange={(e) => setVivaAnswer(e.target.value)}
                  rows={4}
                />
                <button
                  style={{ ...styles.btn, background: "#F59E0B" }}
                  onClick={handleVivaSubmit}
                  disabled={loading || !vivaAnswer.trim()}
                >
                  {loading ? "Evaluating..." : "Submit Answer →"}
                </button>
              </div>
            )}

            {/* Viva phase: show feedback */}
            {mode === "viva" && vivaPhase === "feedback" && (
              <div>
                <div style={styles.vivaFeedbackBox}>
                  <div style={{ color: "#10B981", fontSize: 12, marginBottom: 8, letterSpacing: 1 }}>
                    📊 PROFESSOR'S FEEDBACK:
                  </div>
                  <pre style={styles.preText}>{vivaFeedback}</pre>
                </div>
                <button
                  style={{ ...styles.btn, background: "#F59E0B" }}
                  onClick={handleNextVivaQuestion}
                  disabled={loading}
                >
                  {loading ? "Loading..." : "Next Question →"}
                </button>
                <button
                  style={{ ...styles.btnOutline, marginLeft: 10 }}
                  onClick={() => {
                    setVivaPhase("idle");
                    setQuery("");
                    setPreviousQuestions([]);
                  }}
                >
                  End Viva
                </button>
              </div>
            )}
          </div>
        )}

        {/* ── Results Section ─────────────────────── */}
        {result && (
          <div style={styles.card}>

            {/* Answer result */}
            {result.type === "answer" && (
              <div>
                <div style={{ ...styles.resultTag, background: "#3B82F620", color: "#3B82F6" }}>
                  💬 ANSWER
                </div>
                <div style={styles.resultText}>{result.answer}</div>
                {result.sources?.length > 0 && (
                  <div style={styles.sourcesRow}>
                    <span style={{ color: "#64748B", fontSize: 12 }}>Sources: </span>
                    {result.sources.map((s) => (
                      <span key={s.source_number} style={styles.sourceTag}>
                        📌 {s.topic}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Exam questions result */}
            {result.type === "exam" && (
              <div>
                <div style={{ ...styles.resultTag, background: "#8B5CF620", color: "#8B5CF6" }}>
                  📝 EXAM QUESTIONS
                </div>
                <pre style={styles.preText}>{result.questions}</pre>
              </div>
            )}

            {/* Summary result */}
            {result.type === "summary" && (
              <div>
                <div style={{ ...styles.resultTag, background: "#10B98120", color: "#10B981" }}>
                  📚 REVISION SUMMARY
                </div>
                <pre style={styles.preText}>{result.summary}</pre>
              </div>
            )}
          </div>
        )}

      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════
//  STYLES
// ══════════════════════════════════════════════════════
const styles = {
  page: {
    fontFamily: "system-ui, -apple-system, sans-serif",
    background: "#0F172A",
    minHeight: "100vh",
    padding: "32px 16px",
    color: "#E2E8F0",
  },
  container: {
    maxWidth: 760,
    margin: "0 auto",
    display: "flex",
    flexDirection: "column",
    gap: 20,
  },
  header: {
    textAlign: "center",
    marginBottom: 8,
  },
  headerBadge: {
    display: "inline-block",
    background: "#1E293B",
    border: "1px solid #334155",
    color: "#64748B",
    fontSize: 11,
    letterSpacing: 2,
    padding: "4px 14px",
    borderRadius: 20,
    marginBottom: 12,
  },
  headerTitle: {
    fontSize: 32,
    fontWeight: 700,
    margin: "0 0 8px 0",
    background: "linear-gradient(135deg, #3B82F6, #8B5CF6)",
    WebkitBackgroundClip: "text",
    WebkitTextFillColor: "transparent",
  },
  headerSub: {
    color: "#64748B",
    fontSize: 14,
    margin: 0,
  },
  card: {
    background: "#1E293B",
    border: "1px solid #334155",
    borderRadius: 14,
    padding: 24,
  },
  cardTitle: {
    fontWeight: 600,
    fontSize: 15,
    marginBottom: 18,
    display: "flex",
    gap: 8,
    alignItems: "center",
  },
  uploadLabel: { cursor: "pointer", display: "block" },
  uploadBox: {
    border: "2px dashed #334155",
    borderRadius: 12,
    padding: "40px 20px",
    textAlign: "center",
    cursor: "pointer",
    transition: "border-color 0.2s",
  },
  uploadSuccess: {
    display: "flex",
    alignItems: "flex-start",
    gap: 14,
    background: "#0F2918",
    border: "1px solid #166534",
    borderRadius: 10,
    padding: 16,
  },
  reuploadBtn: {
    marginLeft: "auto",
    cursor: "pointer",
    background: "transparent",
    border: "1px solid #334155",
    color: "#94A3B8",
    padding: "6px 12px",
    borderRadius: 6,
    fontSize: 12,
    whiteSpace: "nowrap",
  },
  topicTag: {
    background: "#0F172A",
    border: "1px solid #334155",
    color: "#94A3B8",
    fontSize: 11,
    padding: "2px 8px",
    borderRadius: 4,
  },
  modeTabs: {
    display: "flex",
    gap: 8,
    flexWrap: "wrap",
    marginBottom: 18,
  },
  modeTab: {
    padding: "8px 16px",
    borderRadius: 8,
    cursor: "pointer",
    fontSize: 13,
    fontWeight: 500,
    transition: "all 0.15s",
  },
  input: {
    width: "100%",
    background: "#0F172A",
    border: "1.5px solid #334155",
    color: "#E2E8F0",
    borderRadius: 8,
    padding: "12px 14px",
    fontSize: 14,
    boxSizing: "border-box",
    outline: "none",
    marginBottom: 10,
  },
  textarea: {
    width: "100%",
    background: "#0F172A",
    border: "1.5px solid #334155",
    color: "#E2E8F0",
    borderRadius: 8,
    padding: "12px 14px",
    fontSize: 14,
    boxSizing: "border-box",
    outline: "none",
    resize: "vertical",
    fontFamily: "inherit",
    marginBottom: 10,
  },
  btn: {
    color: "white",
    border: "none",
    padding: "11px 24px",
    borderRadius: 8,
    cursor: "pointer",
    fontSize: 14,
    fontWeight: 600,
    opacity: 1,
    transition: "opacity 0.15s",
  },
  btnOutline: {
    background: "transparent",
    border: "1px solid #334155",
    color: "#94A3B8",
    padding: "11px 20px",
    borderRadius: 8,
    cursor: "pointer",
    fontSize: 14,
  },
  errorBox: {
    background: "#2D1515",
    border: "1px solid #7F1D1D",
    color: "#FCA5A5",
    borderRadius: 8,
    padding: "12px 16px",
    fontSize: 13,
    marginTop: 12,
  },
  spinner: {
    width: 32,
    height: 32,
    border: "3px solid #334155",
    borderTop: "3px solid #3B82F6",
    borderRadius: "50%",
    animation: "spin 0.8s linear infinite",
    margin: "0 auto",
  },
  vivaQuestionBox: {
    background: "#1C1507",
    border: "1.5px solid #92400E",
    borderRadius: 10,
    padding: 18,
    marginBottom: 14,
  },
  vivaFeedbackBox: {
    background: "#0A1F14",
    border: "1.5px solid #166534",
    borderRadius: 10,
    padding: 18,
    marginBottom: 14,
  },
  resultTag: {
    display: "inline-block",
    padding: "4px 12px",
    borderRadius: 6,
    fontSize: 11,
    fontWeight: 700,
    letterSpacing: 1,
    marginBottom: 14,
  },
  resultText: {
    fontSize: 14,
    lineHeight: 1.8,
    color: "#CBD5E1",
  },
  preText: {
    fontSize: 13,
    lineHeight: 1.8,
    color: "#CBD5E1",
    whiteSpace: "pre-wrap",
    fontFamily: "inherit",
    margin: 0,
  },
  sourcesRow: {
    marginTop: 14,
    display: "flex",
    gap: 6,
    flexWrap: "wrap",
    alignItems: "center",
  },
  sourceTag: {
    background: "#1E3A5F",
    color: "#60A5FA",
    fontSize: 11,
    padding: "3px 10px",
    borderRadius: 4,
  },
};